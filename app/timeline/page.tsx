import type { Metadata } from "next";
import TimelineEditor from "./timeline-editor";

export const metadata: Metadata = {
  title: "문학사 연대표 | 수비니기는 문학시간",
  description: "문학사와 한국사, 세계사의 흐름을 한눈에 살펴보는 통합 연대표",
};

export default function TimelinePage() { return <TimelineEditor />; }
