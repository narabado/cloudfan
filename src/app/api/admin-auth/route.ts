import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  if (password === "NBD3890") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_auth", "NBD3890", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return res;
  }
  return NextResponse.json({ error: "invalid" }, { status: 401 });
}
