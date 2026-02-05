import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import Email from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { prisma } from "@/src/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Email({
      server: process.env.EMAIL_SERVER ?? "",
      from: process.env.EMAIL_FROM ?? "",
    }),
  ],
  session: { strategy: "database" },
};
