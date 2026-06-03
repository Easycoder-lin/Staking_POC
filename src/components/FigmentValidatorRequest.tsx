"use client";

import type { Address } from "viem";

export function FigmentValidatorRequest({
  withdrawalAddress,
  connectedAddress,
  numberOfValidators,
  pending,
  error,
  success,
  onWithdrawalAddressChange,
  onNumberOfValidatorsChange,
  onRequest
}: {
  withdrawalAddress: string;
  connectedAddress?: Address;
  numberOfValidators: number;
  pending: boolean;
  error?: string;
  success?: string;
  onWithdrawalAddressChange: (value: string) => void;
  onNumberOfValidatorsChange: (value: number) => void;
  onRequest: () => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold">Request Validator Data</h2>
      <p className="mt-1 text-sm text-ink/70">
        This asks Figment for validator provisioning data. It does not send a deposit transaction.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px]">
        <label className="block text-sm font-medium">
          Withdrawal Address
          <input
            value={withdrawalAddress}
            onChange={(event) => onWithdrawalAddressChange(event.target.value)}
            placeholder={connectedAddress ?? "0x..."}
            className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-sky"
          />
        </label>
        <label className="block text-sm font-medium">
          Validators
          <input
            type="number"
            min={1}
            value={numberOfValidators}
            onChange={(event) => onNumberOfValidatorsChange(Number(event.target.value))}
            className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-sky"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onRequest}
        disabled={pending}
        className="mt-4 w-full rounded-md bg-moss px-4 py-2.5 text-sm font-semibold text-white hover:bg-moss/90 disabled:bg-line disabled:text-ink/45"
      >
        {pending ? "Requesting..." : "Request Figment Validator Data"}
      </button>

      {success ? <p className="mt-4 rounded-md bg-moss/10 p-3 text-sm text-moss">{success}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
    </section>
  );
}
