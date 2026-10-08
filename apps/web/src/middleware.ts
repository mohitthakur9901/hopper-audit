import proxyMiddleware from "../proxy";

export default proxyMiddleware;

export const config = {
  matcher: [
    "/((?!api/v1|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
