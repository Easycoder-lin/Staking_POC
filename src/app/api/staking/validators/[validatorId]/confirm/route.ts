import { confirmMockStake, mockProviderErrorResponse } from "@/lib/mock-staking-provider";

export async function POST(_request: Request, { params }: { params: Promise<{ validatorId: string }> }) {
  try {
    const { validatorId } = await params;
    return Response.json({ ok: true, validator: await confirmMockStake(validatorId) });
  } catch (error) {
    return mockProviderErrorResponse(error);
  }
}
