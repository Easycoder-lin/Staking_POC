"use client";

import { formatEth } from "@/lib/contract";
import { slashReasonLabels, statusLabels, statusTone } from "@/lib/labels";
import { ValidatorStatus, type Validator } from "@/lib/types";

export function ValidatorDetails({
  validator,
  validatorId,
  currentEpoch
}: {
  validator?: Validator;
  validatorId?: bigint;
  currentEpoch?: bigint;
}) {
  const status = validator?.status ?? ValidatorStatus.None;

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Validator Details</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(status)}`}>
          {statusLabels[status]}
        </span>
      </div>

      {!validator ? (
        <p className="mt-4 rounded-md border border-dashed border-line bg-paper p-4 text-sm text-ink/70">
          Load an existing validator or stake a new one to view lifecycle details.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 text-sm">
          <Detail label="Validator ID" value={validatorId?.toString() ?? "-"} />
          <Detail label="Owner" value={validator.owner} mono />
          <Detail label="Withdrawal Address" value={validator.withdrawalAddress} mono />
          <Detail label="Balance" value={formatEth(validator.balance)} />
          <Detail label="Activation Epoch" value={validator.activationEpoch.toString()} />
          <Detail label="Exit Epoch" value={validator.exitEpoch.toString()} />
          <Detail label="Withdrawable Epoch" value={validator.withdrawableEpoch.toString()} />
          <Detail label="Slashed" value={validator.slashed ? "Yes" : "No"} />
          <Detail label="Slash Reason" value={slashReasonLabels[validator.slashReason]} />
          <Detail label="Current Epoch" value={currentEpoch?.toString() ?? "-"} />
        </div>
      )}
    </section>
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
