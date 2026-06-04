import { MockStakingProvider, mockProviderErrorResponse } from "@/lib/mock-staking-provider";

export async function GET(_request: Request, { params }: { params: Promise<{ validatorId: string }> }) {
  try {
    const { validatorId } = await params;
    const provider = new MockStakingProvider();
    return Response.json({ ok: true, validator: await provider.getValidatorStatus(validatorId) });
  } catch (error) {
    return mockProviderErrorResponse(error);
  }
}
