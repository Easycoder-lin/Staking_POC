"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";

const base =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors h-9 px-3";
const primary = "bg-ink text-white hover:bg-ink/90";
const ghost = "text-ink hover:bg-ink/5";

export function ModeSwitcher() {
  const pathname = usePathname();

  return (
    <div className="grid grid-cols-1 gap-2 rounded-md border border-line bg-paper p-1 sm:grid-cols-3">
      <Link
        href="/mock-provider"
        className={twMerge(base, pathname.includes("/mock-provider") ? primary : ghost)}
      >
        Mock Provider Mode
      </Link>
      <Link href="/simulator" className={twMerge(base, pathname.includes("/simulator") ? primary : ghost)}>
        Simulator Mode
      </Link>
      <Link href="/figment" className={twMerge(base, pathname.includes("/figment") ? primary : ghost)}>
        Figment Direct Mode
      </Link>
    </div>
  );
}