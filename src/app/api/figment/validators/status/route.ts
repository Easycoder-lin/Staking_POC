import { figmentErrorResponse, getFigmentValidatorStatus } from "@/lib/figment";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return Response.json(
      await getFigmentValidatorStatus({
        validatorIdentifier: url.searchParams.get("validatorIdentifier") || undefined,
        withdrawalAddress: url.searchParams.get("withdrawalAddress") || undefined
      })
    );
  } catch (error) {
    return figmentErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    return Response.json(
      await getFigmentValidatorStatus({
        validatorIdentifier: typeof body.validatorIdentifier === "string" ? body.validatorIdentifier : undefined,
        withdrawalAddress: typeof body.withdrawalAddress === "string" ? body.withdrawalAddress : undefined
      })
    );
  } catch (error) {
    return figmentErrorResponse(error);
  }
}
