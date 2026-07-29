"use client";

import { ChangeEvent, MouseEvent, WheelEvent, useMemo, useRef, useState } from "react";

type Note = { id: number; excerpt: string; title: string; body: string; image?: string };
type Field = { id: number; label: string; value: string };

const starterText = "나 보기가 역겨워\n가실 때에는\n말없이 고이 보내 드리우리다.\n\n영변에 약산\n진달래꽃\n아름 따다 가실 길에 뿌리우리다.";

export default function Home() {
  const [title, setTitle] = useState("진달래꽃");
  const [theme, setTheme] = useState("이별의 슬픔을 승화한 사랑과 체념");
  const [author, setAuthor] = useState("김소월");
  const [summary, setSummary] = useState("떠나는 임을 원망하지 않고 진달래꽃을 뿌려 배웅하려는 화자의 마음을 담은 시");
  const [expression, setExpression] = useState("반복, 역설, 향토적 소재를 통해 담담하면서도 깊은 정서를 형성함");
  const [text, setText] = useState(starterText);
  const [notes, setNotes] = useState<Note[]>([{ id: 1, excerpt: "진달래꽃", title: "향토적 소재", body: "화자의 정서를 시각적으로 드러내며, 이별의 길을 배웅하는 상징적 소재예요." }]);
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldName, setFieldName] = useState("");
  const [draft, setDraft] = useState({ excerpt: "", title: "", body: "" });
  const [image, setImage] = useState<string>();
  const [zoomImage, setZoomImage] = useState<string>();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number }>();
  const textarea = useRef<HTMLTextAreaElement>(null);

  const previewText = useMemo(() => {
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    let searchCursor = 0;
    const matches = notes.flatMap(note => {
      const position = text.indexOf(note.excerpt, searchCursor);
      if (position < 0 || !note.excerpt) return [];
      searchCursor = position + note.excerpt.length;
      return [{ note, position }];
    }).sort((a, b) => a.position - b.position);
    matches.forEach(({ note, position }) => {
      parts.push(text.slice(cursor, position));
      parts.push(<mark key={note.id} title={note.title}>{note.excerpt}<sup>{notes.indexOf(note) + 1}</sup></mark>);
      cursor = position + note.excerpt.length;
    });
    parts.push(text.slice(cursor));
    return parts;
  }, [notes, text]);

  function captureSelection() {
    const input = textarea.current;
    if (!input) return;
    setDraft(d => ({ ...d, excerpt: input.value.slice(input.selectionStart, input.selectionEnd) }));
  }
  function addNote() {
    if (!draft.excerpt.trim() || !draft.title.trim() || !draft.body.trim()) return;
    setNotes(n => [...n, { id: Date.now(), ...draft, image }]);
    setDraft({ excerpt: "", title: "", body: "" }); setImage(undefined);
  }
  function addField() {
    const label = fieldName.trim(); if (!label) return;
    setFields(items => [...items, { id: Date.now(), label, value: "" }]); setFieldName("");
  }
  function readImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => setImage(String(reader.result)); reader.readAsDataURL(file);
  }
  function onWheel(event: WheelEvent<HTMLDivElement>) { event.preventDefault(); setZoom(value => Math.min(5, Math.max(0.5, value + (event.deltaY < 0 ? .2 : -.2)))); }
  function download() {
    const content = `문학 각주 편집기\n\n작품: ${title}\n주제: ${theme}\n작자: ${author}\n내용 요약: ${summary}\n표현상의 특징: ${expression}\n\n${text}\n\n${notes.map((n,i)=>`[${i+1}] ${n.excerpt} — ${n.title}\n${n.body}`).join("\n\n")}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${title}-해설.txt`; a.click(); URL.revokeObjectURL(url);
  }

  return <main>
    <header><div className="logo">문학<span>+</span>각주</div><p>학생의 이해를 돕는 작품 해설 편집기</p><button className="export" onClick={download}>정리 파일 저장</button></header>
    <section className="intro"><div><p className="eyebrow">LITERATURE ANNOTATION STUDIO</p><h1>읽고, 덧붙이고,<br />나만의 해설을 만들어요.</h1></div><p>작품 정보와 각주를 한 화면에서 작성하면<br />바로 학생용 해설지로 미리 볼 수 있어요.</p></section>
    <div className="workspace">
      <section className="editor" aria-label="해설 편집 영역">
        <div className="section-title"><span>01</span><h2>작품 정보</h2></div>
        <div className="form-grid">
          <label>작품명<input value={title} onChange={e => setTitle(e.target.value)} /></label>
          <label>주제<input value={theme} onChange={e => setTheme(e.target.value)} /></label>
          <label>작자<input value={author} onChange={e => setAuthor(e.target.value)} /></label>
          <label>내용 요약<textarea value={summary} onChange={e => setSummary(e.target.value)} /></label>
          <label className="wide">표현상의 특징<textarea value={expression} onChange={e => setExpression(e.target.value)} /></label>
          {fields.map(field => <label key={field.id} className="wide">{field.label}<div className="custom-input"><input value={field.value} onChange={e => setFields(all => all.map(item => item.id === field.id ? { ...item, value: e.target.value } : item))}/><button aria-label={`${field.label} 삭제`} onClick={() => setFields(all => all.filter(item => item.id !== field.id))}>×</button></div></label>)}
        </div>
        <div className="add-field"><input placeholder="새 항목 이름 (예: 시대적 배경)" value={fieldName} onChange={e => setFieldName(e.target.value)} onKeyDown={e => e.key === "Enter" && addField()} /><button onClick={addField}>+ 항목 추가</button></div>
        <div className="section-title note-heading"><span>02</span><h2>원문과 각주</h2></div>
        <label className="source-label">원문 <small>각주를 달 구절을 드래그한 뒤 선택 내용을 불러오세요.</small><textarea ref={textarea} className="source" value={text} onChange={e => setText(e.target.value)} onSelect={captureSelection} /></label>
        <div className="annotation-form"><strong>새 각주</strong><input placeholder="선택한 원문" value={draft.excerpt} onChange={e => setDraft(d => ({ ...d, excerpt: e.target.value }))}/><input placeholder="각주 제목" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}/><textarea placeholder="학생에게 들려줄 해설" value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}/><div className="annotation-actions"><label className="file">해설 이미지 첨부<input type="file" accept="image/*" onChange={readImage}/></label><button onClick={addNote}>각주 넣기</button></div></div>
        {notes.length > 0 && <div className="note-list">{notes.map((note,index) => <article key={note.id}><b>{index + 1}</b><div><strong>{note.excerpt}</strong><p>{note.title} · {note.body}</p></div><button onClick={() => setNotes(all => all.filter(item => item.id !== note.id))}>삭제</button></article>)}</div>}
      </section>
      <aside className="preview" aria-label="학생용 미리보기"><div className="preview-bar"><span>학생용 해설지</span><i>실시간 미리보기</i></div><div className="paper"><p className="preview-type">문학 작품 해설</p><h2>{title || "작품명"}</h2><p className="by">{author || "작자 미입력"}</p><div className="poem">{previewText}</div><hr/><dl><div><dt>주제</dt><dd>{theme}</dd></div><div><dt>내용 요약</dt><dd>{summary}</dd></div><div><dt>표현상의 특징</dt><dd>{expression}</dd></div>{fields.filter(f => f.value).map(f => <div key={f.id}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl><div className="footnotes"><h3>각주</h3>{notes.map((note,index) => <article key={note.id}><b>{index + 1}</b><div><strong>{note.title}</strong><p>{note.body}</p>{note.image && <button className="image-thumb" onClick={() => { setZoomImage(note.image); setZoom(1); setOffset({x:0,y:0}); }}><img src={note.image} alt={`${note.title} 해설 이미지`}/><span>크게 보기</span></button>}</div></article>)}</div></div></aside>
    </div>
    {zoomImage && <div className="modal" onClick={() => setZoomImage(undefined)}><div className="image-stage" onWheel={onWheel} onMouseDown={e => setDrag({x:e.clientX,y:e.clientY})} onMouseMove={(e: MouseEvent) => { if (drag) setOffset(p => ({x:p.x+e.clientX-drag.x,y:p.y+e.clientY-drag.y})), setDrag({x:e.clientX,y:e.clientY}); }} onMouseUp={() => setDrag(undefined)} onDoubleClick={() => {setZoom(1);setOffset({x:0,y:0});}} onClick={e => e.stopPropagation()}><img src={zoomImage} alt="확대된 해설 이미지" style={{transform:`translate(${offset.x}px, ${offset.y}px) scale(${zoom})`}}/><p>휠로 확대 · 드래그로 이동 · 두 번 클릭으로 원래 크기</p></div><button className="close" onClick={() => setZoomImage(undefined)}>×</button></div>}
  </main>;
}
