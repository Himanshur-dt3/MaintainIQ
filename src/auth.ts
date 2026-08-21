import type { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import prisma from "@/src/server/db/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(256),
});

/**
 * Resolves the correct post-authentication workspace for a user role.
 *
 * @param role - The authenticated user's persisted role.
 * @returns The role-specific application route.
 */
export function getRoleHomePath(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "TECHNICIAN":
      return "/technician";
    case "REPORTER":
      return "/reporter";
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "name@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const parsedCredentials = credentialsSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsedCredentials.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
          },
        });

        if (!user) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          parsedCredentials.data.password,
          user.passwordHash,
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
  if (
    session.user &&
    typeof token.id === "string" &&
    typeof token.role === "string"
  ) {
    session.user.id = token.id;
    session.user.role = token.role as Role;
  }

  return session;
},
  },
});

