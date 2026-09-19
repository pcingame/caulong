import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const isDev = process.env.NODE_ENV !== "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials provider can't back database sessions, so the whole app
  // uses JWT sessions. This also happens to be the recommended strategy
  // for serverless (Vercel) deployments since it skips a DB round trip
  // per request. The Prisma adapter still persists User/Account rows.
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Dev-only "log in as any email" shortcut so local testing doesn't
    // require setting up real Google OAuth credentials. Gated on NODE_ENV,
    // which Next.js/Vercel always set to "production" in prod builds —
    // never available outside local dev.
    ...(isDev
      ? [
          Credentials({
            id: "dev-login",
            name: "Dev Login",
            credentials: { email: { label: "Email", type: "email" } },
            async authorize(credentials) {
              const email = typeof credentials?.email === "string" ? credentials.email.trim() : "";
              if (!email) return null;
              const user = await prisma.user.upsert({
                where: { email },
                create: { email, name: email.split("@")[0] },
                update: {},
              });
              return { id: user.id, email: user.email, name: user.name };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
