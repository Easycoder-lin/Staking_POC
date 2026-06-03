"use client";

export function FigmentValidatorStatus({
  validatorIdentifier,
  status,
  pending,
  error,
  onCheck
}: {
  validatorIdentifier?: string;
  status?: unknown;
  pending: boolean;
  error?: string;
  onCheck: () => void;
}) {
  if (!validatorIdentifier && status === undefined) return null;

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Figment Validator Status</h2>
          <p className="mt-1 break-all font-mono text-xs text-ink/70">{validatorIdentifier || "Identifier unavailable"}</p>
        </div>
        <button
          type="button"
          onClick={onCheck}
          disabled={pending || !validatorIdentifier}
          className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:bg-line disabled:text-ink/45"
        >
          {pending ? "Checking..." : "Check Status"}
        </button>
      </div>

      <pre className="mt-4 max-h-72 overflow-auto rounded-md border border-line bg-ink p-3 text-xs text-white">
        {status === undefined ? "No status loaded yet" : JSON.stringify(status, null, 2)}
      </pre>
      {error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
    </section>
  );
}
