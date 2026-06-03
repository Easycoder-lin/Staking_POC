"use client";

export type DepositPreview = {
  depositContractAddress?: string;
  calldata?: string;
  valueEth?: string;
  validatorPubkey?: string;
  withdrawalCredentials?: string;
  depositDataRoot?: string;
};

export function FigmentDepositPreview({
  depositData,
  unsignedTransaction,
  preview
}: {
  depositData?: unknown;
  unsignedTransaction?: unknown;
  preview?: DepositPreview;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold">Deposit Transaction Preview</h2>
      <p className="mt-1 text-sm font-semibold text-rose">
        Phase B1 only previews the deposit transaction. It does not send 32 Hoodi ETH.
      </p>

      <div className="mt-4 grid gap-3 text-sm">
        <PreviewRow label="Deposit Contract" value={preview?.depositContractAddress} />
        <PreviewRow label="Calldata" value={preview?.calldata} mono />
        <PreviewRow label="Value" value={`${preview?.valueEth || "32"} ETH`} />
        <PreviewRow label="Validator Pubkey" value={preview?.validatorPubkey} mono />
        <PreviewRow label="Withdrawal Credentials" value={preview?.withdrawalCredentials} mono />
        <PreviewRow label="Deposit Data Root" value={preview?.depositDataRoot} mono />
      </div>

      <JsonBlock title="Returned depositData" value={depositData} />
      <JsonBlock title="Returned unsignedTransaction" value={unsignedTransaction} />
    </section>
  );
}

function PreviewRow({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-line bg-paper px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-wide text-ink/55">{label}</div>
      <div className={`mt-1 break-all ${mono ? "font-mono text-xs" : "text-sm"}`}>{value || "Not returned yet"}</div>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value?: unknown }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-line bg-ink p-3 text-xs text-white">
        {value === undefined ? "Not returned yet" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
