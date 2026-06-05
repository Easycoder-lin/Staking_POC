import { ModeSwitcher } from "@/components/ModeSwitcher";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-5 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-moss">Ethereum staking lifecycle POC</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal md:text-3xl">Mock Validator Dashboard</h1>
          </div>
          <ModeSwitcher />
        </header>

        <div className="space-y-4">
          {children}
        </div>
      </div>
    </main>
  );
}
