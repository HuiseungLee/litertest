"use client";

import { FormEvent, Fragment, ReactNode, useEffect, useRef, useState } from "react";

type Role = "teacher" | "student" | null;
type User = { id: string; email?: string; role: Role };
type Annotation = { id: string; phrase: string; note: string; tone: number; start?: number; end?: number };
type Group = "appreciation" | "summary" | "deep";
type ExtraSection = { id: string; group: Group; title: string; content: string };
type EditorBlocks = { modernTranslation: string; authorIntro: string; deepInquiry: string };
type Work = {
  id: string; title: string; author?: string; genre?: string; theme?: string; summary?: string;
  source_text?: string; expression_features?: string; commentary: string; published_at?: string;
  generated_result?: { annotations?: Annotation[]; extraSections?: ExtraSection[]; authorImageUrl?: string; editorBlocks?: EditorBlocks };
};

const toneNames = ["파랑", "초록", "주황", "보라", "분홍", "무채색", "연보라", "빨강", "노랑", "청록"];
const emptyBlocks: EditorBlocks = { modernTranslation: "", authorIntro: "", deepInquiry: "" };
const blankForm = { title: "", author: "", genre: "현대시", sourceText: "", theme: "", expressionFeatures: "", summary: "", commentary: "", authorImageUrl: "" };

function poem(text: string | undefined, annotations: Annotation[], editable = false, onRemove?: (id: string) => void) {
  if (!text) return <p className="empty-copy">작품 원문을 입력하거나 불러와 주세요.</p>;
  const phraseOffsets = new Map<string, number>();
  const exact = annotations.flatMap((item) => {
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
      if (end > start) pieces.push(<mark className={`poetic-term tone-${item.tone % toneNames.length}`} key={item.id} tabIndex={0}>{line.slice(start, end)}<span className="term-tooltip">{item.note}{editable && <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onRemove?.(item.id); }}>삭제</button>}</span></mark>);
      position = Math.max(position, end);
    });
    if (position < line.length) pieces.push(<Fragment key={`text-${position}`}>{line.slice(position)}</Fragment>);
    return (
    <p className={`poem-line${line ? "" : " stanza-break"}`} key={`${line}-${lineIndex}`}>
      {pieces.length ? pieces : "\u00a0"}
    </p>);
  });
}

