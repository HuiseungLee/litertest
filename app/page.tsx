"use client";

import { FormEvent, useEffect, useState } from "react";

type Result = { input: { studentId: string; grade: string; subject: string; title: string; author: string }; model: string; collected: any; draft: any; reviewed: any; subjectSections: { subject: string; text: string }[]; createdAt: string };
const initial = { studentId: "", grade: "고2", subject: "국어", title: "", author: "", genre: "", sourceText: "", theme: "", expressionFeatures: "", commentary: "", customFields: [] as { label: string; value: string }[] };

export default function Home() {
  const [tab, setTab] = useState<"create" | "history">("create");
  const [form, setForm] = useState(initial);
  const [model, setModel] = useState("gemini-3.5-flash-lite");
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [field, setField] = useState("");
  const [result, setResult] = useState<Result>();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { const saved = sessionStorage.getItem("literary-agent-settings"); if (saved) { const value = JSON.parse(saved); setModel(value.model ?? model); setApiKey(value.apiKey ?? ""); } }, []);
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const addField = () => { if (field.trim()) { setForm(current => ({ ...current, customFields: [...current.customFields, { label: field.trim(), value: "" }] })); setField(""); } };
  const setCustom = (index: number, value: string) => setForm(current => ({ ...current, customFields: current.customFields.map((item, i) => i === index ? { ...item, value } : item) }));
  const saveSettings = () => { sessionStorage.setItem("literary-agent-settings", JSON.stringify({ model, apiKey })); setShowSettings(false); setMessage("개인 메뉴 설정을 이 브라우저 세션에 저장했습니다."); };

  async function generate(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    try { const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, model, apiKey }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setResult(data); setMessage("수집 → 문제 생성 → 검토 에이전트 작업이 완료되었습니다."); } catch (error) { setMessage(error instanceof Error ? error.message : "생성에 실패했습니다."); } finally { setLoading(false); }
  }
  async function saveResult() {
    if (!result) return; setLoading(true); setMessage("");
    try { const response = await fetch("/api/results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: result.input.studentId, grade: result.input.grade, subject: result.input.subject, title: result.input.title, author: result.input.author, model: result.model, result, createdAt: result.createdAt }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setMessage("Supabase에 저장했습니다."); } catch (error) { setMessage(error instanceof Error ? error.message : "저장에 실패했습니다."); } finally { setLoading(false); }
  }
  async function loadHistory() { setTab("history"); setLoading(true); try { const response = await fetch("/api/results", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setHistory(data); } catch (error) { setMessage(error instanceof Error ? error.message : "목록을 불러오지 못했습니다."); } finally { setLoading(false); } }
  function download() { if (!result) return; const text = JSON.stringify(result, null, 2); const url = URL.createObjectURL(new Blob([text], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = `${result.input.title}-문학해설-결과.json`; a.click(); URL.revokeObjectURL(url); }

  return <main>
    <header className="app-header"><a className="brand" href="#top">문학<span>AI</span>실</a><nav><button className={tab === "create" ? "active" : ""} onClick={() => setTab("create")}>해설 생성</button><button className={tab === "history" ? "active" : ""} onClick={loadHistory}>저장 내역</button></nav><button className="settings" onClick={() => setShowSettings(true)}>개인 메뉴 · Gemini 설정</button></header>
    <section className="hero" id="top"><p>ADMIN LITERATURE WORKFLOW</p><h1>해설을 입력하면,<br />검토된 문항까지 완성됩니다.</h1><span>수집 · 문제 생성 · 문제 검토의 세 에이전트가 순서대로 작업합니다.</span></section>
    {message && <div className="notice">{message}</div>}
    {tab === "create" ? <div className="layout"><form className="admin-form" onSubmit={generate}><div className="step"><span>01</span><h2>학생 및 작품 정보</h2></div><div className="grid"><label>학생 식별값<input required value={form.studentId} onChange={e => update("studentId", e.target.value)} placeholder="예: 2026-2-15"/></label><label>학년<select value={form.grade} onChange={e => update("grade", e.target.value)}><option>고1</option><option>고2</option><option>고3</option></select></label><label>과목<input required value={form.subject} onChange={e => update("subject", e.target.value)} placeholder="국어"/></label><label>작품명<input required value={form.title} onChange={e => update("title", e.target.value)} placeholder="예: 진달래꽃"/></label><label>작자<input value={form.author} onChange={e => update("author", e.target.value)} placeholder="예: 김소월"/></label><label>갈래<input value={form.genre} onChange={e => update("genre", e.target.value)} placeholder="예: 현대시"/></label></div><div className="step second"><span>02</span><h2>관리자 해설</h2></div><label>작품 원문 또는 발췌<textarea value={form.sourceText} onChange={e => update("sourceText", e.target.value)} placeholder="원문이 없으면 비워 두어도 됩니다."/></label><div className="grid"><label>주제<input value={form.theme} onChange={e => update("theme", e.target.value)} /></label><label>표현상의 특징<input value={form.expressionFeatures} onChange={e => update("expressionFeatures", e.target.value)} /></label></div><label>자유 해설<textarea className="long" required value={form.commentary} onChange={e => update("commentary", e.target.value)} placeholder="줄거리, 인물·화자, 핵심 구절, 수업에서 강조할 점을 자유롭게 적어 주세요."/></label><div className="custom"><strong>사용자 정의 항목</strong>{form.customFields.map((item, index) => <label key={`${item.label}-${index}`}>{item.label}<div><input value={item.value} onChange={e => setCustom(index, e.target.value)}/><button type="button" onClick={() => setForm(current => ({ ...current, customFields: current.customFields.filter((_, i) => i !== index) }))}>×</button></div></label>)}<div className="add"><input value={field} onChange={e => setField(e.target.value)} placeholder="예: 시대적 배경"/><button type="button" onClick={addField}>항목 추가</button></div></div><button className="generate" disabled={loading}>{loading ? "에이전트가 작업 중입니다…" : "해설 및 문항 생성"}</button></form>
      <aside className="workflow"><p>AI WORKFLOW</p><article><b>1</b><div><strong>수집 에이전트</strong><span>관리자 해설을 작품 분석 틀에 맞게 정리</span></div></article><article><b>2</b><div><strong>문제 생성 에이전트</strong><span>해설 근거 기반 수능형 문제 초안 작성</span></div></article><article><b>3</b><div><strong>문제 검토 에이전트</strong><span>정답 유일성·오류·유형을 검토하여 최종 문항 제공</span></div></article><small>API 키는 브라우저 세션 또는 Vercel 환경 변수에서만 사용됩니다.</small></aside></div> : <section className="history"><div className="history-head"><div><p>SUPABASE ARCHIVE</p><h2>저장된 생성 결과</h2></div><button onClick={loadHistory}>새로고침</button></div>{loading ? <p>불러오는 중…</p> : history.length ? <div className="history-list">{history.map(row => <article key={row.id}><div><b>{row.work_title}</b><span>{row.work_author || "작자 미입력"}</span></div><p>{row.student_id} · {row.grade} · {row.subject}</p><time>{new Date(row.created_at).toLocaleString("ko-KR")}</time></article>)}</div> : <p className="empty">Supabase에 저장된 결과가 아직 없습니다.</p>}</section>}
    {result && <section className="result"><div className="result-head"><div><p>GENERATED RESULT</p><h2>{result.input.title} · 최종 해설과 문항</h2></div><div><button onClick={download}>텍스트 다운로드</button><button className="save-result" onClick={saveResult} disabled={loading}>Supabase에 저장</button></div></div><div className="subject-output"><h3>과목별 세특 문구</h3>{result.subjectSections.map(section => <article key={section.subject}><b>{section.subject}</b><p>{section.text}</p></article>)}</div><div className="analysis"><article><h3>수집 에이전트 정리</h3><pre>{JSON.stringify(result.collected, null, 2)}</pre></article><article><h3>문제 검토 완료 문항</h3><pre>{JSON.stringify(result.reviewed, null, 2)}</pre></article></div></section>}
    {showSettings && <div className="modal" onClick={() => setShowSettings(false)}><section onClick={e => e.stopPropagation()}><button className="x" onClick={() => setShowSettings(false)}>×</button><p>PERSONAL MENU</p><h2>Gemini 연결 설정</h2><label>Gemini API 키<input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="서버 환경 변수 사용 시 비워 두세요"/></label><label>선호 모델<input value={model} onChange={e => setModel(e.target.value)} /></label><small>기본값: Gemini 3.5 Flash-Lite. 입력한 키는 이 브라우저 세션에만 저장됩니다.</small><button className="save-settings" onClick={saveSettings}>설정 저장</button></section></div>}
  </main>;
}
