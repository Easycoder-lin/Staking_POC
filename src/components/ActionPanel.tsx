"use client";

import { SlashReason, ValidatorStatus } from "@/lib/types";
import { slashReasonLabels, statusLabels } from "@/lib/labels";

export type ActionName =
  | "advance1"
  | "advance5"
  | "activate"
  | "reward"
  | "penalty"
  | "exit"
  | "slash"
  | "markWithdrawable"
  | "withdraw";

export function ActionPanel({
  connected,
  selected,
  status,
  pendingAction,
  slashReason,
  error,
  success,
  onSlashReasonChange,
  onAction
}: {
  connected: boolean;
  selected: boolean;
  status?: ValidatorStatus;
  pendingAction?: string;
  slashReason: SlashReason;
  error?: string;
  success?: string;
  onSlashReasonChange: (reason: SlashReason) => void;
  onAction: (action: ActionName) => void;
}) {
  const activeStatus = status ?? ValidatorStatus.None;
  const needsValidator = !selected;

  const canActivate = selected && activeStatus === ValidatorStatus.PendingActivation;
  const canUseActive = selected && activeStatus === ValidatorStatus.Active;
  const canMarkWithdrawable =
    selected && (activeStatus === ValidatorStatus.Exiting || activeStatus === ValidatorStatus.Slashed);
  const canWithdraw = selected && activeStatus === ValidatorStatus.Withdrawable;

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold">Actions</h2>
      <p className="mt-1 text-sm text-ink/70">
        Buttons are enabled when the selected validator is in the expected state.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <ActionButton
          label="Advance 1 Epoch"
          disabled={!connected}
          pending={pendingAction === "advance1"}
          onClick={() => onAction("advance1")}
        />
        <ActionButton
          label="Advance 5 Epochs"
          disabled={!connected}
          pending={pendingAction === "advance5"}
          onClick={() => onAction("advance5")}
        />
        <ActionButton
          label="Activate Validator"
          disabled={!connected || !canActivate}
          pending={pendingAction === "activate"}
          hint={needsValidator ? "Load a validator first" : `Current: ${statusLabels[activeStatus]}`}
          onClick={() => onAction("activate")}
        />
        <ActionButton
          label="Simulate Reward +0.001 ETH"
          disabled={!connected || !canUseActive}
          pending={pendingAction === "reward"}
          hint="Requires Active"
          onClick={() => onAction("reward")}
        />
        <ActionButton
          label="Simulate Penalty -0.001 ETH"
          disabled={!connected || !canUseActive}
          pending={pendingAction === "penalty"}
          hint="Requires Active"
          onClick={() => onAction("penalty")}
        />
        <ActionButton
          label="Request Exit"
          disabled={!connected || !canUseActive}
          pending={pendingAction === "exit"}
          hint="Requires Active owner"
          onClick={() => onAction("exit")}
        />
      </div>

      <div className="mt-4 rounded-md border border-line bg-paper p-3">
        <label className="block text-sm font-medium">
          Slash Reason
          <select
            value={slashReason}
            onChange={(event) => onSlashReasonChange(Number(event.target.value) as SlashReason)}
            className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sky"
          >
            <option value={SlashReason.DoubleProposal}>{slashReasonLabels[SlashReason.DoubleProposal]}</option>
            <option value={SlashReason.DoubleVote}>{slashReasonLabels[SlashReason.DoubleVote]}</option>
            <option value={SlashReason.SurroundVote}>{slashReasonLabels[SlashReason.SurroundVote]}</option>
          </select>
        </label>
        <ActionButton
          label="Slash Validator"
          disabled={!connected || !canUseActive}
          pending={pendingAction === "slash"}
          hint="Requires Active"
          onClick={() => onAction("slash")}
          className="mt-3 bg-rose hover:bg-rose/90"
        />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <ActionButton
          label="Mark Withdrawable"
          disabled={!connected || !canMarkWithdrawable}
          pending={pendingAction === "markWithdrawable"}
          hint="Requires Exiting or Slashed"
          onClick={() => onAction("markWithdrawable")}
        />
        <ActionButton
          label="Withdraw"
          disabled={!connected || !canWithdraw}
          pending={pendingAction === "withdraw"}
          hint="Requires Withdrawable"
          onClick={() => onAction("withdraw")}
        />
      </div>

      {success ? <p className="mt-4 rounded-md bg-moss/10 p-3 text-sm text-moss">{success}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
    </section>
  );
}

function ActionButton({
  label,
  disabled,
  pending,
  hint,
  className = "bg-ink hover:bg-ink/90",
  onClick
}: {
  label: string;
  disabled: boolean;
  pending: boolean;
  hint?: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || pending}
        className={`w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:bg-line disabled:text-ink/45 ${className}`}
      >
        {pending ? "Pending..." : label}
      </button>
      {disabled && hint ? <p className="mt-1 text-xs text-ink/50">{hint}</p> : null}
    </div>
  );
}
