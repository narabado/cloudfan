import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ログインページは常に通す
  if (pathname === "/admin-login") return NextResponse.next();

  // /admin で始まるすべてのパスを保護
  if (pathname.startsWith("/admin")) {
    const auth = request.cookies.get("admin_auth")?.value;
    if (auth !== "NBD3890") {
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],  // ← /admin も追加！
};
