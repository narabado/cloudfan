import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin-login は通す
  if (pathname.startsWith("/admin-login")) {
    return NextResponse.next();
  }

  // /admin または /admin/* へのアクセスをチェック
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const cookie = request.cookies.get("admin_auth");

    if (!cookie || cookie.value !== "NBD3890") {
      const loginUrl = new URL("/admin-login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
