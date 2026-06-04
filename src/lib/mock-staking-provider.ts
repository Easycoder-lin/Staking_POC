import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isAddress, keccak256, toBytes, type Address, type Hash } from "viem";
import {
  getAvailableStakingProviders,
  nextMockLifecycleStatus,
  type CreateStakeInput,
  type CreateStakeResult,
  type MockUnsignedTx,
  type MockValidatorRecord,
  type MockValidatorStatus,
  type StakingNetwork,
  type StakingProvider
} from "@/lib/staking-provider";

type Store = {
  validators: Record<string, MockValidatorRecord>;
};

export class MockProviderError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

export class MockStakingProvider implements StakingProvider {
  async createStakeRequest(input: CreateStakeInput): Promise<CreateStakeResult> {
    assertMockEnabled();
    const walletAddress = normalizedAddress(input.walletAddress, "walletAddress");
    const withdrawalAddress = normalizedAddress(input.withdrawalAddress, "withdrawalAddress");
    const network = normalizedNetwork(input.network);
    const amountEth = normalizedAmount(input.amountEth);
    const now = new Date().toISOString();
    const stakeRequestId = `mock-stake-${randomId()}`;
    const validatorId = `mock-val-${randomId()}`;
    const mockValidatorPubkey = `0x${keccak256(toBytes(`${validatorId}:${walletAddress}:${now}`)).slice(2)}${keccak256(
      toBytes(`${stakeRequestId}:${withdrawalAddress}`)
    ).slice(2, 34)}`;

    const validator: MockValidatorRecord = {
      id: validatorId,
      provider: "mock",
      network,
      walletAddress,
      withdrawalAddress,
      amountEth,
      status: "pending_deposit",
      mockValidatorPubkey,
      publicKey: mockValidatorPubkey,
      stakeRequestId,
      createdAt: now,
      updatedAt: now,
      demoOnly: true
    };

    await saveValidator(validator);

    return {
      stakeRequestId,
      validatorId,
      provider: "mock",
      network,
      status: validator.status,
      mockUnsignedTx: buildMockTx("mock_deposit", validator, walletAddress),
      validator
    };
  }

  async getValidatorStatus(validatorId: string) {
    return getValidator(validatorId);
  }

  async requestExit(validatorId: string) {
    const validator = await getValidator(validatorId);
    if (validator.status !== "active") {
      throw new MockProviderError("Validator must be active before exit can be requested.", 409);
    }

    const updated = stamp({
      ...validator,
      status: "exit_requested",
      exitTxHash: mockHash(`exit:${validator.id}:${Date.now()}`),
      exitedAt: new Date().toISOString()
    });
    await saveValidator(updated);

    return {
      validator: updated,
      mockExitTx: buildMockTx("mock_exit", updated, updated.walletAddress)
    };
  }

  getProviderInfo() {
    const info = getAvailableStakingProviders().find((provider) => provider.id === "mock");
    if (!info) throw new MockProviderError("Mock provider is not configured.", 500);
    return info;
  }
}

export async function confirmMockStake(validatorId: string) {
  const validator = await getValidator(validatorId);
  if (validator.status !== "pending_deposit") {
    throw new MockProviderError("Only pending deposit validators can be confirmed.", 409);
  }
  const updated = stamp({
    ...validator,
    status: "deposit_submitted",
    depositTxHash: mockHash(`deposit:${validator.id}:${Date.now()}`)
  });
  await saveValidator(updated);
  return updated;
}

export async function advanceMockValidator(validatorId: string) {
  const validator = await getValidator(validatorId);
  const nextStatus = nextMockLifecycleStatus(validator.status);
  if (!nextStatus) {
    throw new MockProviderError(`No next lifecycle state exists for ${validator.status}.`, 409);
  }

  const updated = withTimestampForStatus(stamp({ ...validator, status: nextStatus }), nextStatus);
  await saveValidator(updated);
  return updated;
}

