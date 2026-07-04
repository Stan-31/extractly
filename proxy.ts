import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth guard — full Supabase session check added in Feature #3
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
