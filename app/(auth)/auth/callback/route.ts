import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// GitHub sends the user back here with a one-time code.
// We swap that code for a session cookie, then send them into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
