import { NextResponse } from "next/server";
import { requireRole, userRest } from "../_lib/supabase";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const student = await requireRole(request, "student");
    const body = await request.json();
    const realName = String(body.realName || "").trim();
    const nickname = String(body.nickname || "").trim();
    if (!realName) throw new Error("이름을 입력해 주세요.");
    if (!nickname || [...nickname].length > 7) throw new Error("닉네임은 1~7글자로 입력해 주세요.");
    const response = await userRest(`profiles?id=eq.${student.id}`, student.token, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ real_name: realName, nickname, display_name: nickname }) });
    const rows = await response.json();
    if (!response.ok || !rows[0]) throw new Error(rows?.message || "내 정보를 저장하지 못했습니다.");
    return NextResponse.json(rows[0]);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "내 정보를 저장하지 못했습니다." }, { status: 403 }); }
}