export async function slashMockValidator(validatorId: string, slashReason = "Demo double signing risk") {
  const validator = await getValidator(validatorId);
  if (validator.status === "withdrawn") {
    throw new MockProviderError("Withdrawn validators cannot be slashed.", 409);
  }
  const now = new Date().toISOString();
  const updated = stamp({
    ...validator,
    status: "slashed",
    slashReason: slashReason.trim() || "Demo slashing simulation",
    slashedAt: now
  });
  await saveValidator(updated);
  return updated;
}

export async function markMockWithdrawn(validatorId: string) {
  const validator = await getValidator(validatorId);
  if (validator.status !== "withdrawable") {
    throw new MockProviderError("Validator must be withdrawable before it can be marked withdrawn.", 409);
  }
  const updated = withTimestampForStatus(stamp({ ...validator, status: "withdrawn" }), "withdrawn");
  await saveValidator(updated);
  return updated;
}

export function mockProviderErrorResponse(error: unknown) {
  const status = error instanceof MockProviderError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Unexpected mock staking provider error.";
  return Response.json({ ok: false, error: message }, { status });
}

async function getValidator(validatorId: string) {
  const store = await readStore();
  const validator = store.validators[validatorId];
  if (!validator) throw new MockProviderError("Validator not found.", 404);
  return validator;
}

async function saveValidator(validator: MockValidatorRecord) {
  const store = await readStore();
  store.validators[validator.id] = validator;
  await writeStore(store);
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(storePath(), "utf8");
    return JSON.parse(raw) as Store;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { validators: {} };
    }
    throw error;
  }
}

async function writeStore(store: Store) {
  await mkdir(path.dirname(storePath()), { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2), "utf8");
}

function storePath() {
  return process.env.MOCK_STAKING_STORE_PATH || path.join(process.cwd(), ".mock-staking", "validators.json");
}

function assertMockEnabled() {
  if ((process.env.MOCK_STAKING_ENABLED || "true").toLowerCase() === "false") {
    throw new MockProviderError("Mock staking provider is disabled.", 403);
  }
}

function normalizedAddress(value: string, field: string) {
  if (!value || !isAddress(value)) throw new MockProviderError(`Enter a valid ${field}.`);
  return value as Address;
}

function normalizedNetwork(value: string): StakingNetwork {
  const normalized = (value || process.env.DEFAULT_STAKING_NETWORK || "hoodi").toLowerCase();
  if (normalized === "hoodi" || normalized === "holesky" || normalized === "local") return normalized;
  throw new MockProviderError("network must be hoodi, holesky, or local.");
}

function normalizedAmount(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new MockProviderError("amountEth must be greater than 0.");
  return amount.toString();
}

function buildMockTx(kind: MockUnsignedTx["kind"], validator: MockValidatorRecord, from: Address): MockUnsignedTx {
  return {
    kind,
    from,
    to: "0x00000000219ab540356cBB839Cbe05303d7705Fa",
    valueEth: kind === "mock_deposit" ? validator.amountEth : "0",
    data: mockHash(`${kind}:${validator.id}:${validator.updatedAt}`),
    chainHint: validator.network,
    disclaimer: "Demo/test data only. This mock transaction does not create or exit a real Ethereum validator."
  };
}

function withTimestampForStatus(validator: MockValidatorRecord, status: MockValidatorStatus) {
  const now = new Date().toISOString();
  if (status === "active") return { ...validator, activatedAt: validator.activatedAt || now };
  if (status === "exiting") return { ...validator, exitedAt: validator.exitedAt || now };
  if (status === "withdrawn") return { ...validator, withdrawnAt: validator.withdrawnAt || now };
  return validator;
}

function stamp(validator: MockValidatorRecord) {
  return { ...validator, updatedAt: new Date().toISOString() };
}

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
}

function mockHash(seed: string) {
  return keccak256(toBytes(seed)) as Hash;
}
