import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// GitHub sends the user back here with a one-time code.
// We swap that code for a session cookie, then send them into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow relative paths as the post-login destination.
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  // Behind a proxy (Vercel), `request.url` can carry an internal host, which
  // would redirect the user somewhere wrong. Prefer the forwarded host.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base =
    process.env.NODE_ENV === "development" || !forwardedHost
      ? origin
      : `${forwardedProto}://${forwardedHost}`;

  if (!code) {
    return NextResponse.redirect(`${base}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("auth callback: code exchange failed:", error.message);
    return NextResponse.redirect(`${base}/login?error=auth`);
  }

  return NextResponse.redirect(`${base}${next}`);
}
