import { NextResponse } from "next/server";
import { requireRole, updateUserMetadata, userRest } from "../_lib/supabase";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const student = await requireRole(request, "student");
    const body = await request.json();
    const realName = String(body.realName || "").trim();
    const nickname = String(body.nickname || "").trim();
    if (!realName) throw new Error("이름을 입력해 주세요.");
    if (!nickname || [...nickname].length > 7) throw new Error("닉네임은 1~7글자로 입력해 주세요.");
    let response = await userRest(`profiles?id=eq.${student.id}`, student.token, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ real_name: realName, nickname, display_name: nickname }) });
    let rows = await response.json();
    if (!response.ok && JSON.stringify(rows).includes("nickname")) {
      response = await userRest(`profiles?id=eq.${student.id}`, student.token, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ display_name: nickname }) });
      rows = await response.json();
    }
    await updateUserMetadata(student.token, { real_name: realName, nickname });
    const attemptsResponse = await userRest(`quiz_attempts?student_id=eq.${student.id}&select=id,answers`, student.token);
    if (attemptsResponse.ok) {
      const attempts = await attemptsResponse.json() as Array<{ id?: string; answers?: Record<string, unknown> }>;
      await Promise.all(attempts.filter((attempt) => attempt.id).map((attempt) => userRest(`quiz_attempts?id=eq.${attempt.id}&student_id=eq.${student.id}`, student.token, { method: "PATCH", body: JSON.stringify({ answers: { ...(attempt.answers || {}), __studentProfile: { realName, nickname } } }) })));
    }
    if (!response.ok || !rows[0]) return NextResponse.json({ saved: true, profileSynced: false, real_name: realName, nickname });
    if (!response.ok || !rows[0]) throw new Error(rows?.message || "내 정보를 저장하지 못했습니다.");
    await updateUserMetadata(student.token, { real_name: realName, nickname });
    return NextResponse.json(rows[0]);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "내 정보를 저장하지 못했습니다." }, { status: 403 }); }
}
