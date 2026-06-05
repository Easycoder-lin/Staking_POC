export type DemoAccount = {
  id: string;
  name: string;
  walletAddress: string;
  walletBalance: number;
  stakedBalance: number;
  pendingWithdrawal: number;
  rewards: number;
  slashedAmount: number;
  finalWithdrawableBalance: number;
};

export type DemoAccountBalances = Pick<
  DemoAccount,
  "walletBalance" | "stakedBalance" | "pendingWithdrawal" | "rewards" | "slashedAmount" | "finalWithdrawableBalance"
>;

export type DemoBalanceField = keyof DemoAccountBalances;

export const REQUIRED_DEMO_STAKE_ETH = 32;
export const DEMO_REWARD_ETH = 0.2;
export const DEMO_SLASH_ETH = 1;

export const initialDemoAccounts: DemoAccount[] = [
  {
    id: "alice",
    name: "Alice",
    walletAddress: "0x1111111111111111111111111111111111111111",
    walletBalance: 40,
    stakedBalance: 0,
    pendingWithdrawal: 0,
    rewards: 0,
    slashedAmount: 0,
    finalWithdrawableBalance: 0
  },
  {
    id: "bob",
    name: "Bob",
    walletAddress: "0x2222222222222222222222222222222222222222",
    walletBalance: 36,
    stakedBalance: 0,
    pendingWithdrawal: 0,
    rewards: 0,
    slashedAmount: 0,
    finalWithdrawableBalance: 0
  },
  {
    id: "validator-operator",
    name: "Validator Operator",
    walletAddress: "0x3333333333333333333333333333333333333333",
    walletBalance: 64,
    stakedBalance: 0,
    pendingWithdrawal: 0,
    rewards: 0,
    slashedAmount: 0,
    finalWithdrawableBalance: 0
  }
];

export function getInitialDemoAccounts() {
  return initialDemoAccounts.map((account) => ({ ...account }));
}

export function applyStake(account: DemoAccount, amountEth = REQUIRED_DEMO_STAKE_ETH): DemoAccount {
  return {
    ...account,
    walletBalance: roundEth(account.walletBalance - amountEth),
    stakedBalance: roundEth(account.stakedBalance + amountEth)
  };
}

export function applyReward(account: DemoAccount, amountEth = DEMO_REWARD_ETH): DemoAccount {
  return {
    ...account,
    rewards: roundEth(account.rewards + amountEth),
    finalWithdrawableBalance: roundEth(account.stakedBalance + account.pendingWithdrawal + account.rewards)
  };
}

export function applyExit(account: DemoAccount): DemoAccount {
  return {
    ...account,
    stakedBalance: 0,
    pendingWithdrawal: roundEth(account.pendingWithdrawal + account.stakedBalance + account.rewards),
    finalWithdrawableBalance: roundEth(account.stakedBalance + account.pendingWithdrawal + account.rewards)
  };
}

export function applyWithdrawal(account: DemoAccount): DemoAccount {
  const withdrawable = roundEth(account.pendingWithdrawal || account.finalWithdrawableBalance);

  return {
    ...account,
    walletBalance: roundEth(account.walletBalance + withdrawable),
    pendingWithdrawal: 0,
    rewards: 0,
    finalWithdrawableBalance: 0
  };
}

export function applySlash(account: DemoAccount, amountEth = DEMO_SLASH_ETH): DemoAccount {
  const rewardDeduction = Math.min(account.rewards, amountEth);
  const remainingDeduction = amountEth - rewardDeduction;

  return {
    ...account,
    rewards: roundEth(account.rewards - rewardDeduction),
    stakedBalance: roundEth(Math.max(0, account.stakedBalance - remainingDeduction)),
    slashedAmount: roundEth(account.slashedAmount + amountEth),
    finalWithdrawableBalance: roundEth(Math.max(0, account.stakedBalance + account.pendingWithdrawal + account.rewards - amountEth))
  };
}

export function balanceSnapshot(account: DemoAccount): DemoAccountBalances {
  return {
    walletBalance: account.walletBalance,
    stakedBalance: account.stakedBalance,
    pendingWithdrawal: account.pendingWithdrawal,
    rewards: account.rewards,
    slashedAmount: account.slashedAmount,
    finalWithdrawableBalance: account.finalWithdrawableBalance
  };
}

export function diffBalances(before: DemoAccountBalances, after: DemoAccountBalances) {
  return (Object.keys(before) as DemoBalanceField[])
    .map((field) => ({ field, before: before[field], after: after[field], delta: roundEth(after[field] - before[field]) }))
    .filter((change) => change.delta !== 0);
}

function roundEth(value: number) {
  return Math.round(value * 1000) / 1000;
}
