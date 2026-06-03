"use client";

type FigmentHealth = {
  ok?: boolean;
  mode?: string;
  network?: string;
  baseUrl?: string;
  error?: string;
};

export function FigmentConnectionStatus({
  health,
  pending,
  error,
  onCheck
}: {
  health?: FigmentHealth;
  pending: boolean;
  error?: string;
  onCheck: () => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Figment Connection</h2>
          <p className="mt-1 text-sm text-ink/70">Hoodi is the default network for Phase B1.</p>
        </div>
        <button
          type="button"
          onClick={onCheck}
          disabled={pending}
          className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:bg-line disabled:text-ink/45"
        >
          {pending ? "Checking..." : "Check Figment Health"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <Info label="Mode" value={health?.mode || "live"} />
        <Info label="Network" value={health?.network || "hoodi"} />
        <Info label="Base URL" value={health?.baseUrl || "-"} mono />
      </div>

      {health?.ok ? <p className="mt-4 rounded-md bg-moss/10 p-3 text-sm text-moss">Figment API is reachable.</p> : null}
      {error ? <p className="mt-4 rounded-md bg-rose/10 p-3 text-sm text-rose">{error}</p> : null}
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
