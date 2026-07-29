import { NextResponse } from "next/server";
import { currentUser } from "../_lib/supabase";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await currentUser(request);
  return NextResponse.json({ user: user ? { id: user.id, email: user.email, role: user.role, displayName: user.displayName } : null });
}
