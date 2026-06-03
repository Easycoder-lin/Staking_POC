"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { MOCK_STAKING_ADDRESS } from "@/lib/contract";

export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Wallet</h2>
          <p className="mt-1 text-sm text-ink/70">
            Connect a wallet on your local Anvil network or deployed demo chain.
          </p>
        </div>
        <ConnectButton />
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <Info label="Address" value={isConnected ? address ?? "-" : "Not connected"} />
        <Info label="Chain" value={chainId ? `Chain ID ${chainId}` : "-"} />
        <Info label="Contract" value={MOCK_STAKING_ADDRESS} mono />
      </div>
    </section>
  );
}

function Info({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-line bg-paper px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-wide text-ink/55">{label}</div>
      <div className={`mt-1 break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
