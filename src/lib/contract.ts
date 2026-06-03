import type { Address } from "viem";
import { formatEther, parseEther } from "viem";
import { SlashReason, ValidatorStatus, type Validator } from "@/lib/types";

export const MOCK_STAKING_ADDRESS = (
  process.env.NEXT_PUBLIC_MOCK_STAKING_ADDRESS ??
  "0x0000000000000000000000000000000000000000"
) as Address;

export const MOCK_STAKING_ABI = [
  {
    type: "function",
    name: "stake",
    stateMutability: "payable",
    inputs: [{ name: "withdrawalAddress", type: "address" }],
    outputs: [{ name: "validatorId", type: "uint256" }]
  },
  {
    type: "function",
    name: "activateValidator",
    stateMutability: "nonpayable",
    inputs: [{ name: "validatorId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "simulateReward",
    stateMutability: "payable",
    inputs: [
      { name: "validatorId", type: "uint256" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "simulatePenalty",
    stateMutability: "nonpayable",
    inputs: [
      { name: "validatorId", type: "uint256" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "requestExit",
    stateMutability: "nonpayable",
    inputs: [{ name: "validatorId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "slashValidator",
    stateMutability: "nonpayable",
    inputs: [
      { name: "validatorId", type: "uint256" },
      { name: "reason", type: "uint8" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "markWithdrawable",
    stateMutability: "nonpayable",
    inputs: [{ name: "validatorId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "validatorId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "advanceEpoch",
    stateMutability: "nonpayable",
    inputs: [{ name: "epochs", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "currentEpoch",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getValidator",
    stateMutability: "view",
    inputs: [{ name: "validatorId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "withdrawalAddress", type: "address" },
          { name: "balance", type: "uint256" },
          { name: "activationEpoch", type: "uint256" },
          { name: "exitEpoch", type: "uint256" },
          { name: "withdrawableEpoch", type: "uint256" },
          { name: "slashed", type: "bool" },
          { name: "status", type: "uint8" },
          { name: "slashReason", type: "uint8" }
        ]
      }
    ]
  },
  {
    type: "event",
    name: "ValidatorStaked",
    inputs: [
      { name: "validatorId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "withdrawalAddress", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "activationEpoch", type: "uint256", indexed: false }
    ],
    anonymous: false
  }
] as const;

export const REQUIRED_STAKE = parseEther("0.032");
export const REWARD_AMOUNT = parseEther("0.001");
export const PENALTY_AMOUNT = parseEther("0.001");

export function formatEth(value?: bigint) {
  if (value === undefined) return "-";
  return `${Number(formatEther(value)).toLocaleString(undefined, {
    maximumFractionDigits: 4
  })} ETH`;
}

export function normalizeValidator(raw: readonly unknown[] | Record<string, unknown>): Validator {
  if (!Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    return {
      owner: record.owner as Address,
      withdrawalAddress: record.withdrawalAddress as Address,
      balance: record.balance as bigint,
      activationEpoch: record.activationEpoch as bigint,
      exitEpoch: record.exitEpoch as bigint,
      withdrawableEpoch: record.withdrawableEpoch as bigint,
      slashed: record.slashed as boolean,
      status: Number(record.status) as ValidatorStatus,
      slashReason: Number(record.slashReason) as SlashReason
    };
  }

  return {
    owner: raw[0] as Address,
    withdrawalAddress: raw[1] as Address,
    balance: raw[2] as bigint,
    activationEpoch: raw[3] as bigint,
    exitEpoch: raw[4] as bigint,
    withdrawableEpoch: raw[5] as bigint,
    slashed: raw[6] as boolean,
    status: Number(raw[7]) as ValidatorStatus,
    slashReason: Number(raw[8]) as SlashReason
  };
}
