import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { getOrCreateWorkspace, getWorkspaceId } from "./workspace";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      workspaceId: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  events: {
    async createUser({ user }) {
      if (user.id) {
        try {
          await getOrCreateWorkspace(user.id, user.name);
        } catch (err) {
          // Non-fatal: workspace can be created on next sign-in
          console.error("[auth] Failed to create workspace for new user:", err);
        }
      }
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        try {
          session.user.workspaceId = await getWorkspaceId(user.id);
        } catch {
          session.user.workspaceId = null;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "database",
  },
});
