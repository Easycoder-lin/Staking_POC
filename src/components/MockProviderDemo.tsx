"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import {
  DEMO_REWARD_ETH,
  DEMO_SLASH_ETH,
  REQUIRED_DEMO_STAKE_ETH,
  applyExit,
  applyReward,
  applySlash,
  applyStake,
  applyWithdrawal,
  balanceSnapshot,
  diffBalances,
  getInitialDemoAccounts,
  type DemoAccount,
  type DemoBalanceField
} from "@/lib/demo-accounts";
import {
  mockLifecycle,
  mockStatusLabels,
  type MockUnsignedTx,
  type MockValidatorRecord,
  type MockValidatorStatus,
  type ProviderInfo,
  type StakingNetwork
} from "@/lib/staking-provider";

type StakeResponse = {
  ok?: boolean;
  error?: string;
  stakeRequestId?: string;
  validatorId?: string;
  mockUnsignedTx?: MockUnsignedTx;
  validator?: MockValidatorRecord;
};

type ValidatorResponse = {
  ok?: boolean;
  error?: string;
  validator?: MockValidatorRecord;
  mockExitTx?: MockUnsignedTx;
};

type ProvidersResponse = {
  ok?: boolean;
  providers?: ProviderInfo[];
  defaultNetwork?: StakingNetwork;
};

type StepStatus = "locked" | "current" | "completed" | "error";

type DemoStep = {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
};

type ActivityItem = {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  changes?: Array<{ field: DemoBalanceField; before: number; after: number; delta: number }>;
};

type CurrentAction = {
  title: string;
  description: string;
  buttonLabel?: string;
  pendingLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
  onRun?: () => void;
  secondaryButtonLabel?: string;
  secondaryPendingLabel?: string;
  secondaryDisabled?: boolean;
  secondaryReason?: string;
  onSecondaryRun?: () => void;
};

const networks: Array<{ id: StakingNetwork; label: string }> = [
  { id: "hoodi", label: "Hoodi" },
  { id: "holesky", label: "Holesky" },
  { id: "local", label: "Local / Demo" }
];

const balanceLabels: Record<DemoBalanceField, string> = {
  walletBalance: "Wallet Balance",
  stakedBalance: "Staked ETH",
  pendingWithdrawal: "Pending Withdrawal",
  rewards: "Rewards Earned",
  slashedAmount: "Slashed Amount",
  finalWithdrawableBalance: "Final Withdrawable"
};

