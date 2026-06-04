import { MockStakingProvider, mockProviderErrorResponse } from "@/lib/mock-staking-provider";

export async function POST(request: Request) {
  try {
    const provider = new MockStakingProvider();
    return Response.json({ ok: true, ...(await provider.createStakeRequest(await request.json())) });
  } catch (error) {
    return mockProviderErrorResponse(error);
  }
}
