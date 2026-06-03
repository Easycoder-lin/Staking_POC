import { figmentErrorResponse, figmentHealth } from "@/lib/figment";

export async function GET() {
  try {
    return Response.json(await figmentHealth());
  } catch (error) {
    return figmentErrorResponse(error);
  }
}
