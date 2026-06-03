"use client";

import type { Address } from "viem";

export function StakePanel({
  withdrawalAddress,
  connectedAddress,
  disabled,
  pending,
  onWithdrawalAddressChange,
  onStake
}: {
  withdrawalAddress: string;
  connectedAddress?: Address;
  disabled: boolean;
  pending: boolean;
  onWithdrawalAddressChange: (value: string) => void;
  onStake: () => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold">Stake</h2>
      <p className="mt-1 text-sm text-ink/70">Create a mock validator by staking exactly 0.032 ETH.</p>

      <label className="mt-4 block text-sm font-medium">
        Withdrawal Address
        <input
          value={withdrawalAddress}
          onChange={(event) => onWithdrawalAddressChange(event.target.value)}
          placeholder={connectedAddress ?? "0x..."}
          className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-sky"
        />
      </label>

      <button
        type="button"
        onClick={onStake}
        disabled={disabled || pending}
        className="mt-4 w-full rounded-md bg-moss px-4 py-2.5 text-sm font-semibold text-white hover:bg-moss/90 disabled:bg-line disabled:text-ink/45"
      >
        {pending ? "Confirming Stake..." : "Stake 0.032 ETH"}
      </button>
    </section>
  );
}
