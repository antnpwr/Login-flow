type KeycloakAccessClaims = {
  sub?: string;
  name?: string;
  email?: string;
  preferred_username?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
};

type KeycloakUserRepresentation = {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  attributes?: Record<string, string[]>;
};

type KeycloakFederatedIdentity = {
  identityProvider?: string;
  userId?: string;
  userName?: string;
};

type KeycloakTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export type LineIdentity = {
  userId: string;
  displayName?: string;
  pictureUrl?: string;
  email?: string;
};

export type UserLineInfo = {
  lineLinked: boolean;
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  lineEmail?: string;
};

export type EmbeddedAuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  username?: string;
  roles: string[];
  accessToken: string;
  refreshToken?: string;
  lineLinked: boolean;
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
};

type RegisterUserInput = {
  username: string;
  email: string;
  password: string;
  lineIdentity: LineIdentity;
};

export class KeycloakRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "KeycloakRequestError";
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

function getAdminBaseUrl(): string {
  return requiredEnv("KEYCLOAK_ADMIN_BASE_URL").replace(/\/$/, "");
}

function getAdminRealm(): string {
  return requiredEnv("KEYCLOAK_ADMIN_REALM");
}

function decodeJwtPayload<T>(token: string): T {
  const payload = token.split(".")[1];

  if (!payload) {
    throw new Error("Invalid JWT payload");
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as T;
}

function getRoles(claims: KeycloakAccessClaims): string[] {
  const realmRoles = claims.realm_access?.roles ?? [];
  const clientRoles = Object.values(claims.resource_access ?? {}).flatMap(
    (resource) => resource.roles ?? [],
  );

  return Array.from(new Set([...realmRoles, ...clientRoles]));
}

function getFirstAttribute(
  attributes: Record<string, string[]> | undefined,
  name: string,
): string | undefined {
  return attributes?.[name]?.[0];
}

async function parseKeycloakError(response: Response): Promise<string> {
  const fallback = `Keycloak request failed with status ${response.status}`;

  try {
    const body = (await response.json()) as {
      error?: string;
      errorMessage?: string;
      error_description?: string;
    };

    return body.errorMessage ?? body.error_description ?? body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function loginWithPassword(
  username: string,
  password: string,
): Promise<EmbeddedAuthUser> {
  const response = await fetch(requiredEnv("AUTH_KEYCLOAK_TOKEN_URL"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: requiredEnv("AUTH_KEYCLOAK_ID"),
      client_secret: requiredEnv("AUTH_KEYCLOAK_SECRET"),
      username,
      password,
      scope: "openid profile email",
    }),
  });

  if (!response.ok) {
    throw new KeycloakRequestError(await parseKeycloakError(response), response.status);
  }

  const tokenResponse = (await response.json()) as KeycloakTokenResponse;
  const claims = decodeJwtPayload<KeycloakAccessClaims>(
    tokenResponse.access_token,
  );
  const lineInfo = claims.sub
    ? await getKeycloakUserLineInfo(claims.sub)
    : { lineLinked: false };

  return {
    id: claims.sub ?? username,
    name: claims.name ?? claims.preferred_username ?? username,
    email: claims.email ?? null,
    username: claims.preferred_username ?? username,
    roles: getRoles(claims),
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    lineLinked: lineInfo.lineLinked,
    lineUserId: lineInfo.lineUserId,
    lineDisplayName: lineInfo.lineDisplayName,
    linePictureUrl: lineInfo.linePictureUrl,
  };
}

async function getAdminAccessToken(): Promise<string> {
  const baseUrl = getAdminBaseUrl();
  const realm = getAdminRealm();
  const response = await fetch(
    `${baseUrl}/realms/${realm}/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: requiredEnv("KEYCLOAK_ADMIN_CLIENT_ID"),
        client_secret: requiredEnv("KEYCLOAK_ADMIN_CLIENT_SECRET"),
      }),
    },
  );

  if (!response.ok) {
    throw new KeycloakRequestError(await parseKeycloakError(response), response.status);
  }

  const body = (await response.json()) as { access_token: string };
  return body.access_token;
}

async function keycloakAdminFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAdminAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${getAdminBaseUrl()}/admin/realms/${getAdminRealm()}${path}`, {
    ...init,
    headers,
  });
}

function getUserIdFromLocation(location: string | null): string | null {
  if (!location) return null;
  return location.split("/").filter(Boolean).at(-1) ?? null;
}

async function findUserIdByUsername(username: string): Promise<string | null> {
  const response = await keycloakAdminFetch(
    `/users?username=${encodeURIComponent(username)}&exact=true`,
  );

  if (!response.ok) {
    throw new KeycloakRequestError(await parseKeycloakError(response), response.status);
  }

  const users = (await response.json()) as Array<{ id?: string }>;
  return users[0]?.id ?? null;
}

async function findUserIdByLineUserId(lineUserId: string): Promise<string | null> {
  const response = await keycloakAdminFetch(
    `/users?q=${encodeURIComponent(`line_user_id:${lineUserId}`)}`,
  );

  if (!response.ok) {
    throw new KeycloakRequestError(await parseKeycloakError(response), response.status);
  }

  const users = (await response.json()) as KeycloakUserRepresentation[];
  const matchingUser = users.find(
    (user) => getFirstAttribute(user.attributes, "line_user_id") === lineUserId,
  );

  return matchingUser?.id ?? null;
}

async function assignRealmRole(userId: string, roleName: string): Promise<void> {
  const roleResponse = await keycloakAdminFetch(
    `/roles/${encodeURIComponent(roleName)}`,
  );

  if (!roleResponse.ok) {
    throw new KeycloakRequestError(
      await parseKeycloakError(roleResponse),
      roleResponse.status,
    );
  }

  const role = await roleResponse.json();
  const mappingResponse = await keycloakAdminFetch(
    `/users/${userId}/role-mappings/realm`,
    {
      method: "POST",
      body: JSON.stringify([role]),
    },
  );

  if (!mappingResponse.ok && mappingResponse.status !== 409) {
    throw new KeycloakRequestError(
      await parseKeycloakError(mappingResponse),
      mappingResponse.status,
    );
  }
}

async function setUserPassword(
  userId: string,
  password: string,
): Promise<void> {
  const response = await keycloakAdminFetch(`/users/${userId}/reset-password`, {
    method: "PUT",
    body: JSON.stringify({
      type: "password",
      value: password,
      temporary: false,
    }),
  });

  if (!response.ok) {
    throw new KeycloakRequestError(await parseKeycloakError(response), response.status);
  }
}

async function deleteKeycloakUser(userId: string): Promise<void> {
  const response = await keycloakAdminFetch(`/users/${userId}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 404) {
    throw new KeycloakRequestError(await parseKeycloakError(response), response.status);
  }
}

async function getKeycloakUser(userId: string): Promise<KeycloakUserRepresentation> {
  const response = await keycloakAdminFetch(`/users/${userId}`);

  if (!response.ok) {
    throw new KeycloakRequestError(await parseKeycloakError(response), response.status);
  }

  return (await response.json()) as KeycloakUserRepresentation;
}

async function getFederatedIdentities(
  userId: string,
): Promise<KeycloakFederatedIdentity[]> {
  const response = await keycloakAdminFetch(`/users/${userId}/federated-identity`);

  if (!response.ok) {
    throw new KeycloakRequestError(await parseKeycloakError(response), response.status);
  }

  return (await response.json()) as KeycloakFederatedIdentity[];
}

async function setLineAttributes(
  userId: string,
  lineIdentity: LineIdentity,
): Promise<void> {
  const user = await getKeycloakUser(userId);
  const attributes = {
    ...(user.attributes ?? {}),
    line_user_id: [lineIdentity.userId],
    line_display_name: [lineIdentity.displayName ?? ""],
    line_picture_url: [lineIdentity.pictureUrl ?? ""],
    line_email: [lineIdentity.email ?? ""],
    line_linked_at: [new Date().toISOString()],
  };

  const response = await keycloakAdminFetch(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({
      ...user,
      attributes,
    }),
  });

  if (!response.ok) {
    throw new KeycloakRequestError(await parseKeycloakError(response), response.status);
  }
}

export async function getKeycloakUserLineInfo(
  userId: string,
): Promise<UserLineInfo> {
  const [user, federatedIdentities] = await Promise.all([
    getKeycloakUser(userId),
    getFederatedIdentities(userId),
  ]);
  const lineFederatedIdentity = federatedIdentities.find(
    (identity) => identity.identityProvider === "line",
  );
  const lineUserId =
    lineFederatedIdentity?.userId ??
    getFirstAttribute(user.attributes, "line_user_id");

  if (!lineUserId) {
    return { lineLinked: false };
  }

  return {
    lineLinked: true,
    lineUserId,
    lineDisplayName:
      getFirstAttribute(user.attributes, "line_display_name") ??
      lineFederatedIdentity?.userName,
    linePictureUrl: getFirstAttribute(user.attributes, "line_picture_url"),
    lineEmail: getFirstAttribute(user.attributes, "line_email"),
  };
}

export async function linkLineIdentityToUser(
  userId: string,
  lineIdentity: LineIdentity,
): Promise<UserLineInfo> {
  const existingUserId = await findUserIdByLineUserId(lineIdentity.userId);

  if (existingUserId && existingUserId !== userId) {
    throw new KeycloakRequestError(
      "This LINE account is already linked to another user.",
      409,
    );
  }

  const federatedIdentities = await getFederatedIdentities(userId);
  const existingLineIdentity = federatedIdentities.find(
    (identity) => identity.identityProvider === "line",
  );

  if (
    existingLineIdentity?.userId &&
    existingLineIdentity.userId !== lineIdentity.userId
  ) {
    throw new KeycloakRequestError(
      "This user is already linked to a different LINE account.",
      409,
    );
  }

  if (!existingLineIdentity) {
    const response = await keycloakAdminFetch(
      `/users/${userId}/federated-identity/line`,
      {
        method: "POST",
        body: JSON.stringify({
          identityProvider: "line",
          userId: lineIdentity.userId,
          userName: lineIdentity.displayName ?? lineIdentity.userId,
        }),
      },
    );

    if (response.status === 404) {
      throw new KeycloakRequestError(
        "Keycloak identity provider alias 'line' is missing.",
        500,
      );
    }

    if (!response.ok && response.status !== 409) {
      throw new KeycloakRequestError(await parseKeycloakError(response), response.status);
    }
  }

  await setLineAttributes(userId, lineIdentity);
  return getKeycloakUserLineInfo(userId);
}

export async function createKeycloakUser({
  username,
  email,
  password,
  lineIdentity,
}: RegisterUserInput): Promise<void> {
  const existingUserId = await findUserIdByLineUserId(lineIdentity.userId);

  if (existingUserId) {
    throw new KeycloakRequestError(
      "This LINE account is already linked to another user.",
      409,
    );
  }

  const response = await keycloakAdminFetch("/users", {
    method: "POST",
    body: JSON.stringify({
      username,
      email,
      firstName: username,
      lastName: "User",
      enabled: true,
      emailVerified: true,
    }),
  });

  if (response.status === 409) {
    throw new KeycloakRequestError("Username or email is already in use.", 409);
  }

  if (!response.ok) {
    throw new KeycloakRequestError(await parseKeycloakError(response), response.status);
  }

  const userId =
    getUserIdFromLocation(response.headers.get("Location")) ??
    (await findUserIdByUsername(username));

  if (!userId) {
    throw new KeycloakRequestError("Created user could not be found.", 500);
  }

  try {
    await setUserPassword(userId, password);
    await linkLineIdentityToUser(userId, lineIdentity);
    await assignRealmRole(userId, "user");
  } catch (error) {
    await deleteKeycloakUser(userId);
    throw error;
  }
}
