"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { decodeEventLog, isAddress, type Address, type Hash } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { ActionPanel, type ActionName } from "@/components/ActionPanel";
import { EventTimeline } from "@/components/EventTimeline";
import { FigmentConnectionStatus } from "@/components/FigmentConnectionStatus";
import { FigmentDepositPreview, type DepositPreview } from "@/components/FigmentDepositPreview";
import { FigmentValidatorRequest } from "@/components/FigmentValidatorRequest";
import { FigmentValidatorStatus } from "@/components/FigmentValidatorStatus";
import { StakePanel } from "@/components/StakePanel";
import { ValidatorDetails } from "@/components/ValidatorDetails";
import { ValidatorFlow } from "@/components/ValidatorFlow";
import { WalletStatus } from "@/components/WalletStatus";
import {
  MOCK_STAKING_ABI,
  MOCK_STAKING_ADDRESS,
  PENALTY_AMOUNT,
  REQUIRED_STAKE,
  REWARD_AMOUNT,
  normalizeValidator
} from "@/lib/contract";
import { slashReasonLabels } from "@/lib/labels";
import { SlashReason, type TimelineItem, type Validator } from "@/lib/types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const RECENT_IDS_KEY = "mock-staking-recent-validator-ids";
const TIMELINE_KEY = "mock-staking-timeline";
type AppMode = "simulator" | "figment";

type FigmentHealth = {
  ok?: boolean;
  mode?: string;
  network?: string;
  baseUrl?: string;
  error?: string;
};

type FigmentRequestResponse = {
  ok?: boolean;
  error?: string;
  details?: unknown;
  validatorIdentifier?: string;
  depositData?: unknown;
  unsignedTransaction?: unknown;
  depositPreview?: DepositPreview;
  raw?: unknown;
};

