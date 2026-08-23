"use client";

import { FormEvent, Fragment, ReactNode, useEffect, useRef, useState } from "react";

type Role = "teacher" | "student" | null;
type User = { id: string; email?: string; role: Role; realName?: string; nickname?: string };
type Annotation = { id: string; phrase: string; note: string; tone: number; start?: number; end?: number; area?: "source" | "modern" };
type Group = "appreciation" | "summary" | "deep";
type ExtraSection = { id: string; group: Group; title: string; content: string };
type EditorBlocks = { modernTranslation: string; modernTranslationHidden?: boolean; authorIntro: string; deepInquiry: string };
type Work = {
  id: string; title: string; author?: string; genre?: string; theme?: string; summary?: string;
  source_text?: string; expression_features?: string; commentary: string; published_at?: string;
  generated_result?: { annotations?: Annotation[]; extraSections?: ExtraSection[]; authorImageUrl?: string; editorBlocks?: EditorBlocks };
};
type WorkComment = { id: string; parent_id?: string | null; user_id: string; author_role: "teacher" | "student"; author_name: string; body: string; created_at: string };

const toneNames = ["파랑", "초록", "주황", "보라", "분홍", "무채색", "연보라", "빨강", "노랑", "청록"];
const emptyBlocks: EditorBlocks = { modernTranslation: "", modernTranslationHidden: false, authorIntro: "", deepInquiry: "" };
const blankForm = { title: "", author: "", genre: "현대시", sourceText: "", theme: "", expressionFeatures: "", summary: "", commentary: "", authorImageUrl: "" };
const legacyMenuItems = [
  { label: "이론", title: "국문학 개론", description: "문학 이론", image: "/literature/iron.webp", href: "/legacy/literature/lironindex.html" },
  { label: "작품", title: "갈래별 작품 목록", description: "다양한 갈래의 문학", image: "/literature/gallae.webp", href: "#genre-library" },
  { label: "작가", title: "작가론", description: "표현론적 관점", image: "/literature/jakga.webp", href: "/legacy/literature/ljakgaronindex.html" },
  { label: "평론", title: "창작과 평론", description: "다양한 문학의 이해", image: "/literature/pyeong.webp", href: "/legacy/literature/larticle.html" },
  { label: "문학사", title: "국문학사", description: "문학사의 흐름", image: "/literature/munhaksa.webp", href: "/legacy/literature/lhistory.html" },
];

function LegacyLiteratureMenu({ legacyBase }: { legacyBase: string }) {
  return <section className="legacy-literature-menu" aria-labelledby="legacy-menu-title">
    <div className="legacy-menu-title" id="legacy-menu-title"><span className="old-korean-title">{"수\uE8A1니기는"}</span><strong>문학 시간</strong></div>
    <div className="legacy-options">
      {legacyMenuItems.map((item, index) => <a className={`legacy-option${index === 0 ? " active" : ""}`} href={item.href.startsWith("#") ? item.href : `${legacyBase}${item.href.replace("/legacy", "")}`} key={item.label} style={{ backgroundImage: `url(${item.image})` }}>
        <span className="legacy-option-shadow" />
        <span className="legacy-option-label"><b>{item.label}</b><span><strong>{item.title}</strong><small>{item.description}</small></span></span>
      </a>)}
    </div>
  </section>;
}

const classicGenres = [
  { icon: "古", label: "고대시가" }, { icon: "花", label: "향가" }, { icon: "歌", label: "고려가요" },
  { icon: "詩", label: "시조" }, { icon: "行", label: "가사" }, { icon: "景", label: "경기체가" },
  { icon: "樂", label: "악장" }, { icon: "傳", label: "가전체" }, { icon: "冊", label: "고소설" }, { icon: "口", label: "구비문학" },
];
const modernGenres = [
  { icon: "詩", label: "현대시" }, { icon: "說", label: "현대소설" }, { icon: "筆", label: "수필" }, { icon: "劇", label: "희곡" },
];

function GenreMenu({ selected, onSelect, legacyBase }: { selected: string; onSelect: (genre: string) => void; legacyBase: string }) {
  const group = (title: string, items: typeof classicGenres) => <section className="genre-group">
    <h3>{title}</h3>
    <div className="genre-buttons">{items.map((item) => <button className={selected === item.label ? "selected" : ""} key={item.label} type="button" onClick={() => onSelect(item.label)} aria-pressed={selected === item.label}>
      <span aria-hidden="true">{item.icon}</span><b>{item.label}</b>
    </button>)}</div>
  </section>;
  return <section className="genre-library" id="genre-library" aria-labelledby="genre-title">
    <div className="genre-title"><p>GENRE ARCHIVE</p><h2 id="genre-title">갈래별 작품 목록</h2><span>갈래를 선택하면 새로 출판된 작품 자료를 모아 볼 수 있습니다.</span></div>
    {group("고전문학", classicGenres)}
    {group("현대문학", modernGenres)}
    <div className="genre-footer"><button type="button" onClick={() => onSelect("")}>모든 출판 작품</button><a href={`${legacyBase}/literature/lgallae.html`}>기존 작품 자료실</a></div>
  </section>;
}

