"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { anvil, hardhat, localhost, sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Ethereum Staking Lifecycle POC",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo",
  chains: [anvil, localhost, hardhat, sepolia],
  ssr: true
});
