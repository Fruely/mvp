import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  
  const url = new URL("/admin/login", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