function poem(text: string | undefined, annotations: Annotation[], area: "source" | "modern" = "source") {
  if (!text) return <p className="empty-copy">작품 원문을 입력하거나 불러와 주세요.</p>;
  const phraseOffsets = new Map<string, number>();
  const exact = annotations.filter((item) => (item.area || "source") === area).flatMap((item) => {
    if (Number.isInteger(item.start) && Number.isInteger(item.end) && (item.end || 0) > (item.start || 0)) return [item];
    // Older saved notes had no selection coordinates. Show only one best-match occurrence,
    // never every identical word, until the teacher saves the note again.
    const from = phraseOffsets.get(item.phrase) || 0; const start = text.indexOf(item.phrase, from);
    if (start < 0) return []; phraseOffsets.set(item.phrase, start + item.phrase.length);
    return [{ ...item, start, end: start + item.phrase.length }];
  });
  let cursor = 0;
  return text.split(/\r?\n/).map((line, lineIndex) => {
    const lineStart = cursor; const lineEnd = lineStart + line.length; cursor = lineEnd + 1;
    const matches = exact.filter((item) => (item.start || 0) < lineEnd && (item.end || 0) > lineStart).sort((a, b) => (a.start || 0) - (b.start || 0));
    let position = 0;
    const pieces: ReactNode[] = [];
    matches.forEach((item) => {
      const start = Math.max(0, (item.start || 0) - lineStart); const end = Math.min(line.length, (item.end || 0) - lineStart);
      if (start > position) pieces.push(<Fragment key={`text-${position}`}>{line.slice(position, start)}</Fragment>);
      if (end > start) pieces.push(<mark className={`poetic-term tone-${item.tone % toneNames.length}`} key={item.id} tabIndex={0} onMouseMove={(event) => window.dispatchEvent(new CustomEvent("literary-tooltip", { detail: { note: item.note, tone: item.tone % toneNames.length, x: event.clientX, y: event.clientY } }))} onMouseLeave={() => window.dispatchEvent(new Event("literary-tooltip-hide"))}>{line.slice(start, end)}<span className="term-tooltip">{item.note}</span></mark>);
      position = Math.max(position, end);
    });
    if (position < line.length) pieces.push(<Fragment key={`text-${position}`}>{line.slice(position)}</Fragment>);
    return (
    <p className={`poem-line${line ? "" : " stanza-break"}`} key={`${line}-${lineIndex}`}>
      {pieces.length ? pieces : "\u00a0"}
    </p>);
  });
}

function CursorTooltip() {
  const [tooltip, setTooltip] = useState<{ note: string; tone: number; x: number; y: number }>();
  useEffect(() => {
    const show = (event: Event) => setTooltip((event as CustomEvent<{ note: string; tone: number; x: number; y: number }>).detail);
    const hide = () => setTooltip(undefined);
    window.addEventListener("literary-tooltip", show); window.addEventListener("literary-tooltip-hide", hide);
    return () => { window.removeEventListener("literary-tooltip", show); window.removeEventListener("literary-tooltip-hide", hide); };
  }, []);
  return tooltip ? <div className={`cursor-tooltip tone-${tooltip.tone}`} style={{ left: Math.min(tooltip.x + 16, window.innerWidth - 320), top: Math.min(tooltip.y + 18, window.innerHeight - 100) }}>{tooltip.note}</div> : null;
}

function QandA({ comments, user, value, loading, onChange, onSubmit, onReply, onDelete, onLogin }: { comments: WorkComment[]; user: User | null | undefined; value: string; loading: boolean; onChange: (value: string) => void; onSubmit: (event: FormEvent) => void; onReply: (parentId: string, body: string) => Promise<void>; onDelete: (id: string) => void; onLogin: () => void }) {
  const [replyTo, setReplyTo] = useState(""); const [replyBody, setReplyBody] = useState("");
  const questions = comments.filter((item) => !item.parent_id);
  const date = (value: string) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  return <div className="qna"><p className="qna-intro">작품에 관해 궁금한 점을 질문하고 교사의 답변을 확인할 수 있습니다.</p>{user ? <form className="qna-form" onSubmit={onSubmit}><textarea required maxLength={2000} value={value} onChange={(event) => onChange(event.target.value)} placeholder={user.role === "teacher" ? "작품에 관한 안내를 남겨 주세요." : "작품에 관해 궁금한 점을 질문해 주세요."} /><button className="primary" disabled={loading || !value.trim()}>{loading ? "등록 중…" : user.role === "teacher" ? "댓글 등록" : "질문 등록"}</button></form> : <button type="button" className="qna-login" onClick={onLogin}>로그인하고 질문하기</button>}
    <div className="qna-list">{questions.map((question) => <article className="qna-item" key={question.id}><div className="qna-meta"><b className={question.author_role}>{question.author_role === "teacher" ? "교사" : "학생"}</b><span>{question.author_name}</span><time>{date(question.created_at)}</time>{user && (user.id === question.user_id || user.role === "teacher") && <button type="button" onClick={() => onDelete(question.id)}>삭제</button>}</div><p>{question.body}</p>{comments.filter((item) => item.parent_id === question.id).map((reply) => <div className="qna-reply" key={reply.id}><div className="qna-meta"><b className={reply.author_role}>{reply.author_role === "teacher" ? "교사 답변" : "학생"}</b><span>{reply.author_name}</span><time>{date(reply.created_at)}</time>{user && (user.id === reply.user_id || user.role === "teacher") && <button type="button" onClick={() => onDelete(reply.id)}>삭제</button>}</div><p>{reply.body}</p></div>)}{user?.role === "teacher" && (replyTo === question.id ? <form className="qna-reply-form" onSubmit={async (event) => { event.preventDefault(); if (!replyBody.trim()) return; await onReply(question.id, replyBody); setReplyBody(""); setReplyTo(""); }}><textarea required maxLength={2000} value={replyBody} onChange={(event) => setReplyBody(event.target.value)} placeholder="교사 답변을 입력하세요." /><div><button type="button" onClick={() => setReplyTo("")}>취소</button><button className="primary" disabled={loading}>답변 등록</button></div></form> : <button type="button" className="qna-reply-button" onClick={() => setReplyTo(question.id)}>답변하기</button>)}</article>)}{!questions.length && <p className="empty">아직 등록된 질문이 없습니다.</p>}</div>
  </div>;
}