export default function Home() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [validatorIdInput, setValidatorIdInput] = useState("");
  const [selectedValidatorId, setSelectedValidatorId] = useState<bigint | undefined>();
  const [validator, setValidator] = useState<Validator | undefined>();
  const [currentEpoch, setCurrentEpoch] = useState<bigint>();
  const [withdrawalAddress, setWithdrawalAddress] = useState("");
  const [slashReason, setSlashReason] = useState(SlashReason.DoubleProposal);
  const [pendingAction, setPendingAction] = useState<string>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [recentValidatorIds, setRecentValidatorIds] = useState<string[]>([]);
  const [mode, setMode] = useState<AppMode>("simulator");
  const [numberOfValidators, setNumberOfValidators] = useState(1);
  const [figmentHealth, setFigmentHealth] = useState<FigmentHealth>();
  const [figmentResult, setFigmentResult] = useState<FigmentRequestResponse>();
  const [figmentStatus, setFigmentStatus] = useState<unknown>();
  const [figmentPending, setFigmentPending] = useState<string>();
  const [figmentError, setFigmentError] = useState<string>();
  const [figmentSuccess, setFigmentSuccess] = useState<string>();

  const contractConfigured = MOCK_STAKING_ADDRESS !== ZERO_ADDRESS;

  useEffect(() => {
    setWithdrawalAddress((current) => current || address || "");
  }, [address]);

  useEffect(() => {
    const storedIds = window.localStorage.getItem(RECENT_IDS_KEY);
    const storedTimeline = window.localStorage.getItem(TIMELINE_KEY);
    if (storedIds) setRecentValidatorIds(JSON.parse(storedIds) as string[]);
    if (storedTimeline) setTimeline(JSON.parse(storedTimeline) as TimelineItem[]);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(RECENT_IDS_KEY, JSON.stringify(recentValidatorIds));
  }, [recentValidatorIds]);

  useEffect(() => {
    window.localStorage.setItem(TIMELINE_KEY, JSON.stringify(timeline.slice(0, 25)));
  }, [timeline]);

  const appendTimeline = useCallback((title: string, description: string, hash?: Hash) => {
    setTimeline((items) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp: Date.now(),
        title,
        description,
        hash
      },
      ...items
    ]);
  }, []);

  const refreshEpoch = useCallback(async () => {
    if (!publicClient || !contractConfigured) return;
    const epoch = await publicClient.readContract({
      address: MOCK_STAKING_ADDRESS,
      abi: MOCK_STAKING_ABI,
      functionName: "currentEpoch"
    });
    setCurrentEpoch(epoch);
  }, [contractConfigured, publicClient]);

  const refreshValidator = useCallback(
    async (id = selectedValidatorId) => {
      await refreshEpoch();
      if (!publicClient || id === undefined || !contractConfigured) return;

      try {
        const rawValidator = await publicClient.readContract({
          address: MOCK_STAKING_ADDRESS,
          abi: MOCK_STAKING_ABI,
          functionName: "getValidator",
          args: [id]
        });
        setValidator(normalizeValidator(rawValidator as unknown as readonly unknown[]));
        setSelectedValidatorId(id);
        setValidatorIdInput(id.toString());
      } catch (readError) {
        setValidator(undefined);
        setError(readableError(readError));
      }
    },
    [contractConfigured, publicClient, refreshEpoch, selectedValidatorId]
  );

  useEffect(() => {
    void refreshEpoch();
  }, [refreshEpoch]);

  const rememberValidatorId = useCallback((id: bigint) => {
    const idText = id.toString();
    setRecentValidatorIds((ids) => [idText, ...ids.filter((item) => item !== idText)].slice(0, 6));
  }, []);

  const waitForWrite = useCallback(
    async ({
      action,
      title,
      description,
      write,
      afterReceipt
    }: {
      action: string;
      title: string;
      description: string;
      write: () => Promise<Hash>;
      afterReceipt?: (hash: Hash) => Promise<void>;
    }) => {
      if (!publicClient) {
        setError("No public client is available for this chain.");
        return;
      }
      if (!contractConfigured) {
        setError("Set NEXT_PUBLIC_MOCK_STAKING_ADDRESS before using the dashboard.");
        return;
      }

      setPendingAction(action);
      setError(undefined);
      setSuccess(undefined);

      try {
        const hash = await write();
        appendTimeline(`${title} submitted`, description, hash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("Transaction reverted while mining.");
        if (afterReceipt) await afterReceipt(hash);
        await refreshValidator();
        setSuccess(`${title} confirmed`);
        appendTimeline(title, description, hash);
      } catch (writeError) {
        setError(readableError(writeError));
      } finally {
        setPendingAction(undefined);
      }
    },
    [appendTimeline, contractConfigured, publicClient, refreshValidator]
  );

  const stake = useCallback(async () => {
    if (!isConnected) {
      setError("Connect a wallet before staking.");
      return;
    }
    if (!isAddress(withdrawalAddress)) {
      setError("Enter a valid withdrawal address.");
      return;
    }

    await waitForWrite({
      action: "stake",
      title: "Validator staked",
      description: "Validator staked 0.032 ETH and entered PendingActivation",
      write: () =>
        writeContractAsync({
          address: MOCK_STAKING_ADDRESS,
          abi: MOCK_STAKING_ABI,
          functionName: "stake",
          args: [withdrawalAddress as Address],
          value: REQUIRED_STAKE
        }),
      afterReceipt: async (hash) => {
        if (!publicClient) return;
        const receipt = await publicClient.getTransactionReceipt({ hash });
        const stakedLog = receipt.logs
          .filter((log) => log.address.toLowerCase() === MOCK_STAKING_ADDRESS.toLowerCase())
          .map((log) => {
            try {
              return decodeEventLog({
                abi: MOCK_STAKING_ABI,
                data: log.data,
                topics: log.topics,
                eventName: "ValidatorStaked"
              });
            } catch {
              return undefined;
            }
          })
          .find(Boolean);

        const id = stakedLog?.args.validatorId;
        if (typeof id === "bigint") {
          setSelectedValidatorId(id);
          setValidatorIdInput(id.toString());
          rememberValidatorId(id);
          await refreshValidator(id);
        }
      }
    });
  }, [isConnected, publicClient, refreshValidator, rememberValidatorId, waitForWrite, withdrawalAddress, writeContractAsync]);

  const executeAction = useCallback(
    async (action: ActionName) => {
      if (!isConnected) {
        setError("Connect a wallet before sending transactions.");
        return;
      }
      if ((action !== "advance1" && action !== "advance5") && selectedValidatorId === undefined) {
        setError("Load or create a validator before using this action.");
        return;
      }

      const id = selectedValidatorId ?? 0n;
      const configs = {
        advance1: {
          title: "Epoch advanced",
          description: "Advanced the simulator by 1 epoch",
          args: [1n] as const,
          functionName: "advanceEpoch"
        },
        advance5: {
          title: "Epochs advanced",
          description: "Advanced the simulator by 5 epochs",
          args: [5n] as const,
          functionName: "advanceEpoch"
        },
        activate: {
          title: "Validator activated",
          description: "Validator entered Active status",
          args: [id] as const,
          functionName: "activateValidator"
        },
        reward: {
          title: "Reward applied",
          description: "Reward applied: +0.001 ETH",
          args: [id, REWARD_AMOUNT] as const,
          functionName: "simulateReward",
          value: REWARD_AMOUNT
        },
        penalty: {
          title: "Penalty applied",
          description: "Penalty applied: -0.001 ETH",
          args: [id, PENALTY_AMOUNT] as const,
          functionName: "simulatePenalty"
        },
        exit: {
          title: "Exit requested",
          description: "Validator entered Exiting status",
          args: [id] as const,
          functionName: "requestExit"
        },
        slash: {
          title: "Validator slashed",
          description: `Validator slashed: ${slashReasonLabels[slashReason]}`,
          args: [id, slashReason] as const,
          functionName: "slashValidator"
        },
        markWithdrawable: {
          title: "Validator marked withdrawable",
          description: "Validator entered Withdrawable status",
          args: [id] as const,
          functionName: "markWithdrawable"
        },
        withdraw: {
          title: "Withdrawal completed",
          description: "Validator balance withdrawn to the withdrawal address",
          args: [id] as const,
          functionName: "withdraw"
        }
      }[action];

      await waitForWrite({
        action,
        title: configs.title,
        description: configs.description,
        write: () =>
          writeContractAsync({
            address: MOCK_STAKING_ADDRESS,
            abi: MOCK_STAKING_ABI,
            functionName: configs.functionName,
            args: configs.args,
            value: "value" in configs ? configs.value : undefined
          } as Parameters<typeof writeContractAsync>[0])
      });
    },
    [isConnected, selectedValidatorId, slashReason, waitForWrite, writeContractAsync]
  );

  const loadValidator = useCallback(() => {
    setError(undefined);
    const trimmed = validatorIdInput.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      setError("Enter a numeric validator ID.");
      return;
    }
    void refreshValidator(BigInt(trimmed));
  }, [refreshValidator, validatorIdInput]);

  const checkFigmentHealth = useCallback(async () => {
    setFigmentPending("health");
    setFigmentError(undefined);
    setFigmentSuccess(undefined);
    try {
      const response = await fetch("/api/figment/health", { cache: "no-store" });
      const body = (await response.json()) as FigmentHealth;
      if (!response.ok || !body.ok) throw new Error(body.error || "Figment health check failed.");
      setFigmentHealth(body);
    } catch (healthError) {
      setFigmentHealth(undefined);
      setFigmentError(readableError(healthError));
    } finally {
      setFigmentPending(undefined);
    }
  }, []);

  const requestFigmentValidator = useCallback(async () => {
    setFigmentPending("request");
    setFigmentError(undefined);
    setFigmentSuccess(undefined);

    if (!isAddress(withdrawalAddress)) {
      setFigmentPending(undefined);
      setFigmentError("Enter a valid withdrawal address.");
      return;
    }
    if (!Number.isInteger(numberOfValidators) || numberOfValidators <= 0) {
      setFigmentPending(undefined);
      setFigmentError("numberOfValidators must be greater than 0.");
      return;
    }

    try {
      const response = await fetch("/api/figment/validators/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalAddress, numberOfValidators })
      });
      const body = (await response.json()) as FigmentRequestResponse;
      if (!response.ok || !body.ok) throw new Error(body.error || "Figment validator request failed.");
      setFigmentResult(body);
      setFigmentStatus(undefined);
      setFigmentSuccess("Figment returned validator data for preview.");
    } catch (requestError) {
      setFigmentError(readableError(requestError));
    } finally {
      setFigmentPending(undefined);
    }
  }, [numberOfValidators, withdrawalAddress]);

  const checkFigmentStatus = useCallback(async () => {
    if (!figmentResult?.validatorIdentifier) return;

    setFigmentPending("status");
    setFigmentError(undefined);
    try {
      const params = new URLSearchParams({ validatorIdentifier: figmentResult.validatorIdentifier });
      const response = await fetch(`/api/figment/validators/status?${params.toString()}`, { cache: "no-store" });
      const body = (await response.json()) as { ok?: boolean; error?: string; status?: unknown };
      if (!response.ok || !body.ok) throw new Error(body.error || "Figment validator status lookup failed.");
      setFigmentStatus(body.status);
    } catch (statusError) {
      setFigmentError(readableError(statusError));
    } finally {
      setFigmentPending(undefined);
    }
  }, [figmentResult?.validatorIdentifier]);

  const selectedStatus = validator?.status;
  const pendingStake = pendingAction === "stake";
  const recentOptions = useMemo(() => recentValidatorIds.filter(Boolean), [recentValidatorIds]);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-moss">Ethereum staking lifecycle POC</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal md:text-4xl">Mock Validator Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-ink/70">
            Interact with the demo staking contract and watch a simplified validator move through activation, rewards,
            penalties, exit, slashing, withdrawal delay, and final withdrawal.
          </p>
        </header>

        <div className="space-y-5">
          <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold">Mode</h2>
                <p className="mt-1 text-sm text-ink/70">Switch between the local simulator and Figment Direct Mode.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-md border border-line bg-paper p-1">
                <button
                  type="button"
                  onClick={() => setMode("simulator")}
                  className={`rounded px-4 py-2 text-sm font-semibold ${
                    mode === "simulator" ? "bg-ink text-white" : "text-ink hover:bg-white"
                  }`}
                >
                  Simulator Mode
                </button>
                <button
                  type="button"
                  onClick={() => setMode("figment")}
                  className={`rounded px-4 py-2 text-sm font-semibold ${
                    mode === "figment" ? "bg-ink text-white" : "text-ink hover:bg-white"
                  }`}
                >
                  Figment Direct Mode
                </button>
              </div>
            </div>
          </section>

          <WalletStatus />

          {mode === "figment" ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-rose/25 bg-rose/10 p-4 text-sm font-semibold text-rose">
                No deposit will be sent in Phase B1.
              </div>
              <FigmentConnectionStatus
                health={figmentHealth}
                pending={figmentPending === "health"}
                error={figmentPending === "health" ? undefined : figmentError}
                onCheck={checkFigmentHealth}
              />
              <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
                <div className="space-y-5">
                  <FigmentValidatorRequest
                    withdrawalAddress={withdrawalAddress}
                    connectedAddress={address}
                    numberOfValidators={numberOfValidators}
                    pending={figmentPending === "request"}
                    error={figmentPending === "request" ? figmentError : undefined}
                    success={figmentSuccess}
                    onWithdrawalAddressChange={setWithdrawalAddress}
                    onNumberOfValidatorsChange={setNumberOfValidators}
                    onRequest={requestFigmentValidator}
                  />
                  <FigmentValidatorStatus
                    validatorIdentifier={figmentResult?.validatorIdentifier}
                    status={figmentStatus}
                    pending={figmentPending === "status"}
                    error={figmentPending === "status" ? figmentError : undefined}
                    onCheck={checkFigmentStatus}
                  />
                </div>
                <FigmentDepositPreview
                  depositData={figmentResult?.depositData}
                  unsignedTransaction={figmentResult?.unsignedTransaction}
                  preview={figmentResult?.depositPreview}
                />
              </div>
            </div>
          ) : (
            <>
              <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <label className="flex-1 text-sm font-medium">
                    Validator ID
                    <input
                      value={validatorIdInput}
                      onChange={(event) => setValidatorIdInput(event.target.value)}
                      placeholder="0"
                      className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-sky"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={loadValidator}
                    disabled={!contractConfigured}
                    className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:bg-line disabled:text-ink/45"
                  >
                    Load Validator
                  </button>
                  {recentOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {recentOptions.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setValidatorIdInput(id);
                            void refreshValidator(BigInt(id));
                          }}
                          className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-sky"
                        >
                          #{id}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>

              <ValidatorFlow status={selectedStatus} />

              <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
                <div className="space-y-5">
                  <StakePanel
                    withdrawalAddress={withdrawalAddress}
                    connectedAddress={address}
                    disabled={!isConnected || !contractConfigured}
                    pending={pendingStake}
                    onWithdrawalAddressChange={setWithdrawalAddress}
                    onStake={stake}
                  />
                  <ValidatorDetails validator={validator} validatorId={selectedValidatorId} currentEpoch={currentEpoch} />
                </div>

                <div className="space-y-5">
                  <ActionPanel
                    connected={isConnected && contractConfigured}
                    selected={selectedValidatorId !== undefined && validator !== undefined}
                    status={selectedStatus}
                    pendingAction={pendingAction}
                    slashReason={slashReason}
                    error={contractConfigured ? error : "Set NEXT_PUBLIC_MOCK_STAKING_ADDRESS to your deployed contract."}
                    success={success}
                    onSlashReasonChange={setSlashReason}
                    onAction={executeAction}
                  />
                  <EventTimeline items={timeline} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function readableError(error: unknown) {
  if (error instanceof Error) return error.message.split("\n")[0];
  return "Transaction failed.";
}
