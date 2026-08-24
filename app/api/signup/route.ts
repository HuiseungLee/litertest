import { NextResponse } from "next/server";
import { userRest } from "../_lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Supabase connection is not configured.");
    const body = await request.json();
    const role = body.role === "teacher" ? "teacher" : "student";
    const realName = String(body.realName || "").trim();
    const nickname = String(body.nickname || "").trim();
    if (!realName || !nickname || [...nickname].length > 7) throw new Error("Enter a name and a nickname of up to 7 characters.");
    if (role === "teacher") {
      const invite = process.env.TEACHER_INVITE_CODE;
      if (!invite) throw new Error("Teacher signup is not configured yet.");
      if (String(body.teacherInviteCode || "") !== invite) throw new Error("The teacher invite code is incorrect.");
    }
    const authResponse = await fetch(`${url}/auth/v1/signup`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ email: body.email, password: body.password, data: { role, real_name: realName, nickname } }) });
    const data = await authResponse.json();
    if (!authResponse.ok) {
      const reason = String(data.msg || data.error_description || "");
      if (/confirmation email/i.test(reason)) throw new Error("가입 확인 이메일을 보내지 못했습니다. 관리자에게 SMTP 설정을 확인해 달라고 알려 주세요.");
      throw new Error(reason || "계정을 만들지 못했습니다.");
    }
    if (data.access_token && data.user?.id) {
      const profileResponse = await userRest("profiles", data.access_token, { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: data.user.id, role, display_name: nickname }) });
      if (!profileResponse.ok && role === "teacher") throw new Error("교사 프로필을 만들지 못했습니다. 관리자에게 문의해 주세요.");
    }
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the account." }, { status: 400 }); }
}
