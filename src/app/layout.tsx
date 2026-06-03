import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import "@rainbow-me/rainbowkit/styles.css";
import "reactflow/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ethereum Staking Lifecycle POC",
  description: "A demo dashboard for a simplified Ethereum validator lifecycle simulator."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
