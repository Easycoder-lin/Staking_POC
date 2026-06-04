import { getAvailableStakingProviders } from "@/lib/staking-provider";

export async function GET() {
  return Response.json({
    ok: true,
    defaultProvider: process.env.DEFAULT_STAKING_PROVIDER || "mock",
    defaultNetwork: process.env.DEFAULT_STAKING_NETWORK || "hoodi",
    providers: getAvailableStakingProviders()
  });
}
