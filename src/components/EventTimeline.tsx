"use client";

import type { TimelineItem } from "@/lib/types";

export function EventTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold">Activity Log</h2>
      {items.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-line bg-paper p-4 text-sm text-ink/70">
          Submitted transactions and demo state changes will appear here.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-line bg-paper p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <time className="text-xs text-ink/55">{new Date(item.timestamp).toLocaleTimeString()}</time>
              </div>
              <p className="mt-1 text-sm text-ink/70">{item.description}</p>
              {item.hash ? <p className="mt-2 break-all font-mono text-xs text-sky">{item.hash}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
