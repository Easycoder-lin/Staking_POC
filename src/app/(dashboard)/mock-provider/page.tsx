"use client";

import { MockProviderDemo } from "@/components/MockProviderDemo";
import { WalletStatus } from "@/components/WalletStatus";

export default function MockProviderPage() {
  return (
    <>
      <WalletStatus />
      <MockProviderDemo />
    </>
  );
}
