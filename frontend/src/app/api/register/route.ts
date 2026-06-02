import { NextResponse } from "next/server";
import { createKeycloakUser, KeycloakRequestError } from "@/lib/keycloak";

type RegisterRequestBody = {
  username?: unknown;
  email?: unknown;
  password?: unknown;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRegisterBody(body: RegisterRequestBody) {
  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (username.length < 3) {
    return { error: "Username must be at least 3 characters." };
  }

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  return { username, email, password };
}

export async function POST(request: Request) {
  let body: RegisterRequestBody;

  try {
    body = (await request.json()) as RegisterRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid registration request." },
      { status: 400 },
    );
  }

  const validated = validateRegisterBody(body);

  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    await createKeycloakUser(validated);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof KeycloakRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Could not create account." },
      { status: 500 },
    );
  }
}
