import type { Address, Hash } from "viem";

export type StakingProviderType = "mock" | "kiln" | "figment";
export type StakingNetwork = "hoodi" | "holesky" | "local";

export type MockValidatorStatus =
  | "draft"
  | "pending_deposit"
  | "deposit_submitted"
  | "activation_pending"
  | "active"
  | "exit_requested"
  | "exiting"
  | "withdrawable"
  | "withdrawn"
  | "slashed";

export type ProviderInfo = {
  id: StakingProviderType;
  name: string;
  enabled: boolean;
  realProvider: boolean;
  description: string;
};

export type MockUnsignedTx = {
  kind: "mock_deposit" | "mock_exit";
  to: Address;
  from: Address;
  valueEth: string;
  data: Hash;
  chainHint: StakingNetwork;
  disclaimer: string;
};

export type MockValidatorRecord = {
  id: string;
  provider: "mock";
  network: StakingNetwork;
  walletAddress: Address;
  withdrawalAddress: Address;
  amountEth: string;
  status: MockValidatorStatus;
  mockValidatorPubkey: string;
  publicKey: string;
  stakeRequestId: string;
  depositTxHash?: Hash;
  exitTxHash?: Hash;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  exitedAt?: string;
  withdrawnAt?: string;
  slashedAt?: string;
  slashReason?: string;
  demoOnly: true;
};

export type CreateStakeInput = {
  walletAddress: string;
  amountEth: string;
  withdrawalAddress: string;
  network: string;
};

export type CreateStakeResult = {
  stakeRequestId: string;
  validatorId: string;
  provider: "mock";
  network: StakingNetwork;
  status: MockValidatorStatus;
  mockUnsignedTx: MockUnsignedTx;
  validator: MockValidatorRecord;
};

export interface StakingProvider {
  createStakeRequest(input: CreateStakeInput): Promise<CreateStakeResult>;
  getValidatorStatus(validatorId: string): Promise<MockValidatorRecord>;
  requestExit(validatorId: string): Promise<{ validator: MockValidatorRecord; mockExitTx: MockUnsignedTx }>;
  getProviderInfo(): ProviderInfo;
}

export const mockLifecycle: MockValidatorStatus[] = [
  "draft",
  "pending_deposit",
  "deposit_submitted",
  "activation_pending",
  "active",
  "exit_requested",
  "exiting",
  "withdrawable",
  "withdrawn"
];

export const mockStatusLabels: Record<MockValidatorStatus, string> = {
  draft: "Draft",
  pending_deposit: "Pending Deposit",
  deposit_submitted: "Deposit Submitted",
  activation_pending: "Activation Pending",
  active: "Active",
  exit_requested: "Exit Requested",
  exiting: "Exiting",
  withdrawable: "Withdrawable",
  withdrawn: "Withdrawn",
  slashed: "Slashed"
};

export function nextMockLifecycleStatus(status: MockValidatorStatus) {
  if (status === "slashed" || status === "withdrawn") return undefined;
  const currentIndex = mockLifecycle.indexOf(status);
  if (currentIndex < 0 || currentIndex >= mockLifecycle.length - 1) return undefined;
  return mockLifecycle[currentIndex + 1];
}

export function canRequestMockExit(status: MockValidatorStatus) {
  return status === "active";
}

export function canSlashMockValidator(status: MockValidatorStatus) {
  return status !== "withdrawn";
}

export function canMarkMockWithdrawn(status: MockValidatorStatus) {
  return status === "withdrawable";
}

export function getAvailableStakingProviders(): ProviderInfo[] {
  const mockEnabled = (process.env.MOCK_STAKING_ENABLED || "true").toLowerCase() !== "false";

  return [
    {
      id: "mock",
      name: "Mock Provider",
      enabled: mockEnabled,
      realProvider: false,
      description: "Demo-only provider that simulates validator lifecycle data locally."
    },
    {
      id: "figment",
      name: "Figment",
      enabled: false,
      realProvider: true,
      description: "Coming soon. Placeholder for a future real provider integration."
    },
    {
      id: "kiln",
      name: "Kiln",
      enabled: false,
      realProvider: true,
      description: "Coming soon. Placeholder for a future real provider integration."
    }
  ];
}

export class ProviderNotImplementedError extends Error {
  status = 501;
}

export class PlaceholderProvider implements StakingProvider {
  constructor(private readonly providerId: "kiln" | "figment") {}

  async createStakeRequest(): Promise<CreateStakeResult> {
    throw new ProviderNotImplementedError(`${this.providerId} provider is not implemented yet.`);
  }

  async getValidatorStatus(): Promise<MockValidatorRecord> {
    throw new ProviderNotImplementedError(`${this.providerId} provider is not implemented yet.`);
  }

  async requestExit(): Promise<{ validator: MockValidatorRecord; mockExitTx: MockUnsignedTx }> {
    throw new ProviderNotImplementedError(`${this.providerId} provider is not implemented yet.`);
  }

  getProviderInfo() {
    const info = getAvailableStakingProviders().find((provider) => provider.id === this.providerId);
    if (!info) throw new ProviderNotImplementedError(`${this.providerId} provider is not implemented yet.`);
    return info;
  }
}
