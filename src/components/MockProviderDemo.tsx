"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
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

const networks: Array<{ id: StakingNetwork; label: string }> = [
  { id: "hoodi", label: "Hoodi" },
  { id: "holesky", label: "Holesky" },
  { id: "local", label: "Local / Demo" }
];

const devControlsEnabled = process.env.NODE_ENV !== "production";

export function MockProviderDemo() {
  const { address } = useAccount();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [withdrawalAddress, setWithdrawalAddress] = useState("");
  const [amountEth, setAmountEth] = useState("32");
  const [network, setNetwork] = useState<StakingNetwork>("hoodi");
  const [validatorIdInput, setValidatorIdInput] = useState("");
  const [validator, setValidator] = useState<MockValidatorRecord>();
  const [mockUnsignedTx, setMockUnsignedTx] = useState<MockUnsignedTx>();
  const [mockExitTx, setMockExitTx] = useState<MockUnsignedTx>();
  const [pendingAction, setPendingAction] = useState<string>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [slashReason, setSlashReason] = useState("Mock double signing event");

  useEffect(() => {
    setWalletAddress((current) => current || address || "");
    setWithdrawalAddress((current) => current || address || "");
  }, [address]);

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
  const canConfirm = validator?.status === "pending_deposit" && mockUnsignedTx?.kind === "mock_deposit";
  const canRequestExit = validator?.status === "active";
  const canWithdraw = validator?.status === "withdrawable";

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
      setSuccess("Mock stake request created. Confirm the mock transaction to submit the demo deposit.");
    } catch (stakeError) {
      setError(readableError(stakeError));
    } finally {
      setPendingAction(undefined);
    }
  }, [amountEth, network, walletAddress, withdrawalAddress]);

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
      } catch (loadError) {
        setError(readableError(loadError));
      } finally {
        setPendingAction(undefined);
      }
    },
    [validatorIdInput]
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
        if (action === "confirm") setSuccess("Mock deposit submitted.");
        if (action === "advance") setSuccess(`Advanced to ${mockStatusLabels[body.validator.status]}.`);
        if (action === "exit") setSuccess("Mock exit requested.");
        if (action === "slash") setSuccess("Mock slashing event recorded.");
        if (action === "withdraw") setSuccess("Mock validator marked withdrawn.");
      } catch (actionError) {
        setError(readableError(actionError));
      } finally {
        setPendingAction(undefined);
      }
    },
    [slashReason, validator]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold">Provider Selection</h2>
            <p className="mt-1 max-w-3xl text-sm text-ink/70">
              Route B uses demo/test data only. Mock Provider responses and transactions do not create real Ethereum
              validators.
            </p>
          </div>
          <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-semibold text-moss">
            Selected: {mockProvider?.name || "Mock Provider"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ProviderCard provider={mockProvider} selected />
          {realProviders.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <h2 className="text-base font-semibold">Stake</h2>
            <p className="mt-1 text-sm text-ink/70">Create a local mock validator request for a visual demo.</p>

            <div className="mt-4 grid gap-3">
              <TextInput label="Wallet Address" value={walletAddress} placeholder={address || "0x..."} onChange={setWalletAddress} />
              <TextInput
                label="Withdrawal Address"
                value={withdrawalAddress}
                placeholder={address || "0x..."}
                onChange={setWithdrawalAddress}
              />
              <label className="block text-sm font-medium">
                Amount ETH
                <input
                  value={amountEth}
                  onChange={(event) => setAmountEth(event.target.value)}
                  className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-sky"
                />
              </label>
              <label className="block text-sm font-medium">
                Network
                <select
                  value={network}
                  onChange={(event) => setNetwork(event.target.value as StakingNetwork)}
                  className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-sky"
                >
                  {networks.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={createStake}
              disabled={pendingAction === "stake" || mockProvider?.enabled === false}
              className="mt-4 w-full rounded-md bg-moss px-4 py-2.5 text-sm font-semibold text-white hover:bg-moss/90 disabled:bg-line disabled:text-ink/45"
            >
              {pendingAction === "stake" ? "Creating..." : "Stake with Mock Provider"}
            </button>
          </section>

          <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <h2 className="text-base font-semibold">Load Validator</h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={validatorIdInput}
                onChange={(event) => setValidatorIdInput(event.target.value)}
                placeholder="mock-val-..."
                className="w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-sky"
              />
              <button
                type="button"
                onClick={() => void loadValidator()}
                disabled={pendingAction === "load"}
                className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:bg-line disabled:text-ink/45"
              >
                Load
              </button>
            </div>
          </section>

          <MockTransactionPanel title="Mock Transaction Payload" tx={mockUnsignedTx} />
          <MockTransactionPanel title="Mock Exit Transaction" tx={mockExitTx} />
        </div>

        <div className="space-y-5">
          <MockLifecycleTimeline status={validator?.status} />
          <MockValidatorDetails validator={validator} />
          <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <h2 className="text-base font-semibold">Demo Controls</h2>
            {devControlsEnabled ? (
              <>
                <p className="mt-1 text-sm text-ink/70">Development-only controls for manually driving the lifecycle.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <DemoButton
                    label="Confirm Mock Transaction"
                    disabled={!canConfirm}
                    pending={pendingAction === "confirm"}
                    onClick={() => void runValidatorAction("confirm")}
                  />
                  <DemoButton
                    label="Advance Status"
                    disabled={!validator || validator.status === "slashed" || validator.status === "withdrawn"}
                    pending={pendingAction === "advance"}
                    onClick={() => void runValidatorAction("advance")}
                  />
                  <DemoButton
                    label="Request Exit"
                    disabled={!canRequestExit}
                    pending={pendingAction === "exit"}
                    onClick={() => void runValidatorAction("exit")}
                  />
                  <DemoButton
                    label="Mark Withdrawn"
                    disabled={!canWithdraw}
                    pending={pendingAction === "withdraw"}
                    onClick={() => void runValidatorAction("withdraw")}
                  />
                </div>

                <div className="mt-4 rounded-md border border-line bg-paper p-3">
                  <label className="block text-sm font-medium">
                    Slash Reason
                    <input
                      value={slashReason}
                      onChange={(event) => setSlashReason(event.target.value)}
                      className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sky"
                    />
                  </label>
                  <DemoButton
                    label="Simulate Slashing"
                    disabled={!validator || validator.status === "withdrawn"}
                    pending={pendingAction === "slash"}
                    onClick={() => void runValidatorAction("slash")}
                    className="mt-3 bg-rose hover:bg-rose/90"
                  />
                  {validator?.status === "slashed" ? (
                    <p className="mt-3 rounded-md bg-rose/10 p-3 text-sm text-rose">
                      This is a mock slashing event for demo purposes. In real Ethereum staking, slashing can occur when
                      a validator violates consensus rules, such as double signing or surround voting.
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-3 rounded-md border border-line bg-paper p-3 text-sm text-ink/70">
                Debug controls are hidden in production.
              </p>
            )}
            {success ? <p className="mt-4 rounded-md bg-moss/10 p-3 text-sm text-moss">{success}</p> : null}
            {error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
          </section>
        </div>
      </div>
    </div>
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

function MockLifecycleTimeline({ status }: { status?: MockValidatorStatus }) {
  const active = status || "draft";
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Lifecycle</h2>
          <p className="mt-1 text-sm text-ink/70">Draft to withdrawn, using mock provider states.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(active)}`}>
          {mockStatusLabels[active]}
        </span>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {mockLifecycle.map((item, index) => {
          const activeIndex = mockLifecycle.indexOf(active);
          const reached = active !== "slashed" && index <= activeIndex;
          const current = item === active;
          return (
            <div
              key={item}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                current ? statusTone(item) : reached ? "border-moss/30 bg-moss/10 text-moss" : "border-line bg-paper text-ink/55"
              }`}
            >
              {index + 1}. {mockStatusLabels[item]}
            </div>
          );
        })}
        {active === "slashed" ? (
          <div className={`rounded-md border px-3 py-2 text-sm font-semibold ${statusTone("slashed")}`}>
            Slashed
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MockValidatorDetails({ validator }: { validator?: MockValidatorRecord }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Validator Dashboard</h2>
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
    </section>
  );
}

function MockTransactionPanel({ title, tx }: { title: string; tx?: MockUnsignedTx }) {
  if (!tx) return null;

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-ink/70">{tx.disclaimer}</p>
      <pre className="mt-4 max-h-72 overflow-auto rounded-md border border-line bg-ink p-3 text-xs text-white">
        {JSON.stringify(tx, null, 2)}
      </pre>
    </section>
  );
}

function DemoButton({
  label,
  disabled,
  pending,
  className = "bg-ink hover:bg-ink/90",
  onClick
}: {
  label: string;
  disabled: boolean;
  pending: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className={`w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:bg-line disabled:text-ink/45 ${className}`}
    >
      {pending ? "Pending..." : label}
    </button>
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

function statusTone(status: MockValidatorStatus) {
  if (status === "active" || status === "withdrawable" || status === "withdrawn") {
    return "border-moss/25 bg-moss/10 text-moss";
  }
  if (status === "slashed") return "border-rose/25 bg-rose/10 text-rose";
  if (status === "draft") return "border-line bg-paper text-ink/65";
  return "border-sky/25 bg-sky/10 text-sky";
}

function readableError(error: unknown) {
  if (error instanceof Error) return error.message.split("\n")[0];
  return "Request failed.";
}
