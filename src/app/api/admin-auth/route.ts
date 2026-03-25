import { NextResponse } from "next/server";

const ADMIN_PASSWORD = "NBD3890";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (password === ADMIN_PASSWORD) {
      const response = NextResponse.json({ ok: true });
      response.cookies.set("admin_auth", "NBD3890", {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60 * 24,
        path: "/",
        sameSite: "lax",
      });
      return response;
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
