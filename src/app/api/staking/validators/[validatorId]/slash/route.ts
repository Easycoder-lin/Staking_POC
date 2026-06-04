import { mockProviderErrorResponse, slashMockValidator } from "@/lib/mock-staking-provider";

export async function POST(request: Request, { params }: { params: Promise<{ validatorId: string }> }) {
  try {
    const { validatorId } = await params;
    const body = (await request.json().catch(() => ({}))) as { slashReason?: string };
    return Response.json({ ok: true, validator: await slashMockValidator(validatorId, body.slashReason) });
  } catch (error) {
    return mockProviderErrorResponse(error);
  }
}
