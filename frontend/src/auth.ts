import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Keycloak from "next-auth/providers/keycloak";
import { loginWithPassword, type EmbeddedAuthUser } from "@/lib/keycloak";

type KeycloakProfile = {
  preferred_username?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
};

function getProfileRoles(profile: KeycloakProfile): string[] {
  const realmRoles = profile.realm_access?.roles ?? [];
  const clientRoles = Object.values(profile.resource_access ?? {}).flatMap(
    (resource) => resource.roles ?? [],
  );

  return Array.from(new Set([...realmRoles, ...clientRoles]));
}

function isEmbeddedAuthUser(user: unknown): user is EmbeddedAuthUser {
  return (
    typeof user === "object" &&
    user !== null &&
    "accessToken" in user &&
    typeof (user as EmbeddedAuthUser).accessToken === "string"
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        username: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username;
        const password = credentials?.password;

        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }

        try {
          return await loginWithPassword(username, password);
        } catch {
          return null;
        }
      },
    }),
    Keycloak({
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, account, profile, user }) {
      if (isEmbeddedAuthUser(user)) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.username = user.username;
        token.roles = user.roles;
      }

      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      if (account?.refresh_token) {
        token.refreshToken = account.refresh_token;
      }

      if (profile) {
        const keycloakProfile = profile as KeycloakProfile;
        token.username = keycloakProfile.preferred_username;
        token.roles = getProfileRoles(keycloakProfile);
      }

      return token;
    },
    session({ session, token }) {
      session.accessToken =
        typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.refreshToken =
        typeof token.refreshToken === "string" ? token.refreshToken : undefined;
      session.user.username =
        typeof token.username === "string" ? token.username : undefined;
      session.user.roles = Array.isArray(token.roles) ? token.roles : [];
      return session;
    },
  },
});
