import "server-only";

import { isAddress } from "viem";

type JsonRecord = Record<string, unknown>;

export type FigmentDepositPreview = {
  depositContractAddress?: string;
  calldata?: string;
  valueEth: "32";
  validatorPubkey?: string;
  withdrawalCredentials?: string;
  depositDataRoot?: string;
};

export type FigmentRequestResult = {
  network: string;
  validatorIdentifier?: string;
  depositData?: unknown;
  unsignedTransaction?: unknown;
  depositPreview: FigmentDepositPreview;
  raw: unknown;
};

export class FigmentConfigError extends Error {
  status = 500;
}

export class FigmentValidationError extends Error {
  status = 400;
}

export class FigmentUpstreamError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function figmentNetwork() {
  return (process.env.FIGMENT_ETH_NETWORK || "hoodi").toLowerCase();
}

export function assertSupportedFigmentNetwork(network = figmentNetwork()) {
  if (network === "mainnet") {
    throw new FigmentValidationError("Mainnet Figment validator requests are disabled in Phase B1.");
  }
  if (network !== "hoodi") {
    throw new FigmentValidationError("Only the Hoodi network is supported in Phase B1.");
  }
  return network;
}

export function getFigmentConfig() {
  const baseUrl = process.env.FIGMENT_API_BASE_URL?.trim();
  const apiKey = process.env.FIGMENT_API_KEY?.trim();
  const network = assertSupportedFigmentNetwork();

  if (!baseUrl) throw new FigmentConfigError("FIGMENT_API_BASE_URL is missing.");
  if (!apiKey) throw new FigmentConfigError("FIGMENT_API_KEY is missing.");

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    network
  };
}

export function validateValidatorRequest(input: unknown) {
  const body = asRecord(input);
  const withdrawalAddress = stringValue(body.withdrawalAddress || body.withdrawal_address);
  const numberOfValidators = Number(body.numberOfValidators || body.number_of_validators || 1);
  const fundingAddress = stringValue(body.fundingAddress || body.funding_address);

  if (!withdrawalAddress || !isAddress(withdrawalAddress)) {
    throw new FigmentValidationError("Enter a valid withdrawal address.");
  }
  if (!Number.isInteger(numberOfValidators) || numberOfValidators <= 0) {
    throw new FigmentValidationError("numberOfValidators must be greater than 0.");
  }
  if (fundingAddress && !isAddress(fundingAddress)) {
    throw new FigmentValidationError("Enter a valid funding address.");
  }

  return { withdrawalAddress, numberOfValidators, fundingAddress };
}

