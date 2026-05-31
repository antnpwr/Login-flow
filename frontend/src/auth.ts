import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

type KeycloakProfile = {
  preferred_username?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      if (profile) {
        const keycloakProfile = profile as KeycloakProfile;
        const realmRoles = keycloakProfile.realm_access?.roles ?? [];
        const clientRoles = Object.values(
          keycloakProfile.resource_access ?? {},
        ).flatMap((resource) => resource.roles ?? []);

        token.username = keycloakProfile.preferred_username;
        token.roles = Array.from(new Set([...realmRoles, ...clientRoles]));
      }

      return token;
    },
    session({ session, token }) {
      session.accessToken =
        typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.user.username =
        typeof token.username === "string" ? token.username : undefined;
      session.user.roles = Array.isArray(token.roles) ? token.roles : [];
      return session;
    },
  },
});
