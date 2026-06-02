import type { LineIdentity } from "@/lib/keycloak";

type LineVerifyResponse = {
  iss?: string;
  sub?: string;
  aud?: string;
  exp?: number;
  name?: string;
  picture?: string;
  email?: string;
  error?: string;
  error_description?: string;
};

export class LineRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LineRequestError";
    this.status = status;
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export async function verifyLineIdToken(
  idToken: string,
): Promise<LineIdentity> {
  const channelId = requiredEnv("LINE_LOGIN_CHANNEL_ID");
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: channelId,
    }),
  });
  const body = (await response.json()) as LineVerifyResponse;

  if (!response.ok) {
    throw new LineRequestError(
      body.error_description ?? body.error ?? "LINE token verification failed.",
      response.status,
    );
  }

  if (!body.sub || body.aud !== channelId) {
    throw new LineRequestError("LINE token is invalid.", 401);
  }

  return {
    userId: body.sub,
    displayName: body.name,
    pictureUrl: body.picture,
    email: body.email,
  };
}