function Publication({ form, annotations, blocks, extras, publishedAt, discussion, editor, sourceLoading, update, updateBlock, addExtra, removeExtra, updateExtra, removeAnnotation, onChooseImage, onSelectSource, onSelectModern, onAddNote, onSearchSources, onLoadSource, onDeleteModern, onRestoreModern }: {
  form: typeof blankForm; annotations: Annotation[]; blocks: EditorBlocks; extras: ExtraSection[]; editor?: boolean;
  publishedAt?: string; discussion?: ReactNode; sourceLoading?: boolean;
  update?: (key: keyof typeof blankForm, value: string) => void; updateBlock?: (key: keyof EditorBlocks, value: string) => void;
  addExtra?: (group: Group) => void; removeExtra?: (id: string) => void; updateExtra?: (id: string, key: "title" | "content", value: string) => void; removeAnnotation?: (id: string) => void;
  onChooseImage?: (file?: File) => void; onSelectSource?: () => void; onSelectModern?: () => void; onAddNote?: (area: "source" | "modern") => void; onSearchSources?: () => void; onLoadSource?: () => void; onDeleteModern?: () => void; onRestoreModern?: () => void;
}) {
  const imageInput = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const page = pageRef.current; const body = page?.querySelector<HTMLElement>(".literature-body");
    if (!body) return;
    const align = () => {
      const links = Array.from(body.querySelectorAll<HTMLAnchorElement>(".section-rail a"));
      ["appreciation", "summary", "deep", "check"].forEach((id, index) => {
        const section = body.querySelector<HTMLElement>(`#${id}`); const link = links[index];
        if (section && link) link.style.top = `${section.offsetTop}px`;
      });
    };
    const frame = requestAnimationFrame(align); const observer = new ResizeObserver(align); observer.observe(body); window.addEventListener("resize", align);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", align); };
  }, [form.sourceText, form.theme, form.expressionFeatures, blocks.modernTranslation, blocks.modernTranslationHidden, blocks.authorIntro, blocks.deepInquiry, extras, annotations]);
  const editableText = (key: keyof typeof blankForm, value: string, placeholder: string, className = "") => editor
    ? <input className={`publication-input ${className}`} value={value} onChange={(e) => update?.(key, e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    : <>{value || placeholder}</>;
  const editableBlock = (key: keyof EditorBlocks, value: string, placeholder: string) => editor
    ? <textarea className="section-editor" value={value} onChange={(e) => updateBlock?.(key, e.target.value)} placeholder={placeholder} />
    : <p className="section-copy">{value || "내용이 아직 등록되지 않았습니다."}</p>;
  const extra = (group: Group) => extras.filter((item) => item.group === group).map((item) => <div className="extra-block" key={item.id}>
    {editor ? <input value={item.title} aria-label="하위 항목 제목" onChange={(e) => updateExtra?.(item.id, "title", e.target.value)} /> : <h3>{item.title}</h3>}
    {editor ? <textarea value={item.content} aria-label="하위 항목 내용" onChange={(e) => updateExtra?.(item.id, "content", e.target.value)} /> : <p className="section-copy">{item.content}</p>}
    {editor && <button type="button" className="delete-inline" onClick={() => removeExtra?.(item.id)}>삭제</button>}
  </div>);
  const add = (group: Group) => editor && <button type="button" className="add-inline" onClick={() => addExtra?.(group)}>+ 하위 목록 추가</button>;
  const annotationManager = (area: "source" | "modern") => editor && <div className="annotation-manager inline-annotation-manager"><h4>{area === "source" ? "작품 원문 각주" : "현대어 풀이 각주"}</h4>{annotations.filter((item) => (item.area || "source") === area).length ? <ul>{annotations.filter((item) => (item.area || "source") === area).map((item) => <li key={item.id}><span className={`tone-${item.tone}`}>{item.phrase}</span><button type="button" onClick={() => removeAnnotation?.(item.id)}>이 각주 삭제</button></li>)}</ul> : <p>추가된 각주가 없습니다.</p>}</div>;
  const publishedDate = publishedAt ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "numeric", day: "numeric" }).format(new Date(publishedAt)) : "";
  return <><CursorTooltip /><article ref={pageRef} className={`published-page ${editor ? "publication-editor" : ""}`}>
    <div className="literature-header">
      <div className="genre-pill">{editor ? editableText("genre", form.genre, "갈래") : form.genre}</div>
      <div className={`author-portrait ${editor ? "is-drop-target" : ""}`} onClick={() => editor && imageInput.current?.click()} onDragOver={(e) => { if (editor) e.preventDefault(); }} onDrop={(e) => { if (editor) { e.preventDefault(); onChooseImage?.(e.dataTransfer.files[0]); } }}>
        {form.authorImageUrl ? <img src={form.authorImageUrl} alt="작가 이미지" /> : <span>{editor ? "이미지를 끌어 놓거나 클릭" : (form.author || "작가").slice(0, 1)}</span>}
        {editor && <input ref={imageInput} hidden type="file" accept="image/*" onChange={(e) => onChooseImage?.(e.target.files?.[0])} />}
      </div>
      <div className="title-block">
        <h1>{editableText("title", form.title, "작품명", "work-title")}</h1>
        <h3>{editableText("author", form.author, "작가명", "work-author")}</h3>
        <hr />
        <p>{editor ? "출판일은 해설을 출판할 때 자동으로 기록됩니다." : (publishedDate ? `출판일 · ${publishedDate}` : "출판일 정보 없음")}</p>
      </div>
    </div>
    <div className="literature-body">
      <aside className="section-rail"><a href="#appreciation">작품 감상</a><a href="#summary">작품 정리</a><a href="#deep">심화 감상</a>{discussion && <a href="#check">Q&amp;A</a>}</aside>
      <div className="literature-content">
        <section id="appreciation" className="literature-section"><div className="section-rule" /><article>
          <h3>작품 원문</h3>
          {editor ? <><label className="source-label">작품 원문 또는 발췌 <span><button type="button" onClick={onSearchSources}>인터넷 원문 검색</button><button type="button" disabled={sourceLoading} onClick={onLoadSource}>{sourceLoading ? "AI 원문 불러오는 중…" : "AI 원문 불러오기"}</button></span></label><textarea className="source-editor" value={form.sourceText} onChange={(e) => update?.("sourceText", e.target.value)} onSelect={onSelectSource} placeholder="원문을 입력하고, 해설할 구절을 드래그해 선택하세요." />
            <div className="annotation-actions"><button type="button" onClick={() => onAddNote?.("source")}>선택한 구절에 각주 달기</button><span>각주가 적용된 모습</span></div><div className="poem editor-poem">{poem(form.sourceText, annotations, "source")}</div>{annotationManager("source")}</> : <div className="poem">{poem(form.sourceText, annotations, "source")}</div>}
          {!blocks.modernTranslationHidden && <><h3>현대어 풀이 {editor && <button type="button" className="remove-section" onClick={onDeleteModern}>현대어 풀이 삭제</button>}</h3>{editor ? <><textarea className="section-editor modern-editor" value={blocks.modernTranslation} onChange={(e) => updateBlock?.("modernTranslation", e.target.value)} onSelect={onSelectModern} placeholder="현대어 풀이를 작성하고 해설할 구절을 드래그해 선택하세요." /><div className="annotation-actions"><button type="button" onClick={() => onAddNote?.("modern")}>선택한 구절에 각주 달기</button><span>현대어 풀이 각주 미리보기</span></div><div className="poem editor-poem">{poem(blocks.modernTranslation, annotations, "modern")}</div>{annotationManager("modern")}</> : <div className="poem">{poem(blocks.modernTranslation, annotations, "modern")}</div>}</>}
          {editor && blocks.modernTranslationHidden && <button type="button" className="add-inline" onClick={onRestoreModern}>+ 현대어 풀이 추가</button>}
          {extra("appreciation")}{add("appreciation")}
        </article></section>
        <section id="summary" className="literature-section"><div className="section-rule" /><article>
          <h3>주제</h3>{editor ? <textarea className="section-editor" value={form.theme} onChange={(e) => update?.("theme", e.target.value)} placeholder="작품의 주제를 작성하세요." /> : <p className="section-copy">{form.theme || "내용이 아직 등록되지 않았습니다."}</p>}
          <h3>작가 소개</h3>{editableBlock("authorIntro", blocks.authorIntro, "작가 소개를 작성하세요.")}
          <h3>표현상의 특징</h3>{editor ? <textarea className="section-editor" value={form.expressionFeatures} onChange={(e) => update?.("expressionFeatures", e.target.value)} placeholder="표현상의 특징을 작성하세요." /> : <p className="section-copy">{form.expressionFeatures || "내용이 아직 등록되지 않았습니다."}</p>}
          {extra("summary")}{add("summary")}
        </article></section>
        <section id="deep" className="literature-section"><div className="section-rule" /><article>
          <h3>심화 탐구</h3>{editableBlock("deepInquiry", blocks.deepInquiry, "심화 탐구 내용을 작성하세요.")}
          {extra("deep")}{add("deep")}
        </article></section>
        {discussion && <section id="check" className="literature-section qna-section"><div className="section-rule" /><article><h3>Q&amp;A</h3>{discussion}</article></section>}
      </div>
    </div>
  </article></>;
}

