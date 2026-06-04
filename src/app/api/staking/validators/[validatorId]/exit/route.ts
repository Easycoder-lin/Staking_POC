import { MockStakingProvider, mockProviderErrorResponse } from "@/lib/mock-staking-provider";

export async function POST(_request: Request, { params }: { params: Promise<{ validatorId: string }> }) {
  try {
    const { validatorId } = await params;
    const provider = new MockStakingProvider();
    return Response.json({ ok: true, ...(await provider.requestExit(validatorId)) });
  } catch (error) {
    return mockProviderErrorResponse(error);
  }
}