export function MockProviderDemo() {
  const { address } = useAccount();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [accounts, setAccounts] = useState<DemoAccount[]>(() => getInitialDemoAccounts());
  const [selectedAccountId, setSelectedAccountId] = useState("alice");
  const [walletAddress, setWalletAddress] = useState("");
  const [withdrawalAddress, setWithdrawalAddress] = useState("");
  const [amountEth, setAmountEth] = useState(REQUIRED_DEMO_STAKE_ETH.toString());
  const [network, setNetwork] = useState<StakingNetwork>("hoodi");
  const [validatorIdInput, setValidatorIdInput] = useState("");
  const [validator, setValidator] = useState<MockValidatorRecord>();
  const [mockUnsignedTx, setMockUnsignedTx] = useState<MockUnsignedTx>();
  const [mockExitTx, setMockExitTx] = useState<MockUnsignedTx>();
  const [pendingAction, setPendingAction] = useState<string>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [slashReason, setSlashReason] = useState("Mock double signing event");
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) || accounts[0],
    [accounts, selectedAccountId]
  );

  useEffect(() => {
    if (!selectedAccount) return;
    setWalletAddress(selectedAccount.walletAddress);
    setWithdrawalAddress(address || selectedAccount.walletAddress);
  }, [address, selectedAccount]);

  useEffect(() => {
    void fetch("/api/staking/providers", { cache: "no-store" })
      .then((response) => response.json() as Promise<ProvidersResponse>)
      .then((body) => {
        setProviders(body.providers || []);
        if (body.defaultNetwork) setNetwork(body.defaultNetwork);
      })
      .catch((providerError) => setError(readableError(providerError)));
  }, []);

  const mockProvider = useMemo(() => providers.find((provider) => provider.id === "mock"), [providers]);
  const realProviders = useMemo(() => providers.filter((provider) => provider.id !== "mock"), [providers]);
  const steps = useMemo(() => buildDemoSteps(validator?.status, selectedAccount, selectedAccount.rewards), [
    selectedAccount,
    validator?.status
  ]);
  const lastChanges = activity.find((item) => item.changes && item.changes.length > 0)?.changes || [];

  const appendActivity = useCallback(
    (
      title: string,
      description: string,
      changes?: Array<{ field: DemoBalanceField; before: number; after: number; delta: number }>
    ) => {
      setActivity((items) => [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          timestamp: Date.now(),
          title,
          description,
          changes
        },
        ...items
      ]);
    },
    []
  );

  const updateSelectedAccount = useCallback(
    (title: string, description: string, mutate: (account: DemoAccount) => DemoAccount) => {
      setAccounts((currentAccounts) =>
        currentAccounts.map((account) => {
          if (account.id !== selectedAccountId) return account;
          const before = balanceSnapshot(account);
          const updated = mutate(account);
          appendActivity(title, description, diffBalances(before, balanceSnapshot(updated)));
          return updated;
        })
      );
    },
    [appendActivity, selectedAccountId]
  );

  const resetDemoState = useCallback(() => {
    setAccounts(getInitialDemoAccounts());
    setSelectedAccountId("alice");
    setWalletAddress("0x1111111111111111111111111111111111111111");
    setWithdrawalAddress(address || "0x1111111111111111111111111111111111111111");
    setAmountEth(REQUIRED_DEMO_STAKE_ETH.toString());
    setValidator(undefined);
    setValidatorIdInput("");
    setMockUnsignedTx(undefined);
    setMockExitTx(undefined);
    setPendingAction(undefined);
    setError(undefined);
    setSuccess(undefined);
    setActivity([]);
  }, [address]);

  const selectAccount = useCallback((accountId: string) => {
    const account = getInitialDemoAccounts().find((item) => item.id === accountId);
    setSelectedAccountId(accountId);
    setValidator(undefined);
    setValidatorIdInput("");
    setMockUnsignedTx(undefined);
    setMockExitTx(undefined);
    setError(undefined);
    setSuccess(undefined);
    if (account) {
      setWalletAddress(account.walletAddress);
      setWithdrawalAddress(account.walletAddress);
    }
  }, []);

  const createStake = useCallback(async () => {
    setError(undefined);
    setSuccess(undefined);
    setMockExitTx(undefined);

    if (!isAddress(walletAddress)) {
      setError("Enter a valid wallet address.");
      return;
    }
    if (!isAddress(withdrawalAddress)) {
      setError("Enter a valid withdrawal address.");
      return;
    }
    if (selectedAccount.walletBalance < Number(amountEth)) {
      setError(`${selectedAccount.name} needs at least ${amountEth} ETH in the wallet balance.`);
      return;
    }

    setPendingAction("stake");
    try {
      const response = await fetch("/api/staking/providers/mock/stake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, amountEth, withdrawalAddress, network })
      });
      const body = (await response.json()) as StakeResponse;
      if (!response.ok || !body.ok || !body.validator) throw new Error(body.error || "Mock stake request failed.");
      setValidator(body.validator);
      setValidatorIdInput(body.validator.id);
      setMockUnsignedTx(body.mockUnsignedTx);
      setSuccess("Mock stake request created. The demo balance moved 32 ETH into staked ETH.");
      updateSelectedAccount(
        `${selectedAccount.name} deposited ${amountEth} ETH`,
        "Wallet balance decreased and staked ETH increased for the selected demo account.",
        (account) => applyStake(account, Number(amountEth))
      );
    } catch (stakeError) {
      setError(readableError(stakeError));
    } finally {
      setPendingAction(undefined);
    }
  }, [amountEth, network, selectedAccount, updateSelectedAccount, walletAddress, withdrawalAddress]);

  const loadValidator = useCallback(
    async (id = validatorIdInput.trim()) => {
      if (!id) {
        setError("Enter a validator ID.");
        return;
      }
      setPendingAction("load");
      setError(undefined);
      try {
        const response = await fetch(`/api/staking/validators/${encodeURIComponent(id)}`, { cache: "no-store" });
        const body = (await response.json()) as ValidatorResponse;
        if (!response.ok || !body.ok || !body.validator) throw new Error(body.error || "Validator lookup failed.");
        setValidator(body.validator);
        setValidatorIdInput(body.validator.id);
        setSuccess("Mock validator loaded.");
        appendActivity("Validator loaded", `${body.validator.id} is now selected for the demo.`);
      } catch (loadError) {
        setError(readableError(loadError));
      } finally {
        setPendingAction(undefined);
      }
    },
    [appendActivity, validatorIdInput]
  );

  const runValidatorAction = useCallback(
    async (action: "confirm" | "advance" | "exit" | "slash" | "withdraw") => {
      if (!validator) {
        setError("Create or load a mock validator first.");
        return;
      }
      setPendingAction(action);
      setError(undefined);
      setSuccess(undefined);
      try {
        const response = await fetch(`/api/staking/validators/${encodeURIComponent(validator.id)}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: action === "slash" ? JSON.stringify({ slashReason }) : undefined
        });
        const body = (await response.json()) as ValidatorResponse;
        if (!response.ok || !body.ok || !body.validator) throw new Error(body.error || `${action} failed.`);
        setValidator(body.validator);
        if (body.mockExitTx) setMockExitTx(body.mockExitTx);
        if (action === "confirm") {
          setSuccess("Mock deposit submitted.");
          appendActivity("Validator created", "Mock deposit transaction was confirmed and submitted.");
        }
        if (action === "advance") {
          setSuccess(`Advanced to ${mockStatusLabels[body.validator.status]}.`);
          appendActivity("Lifecycle advanced", `Validator moved to ${mockStatusLabels[body.validator.status]}.`);
        }
        if (action === "exit") {
          setSuccess("Mock exit requested.");
          updateSelectedAccount(
            "Unstake requested",
            "Staked ETH and rewards moved into pending withdrawal.",
            applyExit
          );
        }
        if (action === "slash") {
          setSuccess("Mock slashing event recorded.");
          updateSelectedAccount(
            `Validator slashed by ${DEMO_SLASH_ETH} ETH`,
            slashReason,
            (account) => applySlash(account, DEMO_SLASH_ETH)
          );
        }
        if (action === "withdraw") {
          setSuccess("Mock validator marked withdrawn.");
          updateSelectedAccount(
            "Withdrawal completed",
            "Pending withdrawal moved back into wallet balance.",
            applyWithdrawal
          );
        }
      } catch (actionError) {
        setError(readableError(actionError));
      } finally {
        setPendingAction(undefined);
      }
    },
    [appendActivity, slashReason, updateSelectedAccount, validator]
  );

  const earnReward = useCallback(() => {
    setError(undefined);
    setSuccess(`Reward earned: +${DEMO_REWARD_ETH} ETH.`);
    updateSelectedAccount(
      `${selectedAccount.name} earned ${DEMO_REWARD_ETH} ETH`,
      "Rewards increased while the validator stayed active.",
      (account) => applyReward(account, DEMO_REWARD_ETH)
    );
  }, [selectedAccount.name, updateSelectedAccount]);

  const currentAction = buildCurrentAction({
    validator,
    selectedAccount,
    mockProviderEnabled: mockProvider?.enabled !== false,
    pendingAction,
    createStake,
    earnReward,
    runValidatorAction
  });

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-moss">Demo control room</p>
            <h2 className="mt-1 text-xl font-bold">Ethereum Staking POC</h2>
            <p className="mt-1 max-w-3xl text-sm text-ink/70">
              Select a demo account, execute one staking step at a time, and watch balances move through staking,
              rewards, exit, waiting period, withdrawal, and optional slashing.
            </p>
          </div>
          <button
            type="button"
            onClick={resetDemoState}
            className="rounded-md border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper"
          >
            Reset Demo State
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <div className="space-y-5">
          <AccountSelector
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelect={selectAccount}
          />
          <ProviderSelection mockProvider={mockProvider} realProviders={realProviders} />
        </div>

        <div className="space-y-5">
          <StakingProgress steps={steps} />
          <BalanceCards account={selectedAccount} changes={lastChanges} />

          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-5">
              <CurrentStepCard action={currentAction} pendingAction={pendingAction} error={error} success={success} />
              <ActivityLog items={activity} />
            </div>

            <div className="space-y-5">
              <TechnicalDetails
                walletAddress={walletAddress}
                withdrawalAddress={withdrawalAddress}
                amountEth={amountEth}
                network={network}
                validatorIdInput={validatorIdInput}
                slashReason={slashReason}
                validator={validator}
                pendingAction={pendingAction}
                mockUnsignedTx={mockUnsignedTx}
                mockExitTx={mockExitTx}
                onWalletAddressChange={setWalletAddress}
                onWithdrawalAddressChange={setWithdrawalAddress}
                onAmountEthChange={setAmountEth}
                onNetworkChange={setNetwork}
                onValidatorIdChange={setValidatorIdInput}
                onSlashReasonChange={setSlashReason}
                onLoadValidator={() => void loadValidator()}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountSelector({
  accounts,
  selectedAccountId,
  onSelect
}: {
  accounts: DemoAccount[];
  selectedAccountId: string;
  onSelect: (accountId: string) => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold">Demo Account</h2>
      <div className="mt-3 grid gap-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => onSelect(account.id)}
            className={`rounded-md border px-3 py-3 text-left text-sm ${
              selectedAccountId === account.id ? "border-moss bg-moss/10 text-moss" : "border-line bg-paper text-ink"
            }`}
          >
            <span className="block font-semibold">{account.name}</span>
            <span className="mt-1 block font-mono text-xs text-ink/55">{account.walletAddress}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProviderSelection({ mockProvider, realProviders }: { mockProvider?: ProviderInfo; realProviders: ProviderInfo[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Provider</h2>
        <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold text-moss">
          {mockProvider?.name || "Mock Provider"}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        <ProviderCard provider={mockProvider} selected />
        {realProviders.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </div>
    </section>
  );
}

function StakingProgress({ steps }: { steps: DemoStep[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Staking Lifecycle Progress</h2>
        <span className="text-sm font-medium text-ink/60">
          {steps.filter((step) => step.status === "completed").length}/{steps.length} complete
        </span>
      </div>
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="grid min-w-[860px] grid-cols-9 gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {index > 0 ? <span className="absolute -left-2 top-4 h-0.5 w-2 bg-line" /> : null}
              <div
                className={`min-h-[116px] rounded-md border p-3 text-sm ${stepTone(step.status)}`}
                title={step.description}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border bg-white text-xs font-bold">
                  {step.status === "completed" ? "OK" : index + 1}
                </div>
                <p className="mt-3 font-semibold leading-snug">{step.label}</p>
                <p className="mt-1 text-xs leading-snug opacity-75">{statusLabel(step.status)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BalanceCards({
  account,
  changes
}: {
  account: DemoAccount;
  changes: Array<{ field: DemoBalanceField; before: number; after: number; delta: number }>;
}) {
  const cards: Array<{ field: DemoBalanceField; value: number }> = [
    { field: "walletBalance", value: account.walletBalance },
    { field: "stakedBalance", value: account.stakedBalance },
    { field: "rewards", value: account.rewards },
    { field: "pendingWithdrawal", value: account.pendingWithdrawal },
    { field: "slashedAmount", value: account.slashedAmount },
    { field: "finalWithdrawableBalance", value: account.finalWithdrawableBalance }
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const change = changes.find((item) => item.field === card.field);
        return (
          <div key={card.field} className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <p className="text-sm font-medium text-ink/60">{balanceLabels[card.field]}</p>
            <p className="mt-2 text-2xl font-bold">{formatEth(card.value)}</p>
            {change ? (
              <p className={`mt-2 text-sm font-semibold ${change.delta > 0 ? "text-moss" : "text-rose"}`}>
                {formatEth(change.before)} -&gt; {formatEth(change.after)}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink/45">No change in latest step</p>
            )}
          </div>
        );
      })}
    </section>
  );
}

function CurrentStepCard({
  action,
  pendingAction,
  error,
  success
}: {
  action: CurrentAction;
  pendingAction?: string;
  error?: string;
  success?: string;
}) {
  const primaryPending = pendingAction && action.pendingLabel;
  const secondaryPending = pendingAction && action.secondaryPendingLabel;

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <p className="text-sm font-semibold uppercase tracking-wide text-moss">Current step</p>
      <h2 className="mt-1 text-xl font-bold">{action.title}</h2>
      <p className="mt-2 text-sm text-ink/70">{action.description}</p>

      {action.buttonLabel ? (
        <button
          type="button"
          onClick={action.onRun}
          disabled={action.disabled || Boolean(pendingAction)}
          className="mt-5 w-full rounded-md bg-moss px-4 py-3 text-sm font-semibold text-white hover:bg-moss/90 disabled:bg-line disabled:text-ink/45"
        >
          {primaryPending ? action.pendingLabel : action.buttonLabel}
        </button>
      ) : null}
      {action.disabled && action.disabledReason ? <p className="mt-2 text-sm text-ink/55">{action.disabledReason}</p> : null}

      {action.secondaryButtonLabel ? (
        <button
          type="button"
          onClick={action.onSecondaryRun}
          disabled={action.secondaryDisabled || Boolean(pendingAction)}
          className="mt-3 w-full rounded-md bg-rose px-4 py-3 text-sm font-semibold text-white hover:bg-rose/90 disabled:bg-line disabled:text-ink/45"
        >
          {secondaryPending ? action.secondaryPendingLabel : action.secondaryButtonLabel}
        </button>
      ) : null}
      {action.secondaryDisabled && action.secondaryReason ? <p className="mt-2 text-sm text-ink/55">{action.secondaryReason}</p> : null}

      {success ? <p className="mt-4 rounded-md bg-moss/10 p-3 text-sm text-moss">{success}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
    </section>
  );
}

function ActivityLog({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold">Activity History</h2>
      {items.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-line bg-paper p-4 text-sm text-ink/65">
          Activity will appear as each demo step runs.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.slice(0, 8).map((item) => (
            <div key={item.id} className="rounded-md border border-line bg-paper p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-sm font-semibold">{item.title}</p>
                <time className="text-xs text-ink/50">{new Date(item.timestamp).toLocaleTimeString()}</time>
              </div>
              <p className="mt-1 text-sm text-ink/65">{item.description}</p>
              {item.changes?.length ? (
                <div className="mt-2 grid gap-1 text-xs text-ink/60">
                  {item.changes.map((change) => (
                    <span key={change.field}>
                      {balanceLabels[change.field]}: {formatEth(change.before)} -&gt; {formatEth(change.after)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TechnicalDetails({
  walletAddress,
  withdrawalAddress,
  amountEth,
  network,
  validatorIdInput,
  slashReason,
  validator,
  pendingAction,
  mockUnsignedTx,
  mockExitTx,
  onWalletAddressChange,
  onWithdrawalAddressChange,
  onAmountEthChange,
  onNetworkChange,
  onValidatorIdChange,
  onSlashReasonChange,
  onLoadValidator
}: {
  walletAddress: string;
  withdrawalAddress: string;
  amountEth: string;
  network: StakingNetwork;
  validatorIdInput: string;
  slashReason: string;
  validator?: MockValidatorRecord;
  pendingAction?: string;
  mockUnsignedTx?: MockUnsignedTx;
  mockExitTx?: MockUnsignedTx;
  onWalletAddressChange: (value: string) => void;
  onWithdrawalAddressChange: (value: string) => void;
  onAmountEthChange: (value: string) => void;
  onNetworkChange: (value: StakingNetwork) => void;
  onValidatorIdChange: (value: string) => void;
  onSlashReasonChange: (value: string) => void;
  onLoadValidator: () => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <details>
        <summary className="cursor-pointer text-base font-semibold">Technical Details</summary>
        <div className="mt-4 grid gap-3">
          <TextInput label="Wallet Address" value={walletAddress} placeholder="0x..." onChange={onWalletAddressChange} />
          <TextInput
            label="Withdrawal Address"
            value={withdrawalAddress}
            placeholder="0x..."
            onChange={onWithdrawalAddressChange}
          />
          <label className="block text-sm font-medium">
            Amount ETH
            <input
              value={amountEth}
              onChange={(event) => onAmountEthChange(event.target.value)}
              className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-sky"
            />
          </label>
          <label className="block text-sm font-medium">
            Network
            <select
              value={network}
              onChange={(event) => onNetworkChange(event.target.value as StakingNetwork)}
              className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-sky"
            >
              {networks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Slash Reason
            <input
              value={slashReason}
              onChange={(event) => onSlashReasonChange(event.target.value)}
              className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-sky"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={validatorIdInput}
              onChange={(event) => onValidatorIdChange(event.target.value)}
              placeholder="mock-val-..."
              className="w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-sky"
            />
            <button
              type="button"
              onClick={onLoadValidator}
              disabled={pendingAction === "load"}
              className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:bg-line disabled:text-ink/45"
            >
              {pendingAction === "load" ? "Loading..." : "Load"}
            </button>
          </div>
        </div>
      </details>

      <MockValidatorDetails validator={validator} />
      <MockTransactionPanel title="Mock Transaction Payload" tx={mockUnsignedTx} />
      <MockTransactionPanel title="Mock Exit Transaction" tx={mockExitTx} />
    </section>
  );
}

function ProviderCard({ provider, selected = false }: { provider?: ProviderInfo; selected?: boolean }) {
  const disabled = provider?.enabled === false;
  return (
    <div className={`rounded-lg border p-4 ${selected ? "border-moss bg-moss/10" : "border-line bg-paper"}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{provider?.name || "Mock Provider"}</h3>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${disabled ? "bg-line text-ink/60" : "bg-white text-moss"}`}>
          {disabled ? "Coming soon" : provider?.realProvider ? "Real" : "Demo"}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink/70">
        {provider?.description || "Demo-only provider that simulates validator lifecycle data locally."}
      </p>
    </div>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-sky"
      />
    </label>
  );
}

function MockValidatorDetails({ validator }: { validator?: MockValidatorRecord }) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Validator Metadata</h3>
        {validator ? (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(validator.status)}`}>
            {mockStatusLabels[validator.status]}
          </span>
        ) : null}
      </div>
      {!validator ? (
        <p className="mt-4 rounded-md border border-dashed border-line bg-paper p-4 text-sm text-ink/70">
          Create a mock stake request or load a validator to view provider metadata.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 text-sm">
          <Detail label="Validator ID" value={validator.id} mono />
          <Detail label="Mock Public Key" value={validator.mockValidatorPubkey} mono />
          <Detail label="Provider" value="mock (demo/test data)" />
          <Detail label="Network" value={validator.network} />
          <Detail label="Status" value={mockStatusLabels[validator.status]} />
          <Detail label="Stake Amount" value={`${validator.amountEth} ETH`} />
          <Detail label="Wallet Address" value={validator.walletAddress} mono />
          <Detail label="Withdrawal Address" value={validator.withdrawalAddress} mono />
          <Detail label="Stake Request ID" value={validator.stakeRequestId} mono />
          <Detail label="Deposit Tx Hash" value={validator.depositTxHash || "-"} mono />
          <Detail label="Exit Tx Hash" value={validator.exitTxHash || "-"} mono />
          <Detail label="Created At" value={validator.createdAt} />
          <Detail label="Updated At" value={validator.updatedAt} />
          <Detail label="Activated At" value={validator.activatedAt || "-"} />
          <Detail label="Exited At" value={validator.exitedAt || "-"} />
          <Detail label="Withdrawn At" value={validator.withdrawnAt || "-"} />
          <Detail label="Slashed At" value={validator.slashedAt || "-"} />
          <Detail label="Slash Reason" value={validator.slashReason || "-"} />
        </div>
      )}
    </div>
  );
}

