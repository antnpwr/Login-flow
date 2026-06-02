import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    user: {
      keycloakUserId?: string;
      username?: string;
      roles: string[];
      lineLinked: boolean;
      lineUserId?: string;
      lineDisplayName?: string;
      linePictureUrl?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    keycloakUserId?: string;
    username?: string;
    roles?: string[];
    lineLinked?: boolean;
    lineUserId?: string;
    lineDisplayName?: string;
    linePictureUrl?: string;
  }
}
