"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { sortTimelineEvents, type TimelineEvent } from "./timeline-sort";

type TimelineField = "world" | "period" | "korea" | "literature";
const blankEvent = (): TimelineEvent => ({ id: crypto.randomUUID(), world: "", period: "", korea: "", literature: "" });

function spreadsheetRows(text: string) {
  const rows = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((row) => row.trim())
    .map((row) => row.split("\t"))
    .filter((row) => row.length >= 2);
  const imported = rows
    .filter((row) => row[1]?.trim())
    .map((row) => ({
      id: crypto.randomUUID(),
      world: row[0]?.trim() || "",
      period: row[1]?.trim() || "",
      korea: row[2]?.trim() || "",
      literature: row[3]?.trim() || "",
    }));
  return { imported, skipped: rows.length - imported.length };
}

export default function TimelineEditor() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [draft, setDraft] = useState<TimelineEvent>(() => ({ id: "new", world: "", period: "", korea: "", literature: "" }));
  const [teacher, setTeacher] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [source, setSource] = useState<"saved" | "legacy">("legacy");
  const [token, setToken] = useState("");

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const response = await fetch("/api/timeline", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "연대표를 불러오지 못했습니다.");
        if (active) {
          setEvents(sortTimelineEvents(data.events || []));
          setSource(data.source === "saved" ? "saved" : "legacy");
        }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "연대표를 불러오지 못했습니다.");
      }
      try {
        const saved = sessionStorage.getItem("literary-session");
        const session = saved ? JSON.parse(saved) as { access_token?: string } : {};
        if (session.access_token) {
          const response = await fetch("/api/session", { headers: { Authorization: `Bearer ${session.access_token}` } });
          const data = await response.json();
          if (active) {
            setToken(session.access_token);
            setTeacher(data.user?.role === "teacher");
          }
        }
      } catch { /* The public timeline remains available without a session. */ }
      if (active) setLoading(false);
    };
    void initialize();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("ko-KR");
    return keyword
      ? events.filter((item) => [item.world, item.period, item.korea, item.literature].some((value) => value.toLocaleLowerCase("ko-KR").includes(keyword)))
      : events;
  }, [events, query]);

  const update = (id: string, field: TimelineField, value: string) => {
    setEvents((now) => now.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };
  const insert = (index: number) => {
    setEvents((now) => [...now.slice(0, index), blankEvent(), ...now.slice(index)]);
    setMessage("빈 행을 추가했습니다. 시기를 입력하면 저장할 때 시간순으로 정렬됩니다.");
  };
  const remove = (id: string) => setEvents((now) => now.filter((item) => item.id !== id));
  const addDraft = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.period.trim()) {
      setMessage("시기를 반드시 입력해 주세요.");
      return;
    }
    const item = { ...draft, id: crypto.randomUUID(), period: draft.period.trim() };
    setEvents((now) => sortTimelineEvents([...now, item]));
    setDraft({ id: "new", world: "", period: "", korea: "", literature: "" });
    setMessage(`${item.period} 위치에 새 항목을 입력했습니다.`);
  };
  const importRows = (text: string) => {
    const { imported, skipped } = spreadsheetRows(text);
    if (!imported.length) {
      setMessage("시기를 포함해 세계사·시기·한국사·문학사 열을 복사해 붙여넣어 주세요.");
      return;
    }
    setEvents((now) => sortTimelineEvents([...now, ...imported]));
    setMessage(`${imported.length}개 행을 시기순으로 배치했습니다.${skipped ? ` 시기가 없는 ${skipped}개 행은 제외했습니다.` : ""}`);
  };
  const save = async () => {
    const ordered = sortTimelineEvents(events);
    const missingPeriod = ordered.filter((item) => !item.period.trim()).length;
    if (missingPeriod) {
      setMessage(`시기가 비어 있는 ${missingPeriod}개 행을 먼저 입력하거나 삭제해 주세요.`);
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ events: ordered }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "연대표를 저장하지 못했습니다.");
      setEvents(ordered);
      setSource("saved");
      setEditing(false);
      setMessage(`${data.count}개 연대표 행을 시간순으로 저장했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "연대표를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return <main className="timeline-page">
    <header className="timeline-header">
      <Link href="/">수비니기는 문학시간</Link>
      <nav><Link href="/">작품 자료실</Link><a href="https://lhsstart.synology.me/literature/lhistory.html">기존 연대표</a><a href="https://lhsstart.synology.me">국어시간</a></nav>
    </header>
    <section className="timeline-hero"><p>LITERATURE HISTORY</p><h1>문학사 통합 연대표</h1><span>문학사와 한국사, 세계사의 흐름을 시기별로 함께 살펴봅니다.</span></section>
    <section className="timeline-workspace">
      <div className="timeline-tools">
        <label>연대표 검색<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="연도·사건·작품 검색" /></label>
        {teacher && <button type="button" className="primary" onClick={() => { setQuery(""); setEditing((now) => !now); }}>{editing ? "편집 닫기" : "연대표 편집"}</button>}
      </div>
      {message && <p className="timeline-message" role="status">{message}</p>}
      {loading ? <p className="timeline-empty">연대표를 불러오는 중입니다.</p> : <>
        {editing && <section className="timeline-editor-panel">
          {source === "legacy" && <p className="timeline-import-notice">현재 기존 연대표를 불러온 상태입니다. 처음 저장하면 이후부터 이 편집 화면의 내용이 사용됩니다.</p>}
          <form className="timeline-quick-add" onSubmit={addDraft}>
            <label>세계사<textarea value={draft.world} onChange={(event) => setDraft((now) => ({ ...now, world: event.target.value }))} placeholder="세계사 사건" /></label>
            <label>시기 <b>필수</b><input required value={draft.period} onChange={(event) => setDraft((now) => ({ ...now, period: event.target.value }))} placeholder="예: 1919.03.01." /></label>
            <label>한국사<textarea value={draft.korea} onChange={(event) => setDraft((now) => ({ ...now, korea: event.target.value }))} placeholder="한국사 사건" /></label>
            <label>문학사<textarea value={draft.literature} onChange={(event) => setDraft((now) => ({ ...now, literature: event.target.value }))} placeholder="문학사 사건·작품" /></label>
            <button type="submit">시기순으로 입력</button>
          </form>
          <label className="timeline-excel-paste">엑셀 여러 행 붙여넣기 <small>열 순서: 세계사 · 시기 · 한국사 · 문학사 / 시기가 없는 행은 제외됩니다.</small><textarea value="" placeholder="엑셀에서 4열 범위를 복사한 뒤 여기에 붙여넣으세요." onChange={() => undefined} onPaste={(event) => { event.preventDefault(); importRows(event.clipboardData.getData("text/plain")); }} /></label>
        </section>}
        <div className={`timeline-table-scroll${editing ? " is-editing" : ""}`}>
          <table>
            <thead><tr><th>세계사</th><th>시기</th><th>한국사</th><th>문학사</th></tr></thead>
            <tbody>{filtered.map((item) => {
              const sourceIndex = events.findIndex((event) => event.id === item.id);
              return <tr key={item.id}>
                <td>{editing ? <textarea aria-label={`${item.period || "새 항목"} 세계사`} value={item.world} onChange={(event) => update(item.id, "world", event.target.value)} /> : item.world}</td>
                <td>{editing ? <input required aria-label="시기" value={item.period} onChange={(event) => update(item.id, "period", event.target.value)} /> : item.period}</td>
                <td>{editing ? <textarea aria-label={`${item.period || "새 항목"} 한국사`} value={item.korea} onChange={(event) => update(item.id, "korea", event.target.value)} /> : item.korea}</td>
                <td><div className="timeline-literature-cell">{editing ? <textarea aria-label={`${item.period || "새 항목"} 문학사`} value={item.literature} onChange={(event) => update(item.id, "literature", event.target.value)} /> : item.literature}{editing && <div className="timeline-row-menu"><button type="button" className="timeline-row-menu-trigger" aria-label={`${item.period || "새 항목"} 행 메뉴`}>•••</button><div className="timeline-row-menu-popover"><button type="button" onClick={() => insert(sourceIndex)}>위에 추가</button><button type="button" onClick={() => insert(sourceIndex + 1)}>아래에 추가</button><button type="button" className="danger" onClick={() => remove(item.id)}>삭제</button></div></div>}</div></td>
              </tr>;
            })}</tbody>
          </table>
          {!filtered.length && <p className="timeline-empty">검색 결과가 없습니다.</p>}
        </div>
        {editing && <div className="timeline-save-bar"><button type="button" onClick={() => setEditing(false)}>취소</button><button type="button" className="primary" disabled={saving} onClick={() => void save()}>{saving ? "저장 중…" : "연대표 저장"}</button></div>}
      </>}
    </section>
  </main>;
}
