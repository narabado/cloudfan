import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin-login") return NextResponse.next();
  if (pathname.startsWith("/admin")) {
    const auth = request.cookies.get("admin_auth")?.value;
    if (auth !== "NBD3890") {
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};