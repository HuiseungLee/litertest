"use client";

import { useState } from "react";

const works = [
  { era: "현대시", title: "진달래꽃", author: "김소월", line: "떠나는 이를 향한 사랑과 체념", tone: "plum" },
  { era: "고전소설", title: "홍길동전", author: "허균", line: "차별 없는 세상을 향한 질문", tone: "blue" },
  { era: "현대소설", title: "소나기", author: "황순원", line: "순수했던 첫사랑의 기억", tone: "amber" },
];

export default function Home() {
  const [selected, setSelected] = useState(0);
  const [saved, setSaved] = useState(false);
  const work = works[selected];

  return (
    <main>
      <nav className="topbar" aria-label="주요 메뉴">
        <a className="brand" href="#home">문학의 장면</a>
        <div className="nav-links"><a href="#works">작품 해설</a><a href="#study">공부 노트</a><a href="#quiz">퀴즈</a></div>
        <button className="save" onClick={() => setSaved(!saved)} aria-pressed={saved}>{saved ? "저장됨" : "내 책장"}</button>
      </nav>

      <section className="hero" id="home">
        <p className="eyebrow">오늘의 문학 · 10분 완독</p>
        <h1>문학은<br />마음의 지도가 된다.</h1>
        <p className="lead">어려운 작품도, 장면부터 차근차근.<br />고등학생을 위한 가장 다정한 문학 해설.</p>
        <a className="button" href="#works">오늘의 작품 보기</a>
        <div className="hero-book" aria-hidden="true"><span>문학</span><i>✦</i><b>읽고<br />생각하기</b></div>
      </section>

      <section className="dark-feature" id="works">
        <p className="eyebrow light">이번 주 집중 작품</p>
        <h2>「진달래꽃」</h2>
        <p className="feature-copy">말없이 보내는 마음은<br />어떤 색일까요?</p>
        <div className="chips"><button onClick={() => document.getElementById("study")?.scrollIntoView({ behavior: "smooth" })}>핵심 해설</button><button onClick={() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" })}>3분 퀴즈</button></div>
        <div className="petals" aria-hidden="true">✿　✿<br />　✿　　✿<br />✿　　　✿</div>
      </section>

      <section className="study" id="study">
        <p className="eyebrow">한 장으로 이해하기</p>
        <h2>작품의 마음을<br />세 갈래로 읽어요.</h2>
        <div className="note-grid">
          <article><span>01</span><h3>상황</h3><p>화자는 떠나는 임을 붙잡지 않고, 진달래꽃을 뿌려 배웅합니다.</p></article>
          <article><span>02</span><h3>정서</h3><p>이별의 슬픔 속에도 상대를 배려하는 사랑과 체념이 흐릅니다.</p></article>
          <article><span>03</span><h3>표현</h3><p>반복과 역설이 담담한 말 속에 더 깊은 슬픔을 남깁니다.</p></article>
        </div>
      </section>

      <section className="quote">
        <p>“나 보기가 역겨워<br />가실 때에는”</p>
        <span>처음 두 행의 가정은, 떠남을 받아들이려는<br />화자의 마음을 드러내요.</span>
      </section>

      <section className="library" aria-label="작품 선택">
        <p className="eyebrow">더 읽어 볼 작품</p>
        <div className="work-tabs" role="tablist">
          {works.map((item, index) => <button key={item.title} className={selected === index ? "active" : ""} onClick={() => setSelected(index)} role="tab" aria-selected={selected === index}>{item.era}</button>)}
        </div>
        <article className={`work-card ${work.tone}`}><div className="card-art"><span>{work.title}</span><i>⌁</i></div><div><p>{work.author}</p><h2>{work.title}</h2><p className="work-line">{work.line}</p><button className="text-button" onClick={() => document.getElementById("study")?.scrollIntoView({ behavior: "smooth" })}>해설 읽기 →</button></div></article>
      </section>

      <section className="quiz" id="quiz">
        <p className="eyebrow light">확인하고 기억하기</p>
        <h2>오늘의 한 문제</h2>
        <p>「진달래꽃」의 화자가 이별을 대하는 태도로 가장 알맞은 것은?</p>
        <div className="answers"><button onClick={() => alert("정답이에요! 슬픔을 억누르고 임을 배려하며 보내는 태도입니다.")}>A. 슬픔을 억누르며 상대를 배려한다</button><button onClick={() => alert("한 번 더 생각해 봐요. 화자는 원망보다 배려를 선택합니다.")}>B. 떠나는 임을 원망하고 비난한다</button></div>
      </section>

      <footer><strong>문학의 장면</strong><p>작품을 외우기 전에, 먼저 마음으로 만나세요.</p><span>고등학생을 위한 문학 해설 · 2026</span></footer>
    </main>
  );
}
