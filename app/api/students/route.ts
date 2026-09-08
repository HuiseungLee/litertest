import { NextResponse } from "next/server";
import { authAdmin, requireRole, rest } from "../_lib/supabase";

export const runtime = "nodejs";

type AdminUser = {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  app_metadata?: { activity_restricted?: boolean; student_grade?: number };
  user_metadata?: { role?: string; real_name?: string; nickname?: string };
  raw_user_meta_data?: { role?: string; real_name?: string; nickname?: string };
};

export async function GET(request: Request) {
  try {
    await requireRole(request, "teacher");
    const [profilesResponse, usersResponse, commentsResponse, worksResponse] = await Promise.all([
      rest("profiles?role=eq.student&select=id,display_name,real_name,nickname,created_at"),
      authAdmin("users?page=1&per_page=1000"),
      rest("work_comments?author_role=eq.student&select=id,user_id,work_id,parent_id,body,created_at"),
      rest("literary_works?select=id,title"),
    ]);
    const profiles = await profilesResponse.json().catch(() => []);
    const usersPayload = await usersResponse.json().catch(() => ({})) as { users?: AdminUser[] } | AdminUser[];
    const comments = await commentsResponse.json().catch(() => []);
    const works = await worksResponse.json().catch(() => []);
    if (!profilesResponse.ok || !usersResponse.ok || !commentsResponse.ok || !worksResponse.ok) throw new Error("학생 활동 현황을 불러오지 못했습니다.");

    const users = Array.isArray(usersPayload) ? usersPayload : (usersPayload.users || []);
    const profileMap = new Map((Array.isArray(profiles) ? profiles : []).map((profile: { id: string }) => [profile.id, profile]));
    const studentIds = new Set<string>([
      ...profileMap.keys(),
      ...users.filter((user) => (user.user_metadata?.role || user.raw_user_meta_data?.role) === "student").map((user) => user.id),
    ]);
    const commentList = Array.isArray(comments) ? comments as Array<{ id: string; user_id: string; work_id: string; parent_id?: string | null; body: string; created_at: string }> : [];
    const workMap = new Map((Array.isArray(works) ? works : []).map((work: { id: string; title?: string }) => [work.id, work.title || "제목 없는 작품"]));
    const result = users.filter((user) => studentIds.has(user.id)).map((user) => {
      const profile = profileMap.get(user.id) as { display_name?: string; real_name?: string; nickname?: string; created_at?: string } | undefined;
      const activity = commentList.filter((comment) => comment.user_id === user.id);
      const lastActivity = activity.reduce<string | null>((latest, item) => !latest || item.created_at > latest ? item.created_at : latest, null);
      return {
        id: user.id,
        email: user.email || "",
        name: profile?.real_name || user.user_metadata?.real_name || user.raw_user_meta_data?.real_name || "",
        nickname: profile?.nickname || profile?.display_name || user.user_metadata?.nickname || user.raw_user_meta_data?.nickname || "학생",
        joinedAt: profile?.created_at || user.created_at || null,
        lastSignInAt: user.last_sign_in_at || null,
        lastActivity,
        postCount: activity.length,
        questionCount: activity.filter((item) => !item.parent_id).length,
        restricted: Boolean(user.app_metadata?.activity_restricted),
        grade: Math.max(1, Math.min(3, Number(user.app_metadata?.student_grade) || 1)),
        activities: activity
          .map((item) => ({ id: item.id, workId: item.work_id, workTitle: workMap.get(item.work_id) || "삭제된 작품", body: item.body, createdAt: item.created_at, type: item.parent_id ? "reply" : "question" }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      };
    }).sort((a, b) => (b.lastActivity || b.joinedAt || "").localeCompare(a.lastActivity || a.joinedAt || ""));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "학생 목록을 불러오지 못했습니다." }, { status: 403 });
  }
}
