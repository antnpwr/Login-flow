import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  getKeycloakUserLineInfo,
  loginWithPassword,
  type EmbeddedAuthUser,
  type UserLineInfo,
} from "@/lib/keycloak";

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
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (isEmbeddedAuthUser(user)) {
        token.keycloakUserId = user.id;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.username = user.username;
        token.roles = user.roles;
        token.lineLinked = user.lineLinked;
        token.lineUserId = user.lineUserId;
        token.lineDisplayName = user.lineDisplayName;
        token.linePictureUrl = user.linePictureUrl;
      }

      return token;
    },
    async session({ session, token }) {
      let lineInfo: UserLineInfo = {
        lineLinked:
          typeof token.lineLinked === "boolean" ? token.lineLinked : false,
        lineUserId:
          typeof token.lineUserId === "string" ? token.lineUserId : undefined,
        lineDisplayName:
          typeof token.lineDisplayName === "string"
            ? token.lineDisplayName
            : undefined,
        linePictureUrl:
          typeof token.linePictureUrl === "string"
            ? token.linePictureUrl
            : undefined,
      };

      if (typeof token.keycloakUserId === "string") {
        try {
          lineInfo = await getKeycloakUserLineInfo(token.keycloakUserId);
        } catch {
          lineInfo = {
            lineLinked: false,
          };
        }
      }

      session.user.keycloakUserId =
        typeof token.keycloakUserId === "string"
          ? token.keycloakUserId
          : undefined;
      session.accessToken =
        typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.refreshToken =
        typeof token.refreshToken === "string" ? token.refreshToken : undefined;
      session.user.username =
        typeof token.username === "string" ? token.username : undefined;
      session.user.roles = Array.isArray(token.roles) ? token.roles : [];
      session.user.lineLinked = lineInfo.lineLinked;
      session.user.lineUserId = lineInfo.lineUserId;
      session.user.lineDisplayName = lineInfo.lineDisplayName;
      session.user.linePictureUrl = lineInfo.linePictureUrl;
      return session;
    },
  },
});
