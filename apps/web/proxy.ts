import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const proxyMiddleware = auth((req) => {
  const { pathname } = req.nextUrl;

  // 1. Bypass Next.js internal assets, static files, and API routes immediately
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth");

  const isPublicRoute = isAuthRoute;

  // 2. If logged in and trying to access auth pages (e.g., /login, /register) or root '/', redirect to /dashboard
  if (isLoggedIn && (isAuthRoute || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 3. If NOT logged in and trying to access a protected page (or root '/'), redirect to /login
  if (!isLoggedIn && !isPublicRoute) {
    const callbackUrl = encodeURIComponent(pathname + req.nextUrl.search);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, req.url)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/v1|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export default proxyMiddleware;