function Publication({ form, annotations, blocks, extras, editor, update, updateBlock, addExtra, removeExtra, updateExtra, removeAnnotation, onChooseImage, onSelectSource, onAddNote, onLoadSource }: {
  form: typeof blankForm; annotations: Annotation[]; blocks: EditorBlocks; extras: ExtraSection[]; editor?: boolean;
  update?: (key: keyof typeof blankForm, value: string) => void; updateBlock?: (key: keyof EditorBlocks, value: string) => void;
  addExtra?: (group: Group) => void; removeExtra?: (id: string) => void; updateExtra?: (id: string, key: "title" | "content", value: string) => void; removeAnnotation?: (id: string) => void;
  onChooseImage?: (file?: File) => void; onSelectSource?: () => void; onAddNote?: () => void; onLoadSource?: () => void;
}) {
  const imageInput = useRef<HTMLInputElement>(null);
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
  return <article className={`published-page ${editor ? "publication-editor" : ""}`}>
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
        <p>{editor ? "출판일은 해설을 출판할 때 자동으로 기록됩니다." : `출판일 · ${form.genre || "문학"}`}</p>
      </div>
    </div>
    <div className="literature-body">
      <aside className="section-rail"><a href="#appreciation">작품 감상</a><a href="#summary">작품 정리</a><a href="#deep">심화 감상</a></aside>
      <div className="literature-content">
        <section id="appreciation" className="literature-section"><div className="section-rule" /><article>
          <h3>작품 원문</h3>
          {editor ? <><label className="source-label">작품 원문 또는 발췌 <button type="button" onClick={onLoadSource}>작품 원문 불러오기</button></label><textarea className="source-editor" value={form.sourceText} onChange={(e) => update?.("sourceText", e.target.value)} onSelect={onSelectSource} placeholder="원문을 입력하고, 해설할 구절을 드래그해 선택하세요." />
            <div className="annotation-actions"><button type="button" onClick={onAddNote}>선택한 구절에 각주 달기</button><span>각주가 적용된 모습</span></div><div className="poem editor-poem">{poem(form.sourceText, annotations, true, removeAnnotation)}</div></> : <div className="poem">{poem(form.sourceText, annotations)}</div>}
          <h3>현대어 풀이</h3>{editableBlock("modernTranslation", blocks.modernTranslation, "현대어 풀이를 작성하세요.")}
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
      </div>
    </div>
  </article>;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(); const [token, setToken] = useState("");
  const [screen, setScreen] = useState<"library" | "teacher" | "detail" | "quiz">("library"); const [works, setWorks] = useState<Work[]>([]); const [selected, setSelected] = useState<Work>();
  const [form, setForm] = useState(blankForm); const [blocks, setBlocks] = useState(emptyBlocks); const [editingId, setEditingId] = useState(""); const [annotations, setAnnotations] = useState<Annotation[]>([]); const [extras, setExtras] = useState<ExtraSection[]>([]);
  const [selectedPhrase, setSelectedPhrase] = useState(""); const [selection, setSelection] = useState<{ start: number; end: number }>(); const [note, setNote] = useState(""); const [tone, setTone] = useState(0); const [noteOpen, setNoteOpen] = useState(false);
  const [query, setQuery] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false); const [authOpen, setAuthOpen] = useState(false); const [authMode, setAuthMode] = useState<"login" | "signup">("login"); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [questions, setQuestions] = useState<any[]>([]); const [answers, setAnswers] = useState<Record<string, number>>({}); const [attemptId, setAttemptId] = useState("");
  const sourceRef = useRef<HTMLTextAreaElement>(null); const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const headers = () => ({ "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) });
  const update = (key: keyof typeof blankForm, value: string) => setForm((now) => ({ ...now, [key]: value }));
  const updateBlock = (key: keyof EditorBlocks, value: string) => setBlocks((now) => ({ ...now, [key]: value }));
  useEffect(() => { const saved = sessionStorage.getItem("literary-session"); if (saved) { const session = JSON.parse(saved); setToken(session.access_token); loadSession(session.access_token); } searchWorks(""); }, []);
  async function loadSession(value = token) { const res = await fetch("/api/session", { headers: value ? { Authorization: `Bearer ${value}` } : {} }); setUser((await res.json()).user); }
  async function searchWorks(value = query) { const res = await fetch(`/api/works?q=${encodeURIComponent(value)}`); if (res.ok) setWorks(await res.json()); }
  async function authenticate(event: FormEvent) { event.preventDefault(); if (!publicUrl || !publicKey) return setMessage("Supabase 공개 환경 변수를 확인해 주세요."); setLoading(true); try { const endpoint = authMode === "signup" ? "signup" : "token?grant_type=password"; const res = await fetch(`${publicUrl}/auth/v1/${endpoint}`, { method: "POST", headers: { apikey: publicKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); const data = await res.json(); if (!res.ok) throw new Error(data.msg || data.error_description); if (!data.access_token) { setMessage("확인 메일을 열어 계정을 인증한 뒤 로그인해 주세요."); return; } if (authMode === "signup") await fetch(`${publicUrl}/rest/v1/profiles`, { method: "POST", headers: { apikey: publicKey, Authorization: `Bearer ${data.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ id: data.user.id, role: "student", display_name: email.split("@")[0] }) }); sessionStorage.setItem("literary-session", JSON.stringify(data)); setToken(data.access_token); await loadSession(data.access_token); setAuthOpen(false); } catch (error) { setMessage(error instanceof Error ? error.message : "로그인에 실패했습니다."); } finally { setLoading(false); } }
  function newTeacher() { setEditingId(""); setForm(blankForm); setBlocks(emptyBlocks); setAnnotations([]); setExtras([]); setScreen("teacher"); }
  function editSelected() { if (!selected) return; setEditingId(selected.id); setForm({ title: selected.title || "", author: selected.author || "", genre: selected.genre || "현대시", sourceText: selected.source_text || "", theme: selected.theme || "", expressionFeatures: selected.expression_features || "", summary: selected.summary || "", commentary: selected.commentary || "", authorImageUrl: selected.generated_result?.authorImageUrl || "" }); setBlocks(selected.generated_result?.editorBlocks || emptyBlocks); setAnnotations(selected.generated_result?.annotations || []); setExtras(selected.generated_result?.extraSections || []); setScreen("teacher"); }
  function selectSource() { const node = document.querySelector<HTMLTextAreaElement>(".source-editor"); if (!node) return; const start = node.selectionStart; const end = node.selectionEnd; const phrase = node.value.slice(start, end); if (phrase.trim()) { setSelectedPhrase(phrase); setSelection({ start, end }); } }
  function addNote() { if (!selectedPhrase) return setMessage("원문에서 해설할 시어·구절을 드래그해 선택해 주세요."); setNote(""); setNoteOpen(true); }
  function saveNote() { if (!note.trim()) return setMessage("학생에게 보일 각주 설명을 입력해 주세요."); if (!selection) return setMessage("원문에서 다시 구절을 선택해 주세요."); setAnnotations((now) => [...now, { id: crypto.randomUUID(), phrase: selectedPhrase, note: note.trim(), tone, start: selection.start, end: selection.end }]); setSelectedPhrase(""); setSelection(undefined); setNoteOpen(false); }
  function addExtra(group: Group) { const title = window.prompt("새 하위 목록의 제목을 입력하세요."); if (!title?.trim()) return; setExtras((now) => [...now, { id: crypto.randomUUID(), group, title: title.trim(), content: "내용을 작성하세요." }]); }
  function imageFile(file?: File) { if (!file) return; const reader = new FileReader(); reader.onload = () => update("authorImageUrl", String(reader.result || "")); reader.readAsDataURL(file); }
  async function loadSource() { if (!form.title.trim() || !form.author.trim()) return setMessage("작품명과 작가명을 먼저 입력해 주세요."); setLoading(true); try { const res = await fetch("/api/works/source", { method: "POST", headers: headers(), body: JSON.stringify({ title: form.title, author: form.author }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); update("sourceText", data.sourceText); } catch (error) { setMessage(error instanceof Error ? error.message : "원문을 불러오지 못했습니다."); } finally { setLoading(false); } }
  async function publish(event: FormEvent) { event.preventDefault(); setLoading(true); try { const res = await fetch(editingId ? `/api/works/${editingId}` : "/api/works", { method: editingId ? "PATCH" : "POST", headers: headers(), body: JSON.stringify({ ...form, annotations, extraSections: extras, generatedResult: { editorBlocks: blocks } }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setMessage(editingId ? "수정한 해설을 다시 출판했습니다." : "해설을 출판했습니다. 학생 자료실에서 바로 검색할 수 있습니다."); setScreen("library"); searchWorks(""); } catch (error) { setMessage(error instanceof Error ? error.message : "출판하지 못했습니다."); } finally { setLoading(false); } }
  async function openWork(work: Work) { const res = await fetch(`/api/works/${work.id}`); const data = await res.json(); if (!res.ok) return setMessage(data.error || "작품을 불러오지 못했습니다."); setSelected(data); setScreen("detail"); }
  async function startQuiz() { if (!selected || user?.role !== "student") return setMessage("형성평가는 학생 로그인 후에 시작할 수 있습니다."); setLoading(true); try { const res = await fetch(`/api/works/${selected.id}/quiz`, { method: "POST", headers: headers() }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setAttemptId(data.attemptId); setQuestions(data.questions || []); setAnswers({}); setScreen("quiz"); } catch (error) { setMessage(error instanceof Error ? error.message : "형성평가를 만들지 못했습니다."); } finally { setLoading(false); } }
  async function submitQuiz() { const score = questions.reduce((sum, item, index) => sum + (answers[item.id || String(index)] === item.answer ? 1 : 0), 0); const res = await fetch(`/api/attempts/${attemptId}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ answers, score }) }); setMessage(res.ok ? `답안을 저장했습니다. ${questions.length}문항 중 ${score}문항 정답입니다.` : "답안 저장에 실패했습니다."); }
  return <main><header><button className="brand" onClick={() => setScreen("library")}>문학<span>AI</span>실</button><nav><button onClick={() => setScreen("library")}>작품 찾기</button>{user?.role === "teacher" && <button onClick={newTeacher}>교사 작업실</button>}</nav><div className="identity">{user ? <><span>{user.role === "teacher" ? "교사" : "학생"} · {user.email}</span><button onClick={() => { sessionStorage.removeItem("literary-session"); setUser(null); setToken(""); setScreen("library"); }}>로그아웃</button></> : <button onClick={() => setAuthOpen(true)}>로그인</button>}</div></header>
    <section className="top"><p>LITERATURE LEARNING PLATFORM</p><h1>교사는 출판하고,<br />학생은 탐구합니다.</h1><span>문학 작품의 해설과 형성평가를 한곳에서</span></section>{message && <div className="notice">{message}</div>}
    {screen === "library" && <section className="library"><div className="library-head"><div><p>STUDENT LIBRARY</p><h2>출판된 작품 자료</h2></div>{user?.role === "teacher" && <button className="primary" onClick={newTeacher}>새 해설 작성</button>}</div><div className="search"><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchWorks()} placeholder="작품명 또는 작가 검색" /><button onClick={() => searchWorks()}>검색</button></div><div className="cards">{works.map((work) => <article key={work.id} onClick={() => openWork(work)}><p>{work.genre || "문학"}</p><h3>{work.title}</h3><span>{work.author || "작가 미입력"}</span><hr /><small>{work.theme || work.summary || "작품 해설 보기"}</small></article>)}{!works.length && <p className="empty">아직 출판된 작품이 없습니다.</p>}</div></section>}
    {screen === "teacher" && <section className="teacher-inline"><div className="teacher-head"><p>TEACHER STUDIO</p><h2>출판 지면에서 바로 작성하기</h2><span>제목·작가·이미지·각주와 하위 목록을 이 페이지에서 바로 편집합니다.</span></div><form onSubmit={publish}><Publication form={form} annotations={annotations} blocks={blocks} extras={extras} editor update={update} updateBlock={updateBlock} addExtra={addExtra} removeExtra={(id) => setExtras((now) => now.filter((item) => item.id !== id))} updateExtra={(id, key, value) => setExtras((now) => now.map((item) => item.id === id ? { ...item, [key]: value } : item))} removeAnnotation={(id) => setAnnotations((now) => now.filter((item) => item.id !== id))} onChooseImage={imageFile} onSelectSource={selectSource} onAddNote={addNote} onLoadSource={loadSource} /><div className="publish-bar"><button type="button" onClick={() => setScreen("library")}>취소</button><button className="primary" disabled={loading}>{loading ? "처리 중…" : editingId ? "수정 내용 다시 출판" : "해설 출판하기"}</button></div></form></section>}
    {screen === "detail" && selected && <><section className="detail-actions"><button className="back" onClick={() => setScreen("library")}>← 자료실로</button>{user?.role === "teacher" && <button className="edit-published" onClick={editSelected}>수정하기</button>}</section><Publication form={{ title: selected.title || "", author: selected.author || "", genre: selected.genre || "문학", sourceText: selected.source_text || "", theme: selected.theme || "", expressionFeatures: selected.expression_features || "", summary: selected.summary || "", commentary: selected.commentary || "", authorImageUrl: selected.generated_result?.authorImageUrl || "" }} annotations={selected.generated_result?.annotations || []} blocks={selected.generated_result?.editorBlocks || emptyBlocks} extras={selected.generated_result?.extraSections || []} />{user?.role === "student" && <section className="quiz-cta"><p>STUDENT CHECK</p><h3>해설을 읽었다면<br />형성평가로 확인해 보세요.</h3><button onClick={startQuiz} disabled={loading}>{loading ? "문제 만드는 중…" : "문제 생성하기"}</button></section>}</>}
    {screen === "quiz" && <section className="quiz"><button className="back" onClick={() => setScreen("detail")}>← 작품 해설로</button><h2>형성평가</h2><p>문항을 풀고 제출하면 답안이 저장됩니다.</p>{questions.map((item, index) => <article key={item.id || index}><b>{index + 1}. {item.question}</b>{(item.choices || []).map((choice: string, choiceIndex: number) => <label key={choice}><input type="radio" name={item.id || String(index)} checked={answers[item.id || String(index)] === choiceIndex} onChange={() => setAnswers((now) => ({ ...now, [item.id || String(index)]: choiceIndex }))} />{choice}</label>)}</article>)}<button className="primary submit" onClick={submitQuiz}>답안 저장</button></section>}
    {authOpen && <div className="modal"><form onSubmit={authenticate}><button type="button" className="x" onClick={() => setAuthOpen(false)}>×</button><p>{authMode === "signup" ? "STUDENT SIGN UP" : "SIGN IN"}</p><h2>{authMode === "signup" ? "학생 계정 만들기" : "로그인"}</h2><label>이메일<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>비밀번호<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><button className="primary" disabled={loading}>{authMode === "signup" ? "학생 회원가입" : "로그인"}</button><button type="button" className="link" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "학생 계정 만들기" : "로그인으로 돌아가기"}</button><small>교사 계정은 Supabase에서 역할을 teacher로 지정한 뒤 로그인합니다.</small></form></div>}
    {noteOpen && <div className="note-dialog-backdrop"><section className="note-dialog"><button type="button" className="note-dialog-close" onClick={() => setNoteOpen(false)}>×</button><h2>각주 내용</h2><p className={`note-dialog-phrase tone-${tone}`}>{selectedPhrase}</p><label>표시 색</label><div className="note-dialog-tones">{toneNames.map((name, index) => <button key={name} className={`tone-${index}${tone === index ? " active" : ""}`} type="button" onClick={() => setTone(index)}>{name}</button>)}</div><label>학생에게 보여 줄 설명</label><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="이 시어·구절에 대한 해설을 작성하세요." /><div className="note-dialog-actions"><button type="button" onClick={() => setNoteOpen(false)}>취소</button><button type="button" className="save" onClick={saveNote}>각주 넣기</button></div></section></div>}
  </main>;
}
