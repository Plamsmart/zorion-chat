import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabase, response } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esLogin = request.nextUrl.pathname === "/admin/login";

  if (!user && !esLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (user && esLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/bots";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
