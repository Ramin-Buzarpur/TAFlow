import type { DefaultSession } from "next-auth";
import type { GlobalRole, UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      globalRole: GlobalRole;
      status: UserStatus;
      timezone: string;
    } & DefaultSession["user"];
  }

  interface User {
    globalRole?: GlobalRole;
    status?: UserStatus;
    timezone?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    globalRole?: GlobalRole;
    status?: UserStatus;
    timezone?: string;
  }
}