export async function figmentHealth() {
  const config = getFigmentConfig();
  const url = figmentUrl(config.baseUrl, "/ethereum/validators", {
    network: config.network,
    "page[size]": "1"
  });

  const response = await fetch(url, {
    method: "GET",
    headers: figmentHeaders(config.apiKey),
    cache: "no-store"
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new FigmentUpstreamError("Figment health check failed.", response.status, body);
  }

  return {
    ok: true,
    mode: process.env.FIGMENT_MODE || "live",
    network: config.network,
    baseUrl: config.baseUrl
  };
}

export async function requestFigmentValidators(input: unknown): Promise<FigmentRequestResult> {
  const config = getFigmentConfig();
  const request = validateValidatorRequest(input);

  const response = await fetch(figmentUrl(config.baseUrl, "/ethereum/validators"), {
    method: "POST",
    headers: figmentHeaders(config.apiKey),
    cache: "no-store",
    body: JSON.stringify({
      network: config.network,
      withdrawal_address: request.withdrawalAddress,
      number_of_validators: request.numberOfValidators,
      validators_count: request.numberOfValidators,
      funding_address: request.fundingAddress || undefined
    })
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new FigmentUpstreamError("Figment validator request failed.", response.status, body);
  }

  return normalizeFigmentRequestResult(body, config.network);
}

export async function getFigmentValidatorStatus(query: {
  validatorIdentifier?: string;
  withdrawalAddress?: string;
}) {
  const config = getFigmentConfig();
  const validatorIdentifier = query.validatorIdentifier?.trim();
  const withdrawalAddress = query.withdrawalAddress?.trim();

  let url: URL;
  if (validatorIdentifier) {
    url = figmentUrl(config.baseUrl, `/ethereum/validators/${encodeURIComponent(validatorIdentifier)}`, {
      network: config.network
    });
  } else {
    if (!withdrawalAddress || !isAddress(withdrawalAddress)) {
      throw new FigmentValidationError("Provide a validator identifier or valid withdrawal address.");
    }
    url = figmentUrl(config.baseUrl, "/ethereum/validators", {
      network: config.network,
      withdrawal_address: withdrawalAddress
    });
  }

  const response = await fetch(url, {
    method: "GET",
    headers: figmentHeaders(config.apiKey),
    cache: "no-store"
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new FigmentUpstreamError("Figment validator status lookup failed.", response.status, body);
  }

  return { ok: true, network: config.network, status: body };
}

export function figmentErrorResponse(error: unknown) {
  const status =
    error instanceof FigmentConfigError ||
    error instanceof FigmentValidationError ||
    error instanceof FigmentUpstreamError
      ? error.status
      : 500;
  const message = error instanceof Error ? error.message : "Unexpected Figment error.";
  const details = error instanceof FigmentUpstreamError ? error.details : undefined;

  return Response.json({ ok: false, error: message, details }, { status });
}

function figmentHeaders(apiKey: string) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: apiKey,
    "X-Api-Key": apiKey
  };
}

function figmentUrl(baseUrl: string, path: string, query?: Record<string, string>) {
  const url = new URL(path, `${baseUrl}/`);
  Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function normalizeFigmentRequestResult(raw: unknown, network: string): FigmentRequestResult {
  const primary = primaryPayload(raw);
  const depositData = findFirst(primary, ["deposit_data", "depositData", "deposit"]);
  const unsignedTransaction = findFirst(primary, [
    "unsigned_transaction",
    "unsignedTransaction",
    "staking_transaction",
    "stakingTransaction",
    "transaction"
  ]);
  const validatorIdentifier = stringValue(
    findFirst(primary, ["id", "validator_id", "validatorIdentifier", "pubkey", "validator_pubkey"])
  );

  return {
    network,
    validatorIdentifier,
    depositData,
    unsignedTransaction,
    depositPreview: buildDepositPreview(primary, depositData, unsignedTransaction),
    raw
  };
}

function buildDepositPreview(primary: unknown, depositData: unknown, unsignedTransaction: unknown): FigmentDepositPreview {
  const deposit = asRecord(depositData);
  const unsigned = asRecord(unsignedTransaction);
  const source = asRecord(primary);

  return {
    depositContractAddress:
      stringValue(findFirst(unsigned, ["to", "deposit_contract_address", "depositContractAddress"])) ||
      process.env.NEXT_PUBLIC_ETH_DEPOSIT_CONTRACT_ADDRESS ||
      undefined,
    calldata: stringValue(findFirst(unsigned, ["data", "calldata", "contract_call_data", "contractCallData"])),
    valueEth: "32",
    validatorPubkey: stringValue(
      findFirst(deposit, ["pubkey", "validator_pubkey", "validatorPubkey"]) ||
        findFirst(source, ["pubkey", "validator_pubkey", "validatorPubkey"])
    ),
    withdrawalCredentials: stringValue(
      findFirst(deposit, ["withdrawal_credentials", "withdrawalCredentials"]) ||
        findFirst(source, ["withdrawal_credentials", "withdrawalCredentials"])
    ),
    depositDataRoot: stringValue(
      findFirst(deposit, ["deposit_data_root", "depositDataRoot"]) ||
        findFirst(source, ["deposit_data_root", "depositDataRoot"])
    )
  };
}

function primaryPayload(raw: unknown): unknown {
  const record = asRecord(raw);
  const data = record.data;
  if (Array.isArray(data)) return data[0] || record;
  if (data && typeof data === "object") return data;
  return record;
}

function findFirst(input: unknown, keys: string[]): unknown {
  const record = asRecord(input);
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }

  for (const value of Object.values(record)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const nested = findFirst(value, keys);
    if (nested !== undefined && nested !== null) return nested;
  }

  return undefined;
}

function asRecord(input: unknown): JsonRecord {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as JsonRecord) : {};
}

function stringValue(input: unknown) {
  return typeof input === "string" && input.trim() ? input.trim() : undefined;
}
