import { figmentErrorResponse, requestFigmentValidators } from "@/lib/figment";

export async function POST(request: Request) {
  try {
    return Response.json({ ok: true, ...(await requestFigmentValidators(await request.json())) });
  } catch (error) {
    return figmentErrorResponse(error);
  }
}
