import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { KeycloakRequestError, linkLineIdentityToUser } from "@/lib/keycloak";
import { LineRequestError, verifyLineIdToken } from "@/lib/line";

type LinkLineRequestBody = {
  lineIdToken?: unknown;
};

export async function POST(request: Request) {
  const session = await auth();
  const keycloakUserId = session?.user.keycloakUserId;

  if (!session?.user || !keycloakUserId) {
    return NextResponse.json({ error: "Login is required." }, { status: 401 });
  }

  let body: LinkLineRequestBody;

  try {
    body = (await request.json()) as LinkLineRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid LINE link request." }, { status: 400 });
  }

  const lineIdToken =
    typeof body.lineIdToken === "string" ? body.lineIdToken : "";

  if (!lineIdToken) {
    return NextResponse.json(
      { error: "LINE account token is required." },
      { status: 400 },
    );
  }

  try {
    const lineIdentity = await verifyLineIdToken(lineIdToken);
    const lineInfo = await linkLineIdentityToUser(keycloakUserId, lineIdentity);
    return NextResponse.json({ ok: true, lineInfo });
  } catch (error) {
    if (error instanceof KeycloakRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof LineRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Could not link LINE account." },
      { status: 500 },
    );
  }
}
