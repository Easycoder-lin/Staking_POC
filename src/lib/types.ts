import type { Address, Hash } from "viem";

export enum ValidatorStatus {
  None = 0,
  PendingActivation = 1,
  Active = 2,
  Exiting = 3,
  Slashed = 4,
  Withdrawable = 5,
  Withdrawn = 6
}

export enum SlashReason {
  None = 0,
  DoubleProposal = 1,
  DoubleVote = 2,
  SurroundVote = 3
}

export type Validator = {
  owner: Address;
  withdrawalAddress: Address;
  balance: bigint;
  activationEpoch: bigint;
  exitEpoch: bigint;
  withdrawableEpoch: bigint;
  slashed: boolean;
  status: ValidatorStatus;
  slashReason: SlashReason;
};

export type TimelineItem = {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  hash?: Hash;
};