export default function LiteratureApp({ initialWorkId }: { initialWorkId?: string }) {
  const [user, setUser] = useState<User | null>(); const [token, setToken] = useState("");
  const [screen, setScreen] = useState<"library" | "teacher" | "detail" | "profile" | "account">(initialWorkId ? "detail" : "library"); const [works, setWorks] = useState<Work[]>([]); const [selected, setSelected] = useState<Work>();
  const [form, setForm] = useState(blankForm); const [blocks, setBlocks] = useState(emptyBlocks); const [editingId, setEditingId] = useState(""); const [annotations, setAnnotations] = useState<Annotation[]>([]); const [extras, setExtras] = useState<ExtraSection[]>([]);
  const [selectedPhrase, setSelectedPhrase] = useState(""); const [selection, setSelection] = useState<{ start: number; end: number }>(); const [selectedArea, setSelectedArea] = useState<"source" | "modern">("source"); const [note, setNote] = useState(""); const [tone, setTone] = useState(0); const [noteOpen, setNoteOpen] = useState(false);
  const [query, setQuery] = useState(""); const [category, setCategory] = useState(""); const [categories, setCategories] = useState<string[]>([]); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false); const [activeMenu, setActiveMenu] = useState(""); const [authOpen, setAuthOpen] = useState(false); const [authMessage, setAuthMessage] = useState(""); const [authMode, setAuthMode] = useState<"login" | "signup">("login"); const [signupRole, setSignupRole] = useState<"teacher" | "student">("student"); const [teacherInviteCode, setTeacherInviteCode] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [realName, setRealName] = useState(""); const [nickname, setNickname] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const [sourceLoading, setSourceLoading] = useState(false);
  const [comments, setComments] = useState<WorkComment[]>([]); const [commentText, setCommentText] = useState("");
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "https://lhsstart.synology.me";
  const genreOptions = [...new Set([...classicGenres, ...modernGenres].map((item) => item.label).concat(categories))];
  const headers = () => ({ "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) });
  const update = (key: keyof typeof blankForm, value: string) => setForm((now) => ({ ...now, [key]: value }));
  const updateBlock = (key: keyof EditorBlocks, value: string) => setBlocks((now) => ({ ...now, [key]: value }));
  useEffect(() => {
    let active = true;
    const initialize = async () => {
      await Promise.resolve();
      if (!active) return;
      const saved = sessionStorage.getItem("literary-session");
      if (saved) { const session = JSON.parse(saved); setToken(session.access_token); void loadSession(session.access_token); }
      void searchWorks("");
      void fetch("/api/works?categories=1").then((res) => res.ok ? res.json() : []).then((items) => { if (active) setCategories(items); });
      if (initialWorkId) void loadWork(initialWorkId);
    };
    void initialize();
    return () => { active = false; };
    // These initialization helpers intentionally rerun only when the route's work id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorkId]);
  async function loadSession(value = token) { const res = await fetch("/api/session", { headers: value ? { Authorization: `Bearer ${value}` } : {} }); setUser((await res.json()).user); }
  async function searchWorks(value = query, selectedCategory = category) { const params = new URLSearchParams(); if (value.trim()) params.set("q", value); if (selectedCategory) params.set("category", selectedCategory); const res = await fetch(`/api/works?${params.toString()}`); if (res.ok) setWorks(await res.json()); }
  function openProfile() { if (!user || user.role !== "student") return; setRealName(user.realName || ""); setNickname(user.nickname || ""); setScreen("profile"); }
  async function saveProfile() { setLoading(true); try { const res = await fetch("/api/profile", { method: "PATCH", headers: headers(), body: JSON.stringify({ realName, nickname }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); await loadSession(); setMessage("내 정보를 저장했습니다."); } catch (error) { setMessage(error instanceof Error ? error.message : "내 정보를 저장하지 못했습니다."); } finally { setLoading(false); } }
  async function authenticate(event: FormEvent) { event.preventDefault(); setAuthMessage(""); if (!publicUrl || !publicKey) return setAuthMessage("Supabase 공개 환경 변수를 확인해 주세요."); if (authMode === "signup" && (!realName.trim() || !nickname.trim() || [...nickname.trim()].length > 7)) return setAuthMessage("이름과 7글자 이하 닉네임을 입력해 주세요."); setLoading(true); try { const res = authMode === "signup" ? await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, role: signupRole, realName: realName.trim(), nickname: nickname.trim(), teacherInviteCode }) }) : await fetch(`${publicUrl}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: publicKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || data.msg || data.error_description); if (!data.access_token) { setAuthMessage("확인 메일을 열어 계정을 인증한 뒤 로그인해 주세요."); return; } sessionStorage.setItem("literary-session", JSON.stringify(data)); setToken(data.access_token); await loadSession(data.access_token); setAuthMessage(""); setPassword(""); setAuthOpen(false); } catch (error) { setAuthMessage(error instanceof Error ? error.message : "로그인에 실패했습니다."); } finally { setLoading(false); } }
  function openAccount() { if (!user) return; if (user.role === "student") return openProfile(); setNewPassword(""); setConfirmPassword(""); setMessage(""); setScreen("account"); }
  async function changePassword(event: FormEvent) { event.preventDefault(); if (!publicUrl || !publicKey) return setMessage("Supabase 공개 환경 변수를 확인해 주세요."); if (newPassword.length < 6) return setMessage("새 비밀번호는 6자 이상 입력해 주세요."); if (newPassword !== confirmPassword) return setMessage("새 비밀번호와 확인 입력이 일치하지 않습니다."); setLoading(true); setMessage(""); try { const res = await fetch(`${publicUrl}/auth/v1/user`, { method: "PUT", headers: { apikey: publicKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ password: newPassword }) }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.msg || data.error_description || data.error || "비밀번호를 변경하지 못했습니다."); setNewPassword(""); setConfirmPassword(""); setMessage("비밀번호를 변경했습니다."); } catch (error) { setMessage(error instanceof Error ? error.message : "비밀번호를 변경하지 못했습니다."); } finally { setLoading(false); } }
  function newTeacher() { setMessage(""); setEditingId(""); setForm(blankForm); setBlocks(emptyBlocks); setAnnotations([]); setExtras([]); setScreen("teacher"); }
  function beginEdit(work: Work) { setEditingId(work.id); setForm({ title: work.title || "", author: work.author || "", genre: work.genre || "현대시", sourceText: work.source_text || "", theme: work.theme || "", expressionFeatures: work.expression_features || "", summary: work.summary || "", commentary: work.commentary || "", authorImageUrl: work.generated_result?.authorImageUrl || "" }); setBlocks(work.generated_result?.editorBlocks || emptyBlocks); setAnnotations(work.generated_result?.annotations || []); setExtras(work.generated_result?.extraSections || []); setScreen("teacher"); }
  function editSelected() { if (selected) beginEdit(selected); }
  async function editWork(work: Work) { const res = await fetch(`/api/works/${work.id}`); const data = await res.json(); if (!res.ok) return setMessage(data.error || "작품을 불러오지 못했습니다."); beginEdit(data); }
  function selectText(area: "source" | "modern") { const node = document.querySelector<HTMLTextAreaElement>(area === "source" ? ".source-editor" : ".modern-editor"); if (!node) return; const start = node.selectionStart; const end = node.selectionEnd; const phrase = node.value.slice(start, end); if (phrase.trim()) { setSelectedPhrase(phrase); setSelection({ start, end }); setSelectedArea(area); } }
  function addNote(area: "source" | "modern") { if (!selectedPhrase || selectedArea !== area) return setMessage(`${area === "source" ? "작품 원문" : "현대어 풀이"}에서 해설할 구절을 드래그해 선택해 주세요.`); setNote(""); setNoteOpen(true); }
  function saveNote() { if (!note.trim()) return setMessage("학생에게 보일 각주 설명을 입력해 주세요."); if (!selection) return setMessage("원문에서 다시 구절을 선택해 주세요."); setAnnotations((now) => [...now, { id: crypto.randomUUID(), phrase: selectedPhrase, note: note.trim(), tone, start: selection.start, end: selection.end, area: selectedArea }]); setSelectedPhrase(""); setSelection(undefined); setNoteOpen(false); }
  function addExtra(group: Group) { const title = window.prompt("새 하위 목록의 제목을 입력하세요."); if (!title?.trim()) return; setExtras((now) => [...now, { id: crypto.randomUUID(), group, title: title.trim(), content: "내용을 작성하세요." }]); }
  function imageFile(file?: File) { if (!file) return; const reader = new FileReader(); reader.onload = () => update("authorImageUrl", String(reader.result || "")); reader.readAsDataURL(file); }
  function searchSources() { if (!form.title.trim() || !form.author.trim()) return setMessage("작품명과 작가명을 먼저 입력해 주세요."); const search = `${form.title} ${form.author} 원문`; window.open(`https://www.google.com/search?q=${encodeURIComponent(search)}`, "_blank", "noopener,noreferrer"); }
  async function loadSource() { if (!form.title.trim() || !form.author.trim()) return setMessage("작품명과 작가명을 먼저 입력해 주세요."); setMessage(""); setSourceLoading(true); try { const res = await fetch("/api/works/source", { method: "POST", headers: headers(), body: JSON.stringify({ title: form.title, author: form.author }) }); const raw = await res.text(); let data: { sourceText?: string; error?: string } = {}; try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error("서버가 읽을 수 없는 응답을 반환했습니다. NAS 배포 상태를 확인해 주세요."); } if (!res.ok) throw new Error(data.error || "AI 원문을 불러오지 못했습니다."); if (!data.sourceText) throw new Error("AI 응답에 원문이 없습니다."); update("sourceText", data.sourceText); setMessage("AI가 확인한 원문을 입력했습니다. 출판 전에 원문과 저작권 상태를 반드시 확인해 주세요."); } catch (error) { setMessage(error instanceof Error ? error.message : "AI 원문을 불러오지 못했습니다."); } finally { setSourceLoading(false); } }
  async function publish(event: FormEvent) { event.preventDefault(); setMessage(""); if (!form.title.trim()) return setMessage("작품명을 입력해 주세요."); if (!token) return setMessage("로그인 정보가 만료되었습니다. 다시 로그인해 주세요."); setLoading(true); try { const res = await fetch(editingId ? `/api/works/${editingId}` : "/api/works", { method: editingId ? "PATCH" : "POST", headers: headers(), body: JSON.stringify({ ...form, title: form.title.trim(), annotations, extraSections: extras, generatedResult: { editorBlocks: blocks } }) }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || data.message || "해설을 출판하지 못했습니다."); setMessage(editingId ? "수정한 해설을 다시 출판했습니다." : "해설을 출판했습니다. 학생 자료실에서 바로 검색할 수 있습니다."); setScreen("library"); void searchWorks(""); } catch (error) { setMessage(error instanceof Error && error.message ? error.message : "출판하지 못했습니다."); } finally { setLoading(false); } }
  async function deleteWork(value?: unknown) { const workId = typeof value === "string" ? value : editingId; if (!workId || !window.confirm("이 출판물을 삭제할까요? 관련 Q&A 댓글도 함께 삭제되며 되돌릴 수 없습니다.")) return; setLoading(true); try { const res = await fetch(`/api/works/${workId}`, { method: "DELETE", headers: headers() }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setMessage("출판물을 삭제했습니다."); setActiveMenu(""); setEditingId(""); setScreen("library"); searchWorks(""); } catch (error) { setMessage(error instanceof Error ? error.message : "출판물을 삭제하지 못했습니다."); } finally { setLoading(false); } }
  async function loadComments(workId: string) { const res = await fetch(`/api/works/${workId}/comments`, { cache: "no-store" }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Q&A를 불러오지 못했습니다."); setComments(data); }
  async function loadWork(workId: string) { const res = await fetch(`/api/works/${workId}`); const data = await res.json(); if (!res.ok) { setMessage(data.error || "작품을 불러오지 못했습니다."); setScreen("library"); return; } setSelected(data); setComments([]); setCommentText(""); setScreen("detail"); try { await loadComments(workId); } catch (error) { setMessage(error instanceof Error ? error.message : "Q&A를 불러오지 못했습니다."); } }
  function openWork(work: Work) { window.location.assign(`/works/${work.id}`); }
  function openLibrary() { window.location.assign("/"); }
  function chooseGenre(next: string) { setQuery(""); setCategory(next); void searchWorks("", next); requestAnimationFrame(() => document.querySelector("#published-works")?.scrollIntoView({ behavior: "smooth" })); }
  async function postComment(parentId: string | null, body: string) { if (!selected || !user) return; setLoading(true); setMessage(""); try { const res = await fetch(`/api/works/${selected.id}/comments`, { method: "POST", headers: headers(), body: JSON.stringify({ body, parentId }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "댓글을 등록하지 못했습니다."); setCommentText(""); await loadComments(selected.id); } catch (error) { setMessage(error instanceof Error ? error.message : "댓글을 등록하지 못했습니다."); } finally { setLoading(false); } }
  async function submitComment(event: FormEvent) { event.preventDefault(); if (commentText.trim()) await postComment(null, commentText.trim()); }
  async function deleteComment(id: string) { if (!selected || !window.confirm("이 댓글을 삭제할까요?")) return; setLoading(true); try { const res = await fetch(`/api/comments/${id}`, { method: "DELETE", headers: headers() }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || "댓글을 삭제하지 못했습니다."); await loadComments(selected.id); } catch (error) { setMessage(error instanceof Error ? error.message : "댓글을 삭제하지 못했습니다."); } finally { setLoading(false); } }
  return <main><header><a className="brand" href={portalUrl}>{"수\uE8A1니기는 국어시간"}</a><nav><button onClick={openLibrary}>작품 찾기</button>{user?.role === "teacher" && <button onClick={newTeacher}>교사 작업실</button>}<a className="portal-link" href={portalUrl}>국어시간 홈</a></nav><div className="identity">{user ? <><button className="account-link" onClick={openAccount}>{user.role === "teacher" ? "교사" : "학생"} · {user.email}</button><button onClick={() => { sessionStorage.removeItem("literary-session"); setUser(null); setToken(""); setMessage(""); setScreen("library"); }}>로그아웃</button></> : <button onClick={() => { setAuthMessage(""); setAuthOpen(true); }}>로그인</button>}</div></header>
    {screen !== "library" && <section className="top"><p>LITERATURE LEARNING PLATFORM</p><h1 className="old-korean-title">{"수\uE8A1니기는 문학시간"}</h1><span>문학 작품의 해설과 Q&amp;A를 한곳에서</span></section>}{message && <div className="notice">{message}</div>}
    {screen === "library" && <><LegacyLiteratureMenu legacyBase={portalUrl} /><GenreMenu selected={category} onSelect={chooseGenre} legacyBase={portalUrl} /><section className="library" id="published-works"><div className="library-head"><div><p>STUDENT LIBRARY</p><h2>{category ? `${category} 작품` : "출판된 작품 자료"}</h2></div>{user?.role === "teacher" && <button className="primary" onClick={newTeacher}>새 해설 작성</button>}</div><div className="search"><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchWorks()} placeholder="작품명 또는 작가 검색" /><select value={category} aria-label="갈래별 작품 보기" onChange={(e) => { const next = e.target.value; setCategory(next); searchWorks(query, next); }}><option value="">모든 갈래</option>{genreOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select><button onClick={() => searchWorks()}>검색</button></div><div className="cards">{works.map((work) => <article key={work.id} onClick={() => openWork(work)}>{user?.role === "teacher" && <div className="card-menu"><button type="button" className="card-menu-trigger" aria-label={`${work.title} 관리 메뉴`} onClick={(event) => { event.stopPropagation(); setActiveMenu((now) => now === work.id ? "" : work.id); }}>⋯</button>{activeMenu === work.id && <div className="card-menu-popover"><button type="button" onClick={(event) => { event.stopPropagation(); editWork(work); }}>수정하기</button><button type="button" className="danger" onClick={(event) => { event.stopPropagation(); deleteWork(work.id); }}>삭제하기</button></div>}</div>}<p>{work.genre || "문학"}</p><h3>{work.title}</h3><span>{work.author || "작가 미입력"}</span><hr /><small className="work-opening">{work.source_text?.split(/\r?\n/).find((line) => line.trim()) || "작품 원문이 등록되지 않았습니다."}</small></article>)}{!works.length && <p className="empty">{category ? `${category}로 출판된 작품이 아직 없습니다.` : "아직 출판된 작품이 없습니다."}</p>}</div></section></>}
    {screen === "teacher" && <section className="teacher-inline"><div className="teacher-head"><p>TEACHER STUDIO</p><h2>출판 지면에서 바로 작성하기</h2><span>제목·작가·이미지·각주와 하위 목록을 이 페이지에서 바로 편집합니다.</span></div><form onSubmit={publish}><Publication form={form} annotations={annotations} blocks={blocks} extras={extras} editor sourceLoading={sourceLoading} update={update} updateBlock={updateBlock} addExtra={addExtra} removeExtra={(id) => setExtras((now) => now.filter((item) => item.id !== id))} updateExtra={(id, key, value) => setExtras((now) => now.map((item) => item.id === id ? { ...item, [key]: value } : item))} removeAnnotation={(id) => setAnnotations((now) => now.filter((item) => item.id !== id))} onChooseImage={imageFile} onSelectSource={() => selectText("source")} onSelectModern={() => selectText("modern")} onAddNote={addNote} onSearchSources={searchSources} onLoadSource={loadSource} onDeleteModern={() => { setBlocks((now) => ({ ...now, modernTranslationHidden: true })); setAnnotations((now) => now.filter((item) => item.area !== "modern")); }} onRestoreModern={() => setBlocks((now) => ({ ...now, modernTranslationHidden: false }))} /><section className="annotation-manager"><h3>추가된 각주</h3>{annotations.length ? <ul>{annotations.map((item) => <li key={item.id}><span className={`tone-${item.tone}`}>{item.area === "modern" ? "현대어 풀이" : "작품 원문"} · {item.phrase}</span><button type="button" onClick={() => setAnnotations((now) => now.filter((value) => value.id !== item.id))}>이 각주 삭제</button></li>)}</ul> : <p>아직 추가된 각주가 없습니다.</p>}</section>{message && <p className="publish-message" role="alert">{message}</p>}<div className="publish-bar">{editingId && <button type="button" className="delete-publication" disabled={loading} onClick={deleteWork}>출판물 삭제</button>}<button type="button" onClick={() => setScreen("library")}>취소</button><button type="submit" className="primary" disabled={loading}>{loading ? "처리 중…" : editingId ? "수정 내용 다시 출판" : "해설 출판하기"}</button></div></form></section>}
    {screen === "detail" && !selected && <section className="work-loading">작품을 불러오는 중입니다.</section>}
    {screen === "detail" && selected && <><section className="detail-actions"><button className="back" onClick={openLibrary}>← 자료실로</button>{user?.role === "teacher" && <><button className="edit-published" onClick={editSelected}>수정하기</button><button type="button" className="delete-published" disabled={loading} onClick={() => deleteWork(selected.id)}>삭제하기</button></>}</section><Publication form={{ title: selected.title || "", author: selected.author || "", genre: selected.genre || "문학", sourceText: selected.source_text || "", theme: selected.theme || "", expressionFeatures: selected.expression_features || "", summary: selected.summary || "", commentary: selected.commentary || "", authorImageUrl: selected.generated_result?.authorImageUrl || "" }} annotations={selected.generated_result?.annotations || []} blocks={selected.generated_result?.editorBlocks || emptyBlocks} extras={selected.generated_result?.extraSections || []} publishedAt={selected.published_at} discussion={<QandA comments={comments} user={user} value={commentText} loading={loading} onChange={setCommentText} onSubmit={submitComment} onReply={async (parentId, body) => postComment(parentId, body)} onDelete={deleteComment} onLogin={() => { setAuthMessage(""); setAuthOpen(true); }} />} /></>}
    {screen === "profile" && <section className="profile-page"><button className="back" onClick={() => setScreen("library")}>← 작품 자료실로</button><p>MY PROFILE</p><h2>내 정보 관리</h2><span>이름과 닉네임은 작품별 Q&amp;A에 표시됩니다.</span><label>이름<input value={realName} onChange={(event) => setRealName(event.target.value)} placeholder="예: 홍길동" /></label><label>닉네임 <small>최대 7글자</small><input value={nickname} maxLength={7} onChange={(event) => setNickname(event.target.value)} placeholder="예: 문학소년" /></label><button className="primary" disabled={loading} onClick={saveProfile}>{loading ? "저장 중…" : "내 정보 저장"}</button></section>}
    {screen === "account" && user?.role === "teacher" && <section className="profile-page"><button className="back" onClick={() => setScreen("library")}>← 작품 자료실로</button><p>TEACHER ACCOUNT</p><h2>교사 정보 관리</h2><span>로그인 계정을 확인하고 새 비밀번호로 변경할 수 있습니다.</span><label>이메일<input type="email" value={user.email || ""} readOnly /></label><form onSubmit={changePassword}><label>새 비밀번호 <small>6자 이상</small><input required minLength={6} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><label>새 비밀번호 확인<input required minLength={6} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label><button className="primary" disabled={loading}>{loading ? "변경 중…" : "비밀번호 변경"}</button></form></section>}
    {authOpen && <div className="modal"><form onSubmit={authenticate}><button type="button" className="x" onClick={() => { setAuthMessage(""); setAuthOpen(false); }}>×</button><p>{authMode === "signup" ? "ACCOUNT SIGN UP" : "SIGN IN"}</p><h2>{authMode === "signup" ? "계정 만들기" : "로그인"}</h2>{authMessage && <div className="auth-message" role="alert">{authMessage}</div>}{authMode === "signup" && <><label>가입 유형<select value={signupRole} onChange={(e) => setSignupRole(e.target.value as "teacher" | "student")}><option value="student">학생</option><option value="teacher">교사</option></select></label>{signupRole === "teacher" && <label>교사 초대 코드<input required type="password" value={teacherInviteCode} onChange={(e) => setTeacherInviteCode(e.target.value)} placeholder="관리자에게 받은 초대 코드" /></label>}<label>이름<input required value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="예: 홍길동" /></label><label>닉네임 <small>최대 7글자</small><input required maxLength={7} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="예: 문학소년" /></label></>}<label>이메일<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>비밀번호<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><button className="primary" disabled={loading}>{authMode === "signup" ? `${signupRole === "teacher" ? "교사" : "학생"} 회원가입` : "로그인"}</button><button type="button" className="link" onClick={() => { setAuthMessage(""); setAuthMode(authMode === "login" ? "signup" : "login"); }}>{authMode === "login" ? "회원가입으로 이동" : "로그인으로 돌아가기"}</button><small>교사 가입은 관리자에게 받은 초대 코드가 있어야 완료됩니다.</small></form></div>}
    {noteOpen && <div className="note-dialog-backdrop"><section className="note-dialog"><button type="button" className="note-dialog-close" onClick={() => setNoteOpen(false)}>×</button><h2>각주 내용</h2><p className={`note-dialog-phrase tone-${tone}`}>{selectedPhrase}</p><label>표시 색</label><div className="note-dialog-tones">{toneNames.map((name, index) => <button key={name} className={`tone-${index}${tone === index ? " active" : ""}`} type="button" onClick={() => setTone(index)}>{name}</button>)}</div><label>학생에게 보여 줄 설명</label><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="이 시어·구절에 대한 해설을 작성하세요." /><div className="note-dialog-actions"><button type="button" onClick={() => setNoteOpen(false)}>취소</button><button type="button" className="save" onClick={saveNote}>각주 넣기</button></div></section></div>}
  </main>;
}