function MockTransactionPanel({ title, tx }: { title: string; tx?: MockUnsignedTx }) {
  if (!tx) return null;

  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-ink/70">{tx.disclaimer}</p>
      <pre className="mt-4 max-h-72 overflow-auto rounded-md border border-line bg-ink p-3 text-xs text-white">
        {JSON.stringify(tx, null, 2)}
      </pre>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line pb-2 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <span className="text-ink/60">{label}</span>
      <span className={`break-all font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function buildCurrentAction({
  validator,
  selectedAccount,
  mockProviderEnabled,
  pendingAction,
  createStake,
  earnReward,
  runValidatorAction
}: {
  validator?: MockValidatorRecord;
  selectedAccount: DemoAccount;
  mockProviderEnabled: boolean;
  pendingAction?: string;
  createStake: () => void;
  earnReward: () => void;
  runValidatorAction: (action: "confirm" | "advance" | "exit" | "slash" | "withdraw") => void;
}): CurrentAction {
  const slashAction = validator && validator.status !== "withdrawn"
    ? {
        secondaryButtonLabel: "Optional: Trigger Slashing",
        secondaryPendingLabel: "Recording Slash...",
        onSecondaryRun: () => runValidatorAction("slash")
      }
    : {};

  if (!validator) {
    return {
      title: "Deposit 32 ETH Into Staking",
      description: `${selectedAccount.name} starts with ${formatEth(selectedAccount.walletBalance)}. This creates a mock validator request and moves ETH from wallet balance into staked ETH.`,
      buttonLabel: "Deposit 32 ETH",
      pendingLabel: "Creating Stake Request...",
      disabled: pendingAction === "stake" || !mockProviderEnabled,
      disabledReason: mockProviderEnabled ? undefined : "Mock provider is disabled.",
      onRun: createStake
    };
  }

  if (validator.status === "pending_deposit") {
    return {
      title: "Create Validator",
      description: "Confirm the mock deposit transaction so the validator can enter the activation lifecycle.",
      buttonLabel: "Confirm Mock Transaction",
      pendingLabel: "Confirming...",
      onRun: () => runValidatorAction("confirm"),
      ...slashAction
    };
  }

  if (validator.status === "deposit_submitted") {
    return {
      title: "Activate Validator",
      description: "Move the submitted deposit into activation pending. This represents the network accepting the validator into the activation queue.",
      buttonLabel: "Move to Activation Pending",
      pendingLabel: "Advancing...",
      onRun: () => runValidatorAction("advance"),
      ...slashAction
    };
  }

  if (validator.status === "activation_pending") {
    return {
      title: "Activate Validator",
      description: "Complete activation so the validator starts participating and can earn rewards.",
      buttonLabel: "Activate Validator",
      pendingLabel: "Activating...",
      onRun: () => runValidatorAction("advance"),
      ...slashAction
    };
  }

  if (validator.status === "active" && selectedAccount.rewards <= 0) {
    return {
      title: "Start Earning Rewards",
      description: `Apply a visible demo reward of ${DEMO_REWARD_ETH} ETH while the validator remains active.`,
      buttonLabel: `Earn ${DEMO_REWARD_ETH} ETH Reward`,
      pendingLabel: "Applying Reward...",
      onRun: earnReward,
      ...slashAction
    };
  }

  if (validator.status === "active") {
    return {
      title: "Request Unstake / Exit Validator",
      description: "Request validator exit. Demo balances move from staked ETH and rewards into pending withdrawal.",
      buttonLabel: "Request Exit",
      pendingLabel: "Requesting Exit...",
      onRun: () => runValidatorAction("exit"),
      ...slashAction
    };
  }

  if (validator.status === "exit_requested") {
    return {
      title: "Withdrawal Queue / Waiting Period",
      description: "Advance the mock provider lifecycle from exit requested into exiting.",
      buttonLabel: "Advance Waiting Period",
      pendingLabel: "Advancing...",
      onRun: () => runValidatorAction("advance"),
      ...slashAction
    };
  }

  if (validator.status === "exiting") {
    return {
      title: "Withdrawal Queue / Waiting Period",
      description: "Complete the mock waiting period so funds become withdrawable.",
      buttonLabel: "Mark Withdrawable",
      pendingLabel: "Advancing...",
      onRun: () => runValidatorAction("advance"),
      ...slashAction
    };
  }

  if (validator.status === "withdrawable") {
    return {
      title: "Withdraw Funds",
      description: "Complete withdrawal. Pending withdrawal returns to the wallet balance.",
      buttonLabel: "Withdraw Funds",
      pendingLabel: "Withdrawing...",
      onRun: () => runValidatorAction("withdraw")
    };
  }

  if (validator.status === "slashed") {
    return {
      title: "Slashing Scenario Triggered",
      description: "The validator is slashed in the mock provider. Reset the demo to replay the happy path or select another account.",
      buttonLabel: undefined
    };
  }

  return {
    title: "Lifecycle Complete",
    description: "The validator has been withdrawn. Reset the demo state to replay the staking flow.",
    buttonLabel: undefined
  };
}

function buildDemoSteps(status: MockValidatorStatus | undefined, account: DemoAccount, rewards: number): DemoStep[] {
  const activeStatus = status || "draft";
  const isSlashed = activeStatus === "slashed";
  const index = mockLifecycle.indexOf(activeStatus);
  const completedByLifecycle = (target: MockValidatorStatus) => !isSlashed && index > mockLifecycle.indexOf(target);
  const currentByLifecycle = (target: MockValidatorStatus) => !isSlashed && activeStatus === target;
  const activeOrLater = !isSlashed && index >= mockLifecycle.indexOf("active");

  return [
    step("account", "Select Account", "Choose Alice, Bob, or Validator Operator.", "completed"),
    step("deposit", "Deposit", "Move 32 ETH from wallet balance into staking.", !status ? "current" : "completed"),
    step(
      "create",
      "Create Validator",
      "Confirm the mock deposit transaction.",
      currentByLifecycle("pending_deposit") ? "current" : completedByLifecycle("pending_deposit") ? "completed" : "locked"
    ),
    step(
      "activate",
      "Activate",
      "Advance through deposit submitted and activation pending.",
      activeStatus === "deposit_submitted" || activeStatus === "activation_pending"
        ? "current"
        : activeOrLater || activeStatus === "exit_requested" || activeStatus === "exiting" || activeStatus === "withdrawable" || activeStatus === "withdrawn"
          ? "completed"
          : "locked"
    ),
    step(
      "rewards",
      "Rewards",
      "Apply a visible demo reward.",
      activeStatus === "active" && rewards <= 0
        ? "current"
        : rewards > 0 || activeStatus === "exit_requested" || activeStatus === "exiting" || activeStatus === "withdrawable" || activeStatus === "withdrawn"
          ? "completed"
          : "locked"
    ),
    step(
      "exit",
      "Request Unstake",
      "Request validator exit.",
      activeStatus === "active" && rewards > 0
        ? "current"
        : activeStatus === "exit_requested" || activeStatus === "exiting" || activeStatus === "withdrawable" || activeStatus === "withdrawn"
          ? "completed"
          : "locked"
    ),
    step(
      "queue",
      "Waiting Period",
      "Advance the withdrawal queue.",
      activeStatus === "exit_requested" || activeStatus === "exiting"
        ? "current"
        : activeStatus === "withdrawable" || activeStatus === "withdrawn"
          ? "completed"
          : "locked"
    ),
    step(
      "withdraw",
      "Withdraw",
      "Return pending withdrawal to wallet balance.",
      currentByLifecycle("withdrawable") ? "current" : activeStatus === "withdrawn" ? "completed" : "locked"
    ),
    step(
      "slash",
      "Optional Slash",
      "Trigger a slashing scenario from the current validator.",
      isSlashed ? "error" : account.slashedAmount > 0 ? "completed" : activeOrLater ? "current" : "locked"
    )
  ];
}

function step(id: string, label: string, description: string, status: StepStatus): DemoStep {
  return { id, label, description, status };
}

function stepTone(status: StepStatus) {
  if (status === "completed") return "border-moss/30 bg-moss/10 text-moss";
  if (status === "current") return "border-sky bg-sky/10 text-sky";
  if (status === "error") return "border-rose bg-rose/10 text-rose";
  return "border-line bg-paper text-ink/45";
}

function statusLabel(status: StepStatus) {
  if (status === "completed") return "Completed";
  if (status === "current") return "Current";
  if (status === "error") return "Attention";
  return "Locked";
}

function statusTone(status: MockValidatorStatus) {
  if (status === "active" || status === "withdrawable" || status === "withdrawn") {
    return "border-moss/25 bg-moss/10 text-moss";
  }
  if (status === "slashed") return "border-rose/25 bg-rose/10 text-rose";
  if (status === "draft") return "border-line bg-paper text-ink/65";
  return "border-sky/25 bg-sky/10 text-sky";
}

function formatEth(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} ETH`;
}

function readableError(error: unknown) {
  if (error instanceof Error) return error.message.split("\n")[0];
  return "Request failed.";
}
