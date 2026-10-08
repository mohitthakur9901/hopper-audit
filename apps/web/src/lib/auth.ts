import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import { authApi } from "./api";
import type { UserRole } from "@repo/types";

// Helper to refresh expired access tokens via server API
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await authApi.refreshToken(token.refreshToken as string);

    return {
      ...token,
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken ?? token.refreshToken,
      // Default to 1 hour access token lifetime if not specified
      accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "e52e5853be2d714d8ac94c8858370a27338d4fb0cdc88d5ab306a09e3dd476b6",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await authApi.login({
            email: credentials.email as string,
            password: credentials.password as string,
          });

          if (!response || !response.user) {
            return null;
          }

          return {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            role: response.user.role as UserRole,
            accessToken: response.tokens.accessToken,
            refreshToken: response.tokens.refreshToken,
            accessTokenExpiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
          };
        } catch (error) {
          console.error("NextAuth authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        return {
          ...token,
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpiresAt: user.accessTokenExpiresAt,
        };
      }

      // Return previous token if the access token has not expired yet (with 1 minute buffer)
      if (
        token.accessTokenExpiresAt &&
        Date.now() < (token.accessTokenExpiresAt as number) - 60 * 1000
      ) {
        return token;
      }

      // Access token has expired, try to refresh it
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || session.user.id;
        session.user.role = token.role as UserRole;
      }

      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.error = token.error as string;

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});