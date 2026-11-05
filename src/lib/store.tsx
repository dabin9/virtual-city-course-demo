"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Overrides, PlaceId, Stop } from "@/lib/city";

export type FeedbackType = "vocab" | "fix" | "twist";
export const FEEDBACK_LABEL: Record<FeedbackType, string> = {
  vocab: "코스 어휘",
  fix: "교정 표현",
  twist: "돌발 상황",
};

export type Feedback = {
  id: string;
  lessonId: string;
  placeId: PlaceId;
  type: FeedbackType;
  prompt: string; // 학생에게 먼저 보이는 질문 (돌발 상황: 점원의 말 / 교정: 학생이 한 말)
  answer: string; // '답 보기'로 펼쳐지는 표현
  meaning: string;
  published: boolean;
};

export type Lesson = {
  id: string;
  label: string;
  date: string;
  status: "scheduled" | "done";
  stops: Stop[] | null;
  visited: PlaceId[];
  charged: boolean; // 수강권 차감 여부 (두 번 눌러도 한 번만)
};

export type DemoState = {
  ticketTotal: number;
  ticketUsed: number;
  draft: Stop[];
  saves: number;
  overrides: Overrides;
  testLabel: string | null;
  lessons: Lesson[];
  feedback: Feedback[];
  marks: Record<string, "again" | "got">;
};

const START: Stop = { placeId: "station-front" };

const initial = (): DemoState => ({
  ticketTotal: 8,
  ticketUsed: 3,
  draft: [START],
  saves: 0,
  overrides: {},
  testLabel: null,
  lessons: [
    {
      id: "L-03",
      label: "3회차",
      date: "11월 3일(화) 19:00 · 25분",
      status: "done",
      stops: [
        { placeId: "station-front" },
        { placeId: "cafe" },
        { placeId: "gacha", must: true, memo: "좋아하는 캐릭터 시리즈 찾기" },
        { placeId: "purikura", maybe: true, memo: "뽑은 키링과 같이 사진 찍기" },
      ],
      visited: ["cafe", "gacha"],
      charged: true,
    },
    {
      id: "L-04",
      label: "4회차",
      date: "11월 6일(금) 19:00 · 25분",
      status: "scheduled",
      stops: null,
      visited: [],
      charged: false,
    },
  ],
  feedback: [
    {
      id: "F-1",
      lessonId: "L-03",
      placeId: "gacha",
      type: "twist",
      prompt: "동전이 부족해요. 점원에게 어떻게 물어볼까요?",
      answer: "両替できますか。",
      meaning: "동전 교환 되나요?",
      published: true,
    },
    {
      id: "F-2",
      lessonId: "L-03",
      placeId: "cafe",
      type: "twist",
      prompt: "점원의 질문을 못 알아들었어요. 어떻게 되물을까요?",
      answer: "다시 한번 말씀해 주시겠어요?",
      meaning: "되묻기 (일본어 문장은 강사가 입력)",
      published: false,
    },
  ],
  marks: {},
});

type Ctx = DemoState & {
  setDraft: (s: Stop[]) => void;
  saveDraft: () => void;
  setTest: (overrides: Overrides, label: string | null, course?: Stop[]) => void;
  setVisited: (lessonId: string, placeId: PlaceId, on: boolean) => void;
  upsertFeedback: (f: Feedback) => void;
  setPublished: (id: string, on: boolean) => void;
  finishLesson: (lessonId: string) => void;
  mark: (id: string, m: "again" | "got") => void;
  carryOver: (lessonId: string) => void;
  reset: () => void;
};

const DemoCtx = createContext<Ctx | null>(null);
const KEY = "virtual-city-demo-v1";

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<DemoState>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...initial(), ...JSON.parse(raw) });
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }, [s, loaded]);

  const setDraft = useCallback((draft: Stop[]) => setS((p) => ({ ...p, draft })), []);
  const saveDraft = useCallback(
    () =>
      setS((p) => ({
        ...p,
        saves: p.saves + 1,
        lessons: p.lessons.map((l) => (l.status === "scheduled" ? { ...l, stops: p.draft.map((x) => ({ ...x })), visited: [] } : l)),
      })),
    []
  );
  const setTest = useCallback(
    (overrides: Overrides, testLabel: string | null, course?: Stop[]) =>
      setS((p) => ({ ...p, overrides, testLabel, draft: course ?? p.draft })),
    []
  );
  const setVisited = useCallback(
    (lessonId: string, placeId: PlaceId, on: boolean) =>
      setS((p) => ({
        ...p,
        lessons: p.lessons.map((l) =>
          l.id !== lessonId ? l : { ...l, visited: on ? Array.from(new Set([...l.visited, placeId])) : l.visited.filter((v) => v !== placeId) }
        ),
      })),
    []
  );
  const upsertFeedback = useCallback(
    (f: Feedback) =>
      setS((p) => {
        const exists = p.feedback.some((x) => x.id === f.id);
        return { ...p, feedback: exists ? p.feedback.map((x) => (x.id === f.id ? f : x)) : [...p.feedback, f] };
      }),
    []
  );
  const setPublished = useCallback(
    (id: string, on: boolean) => setS((p) => ({ ...p, feedback: p.feedback.map((x) => (x.id === id ? { ...x, published: on } : x)) })),
    []
  );
  const finishLesson = useCallback(
    (lessonId: string) =>
      setS((p) => {
        const l = p.lessons.find((x) => x.id === lessonId);
        if (!l) return p;
        const charge = !l.charged; // 완료를 두 번 눌러도 1회만 차감
        const lessons = p.lessons.map((x) => (x.id === lessonId ? { ...x, status: "done" as const, charged: true } : x));
        // 다음 회차 자리 만들기
        const hasNext = lessons.some((x) => x.status === "scheduled");
        const nextNo = Math.max(...lessons.map((x) => parseInt(x.label, 10))) + 1;
        if (!hasNext)
          lessons.push({ id: `L-0${nextNo}`, label: `${nextNo}회차`, date: "11월 10일(화) 19:00 · 25분", status: "scheduled", stops: null, visited: [], charged: false });
        return { ...p, lessons, ticketUsed: p.ticketUsed + (charge ? 1 : 0) };
      }),
    []
  );
  const mark = useCallback((id: string, m: "again" | "got") => setS((p) => ({ ...p, marks: { ...p.marks, [id]: m } })), []);
  const carryOver = useCallback(
    (lessonId: string) =>
      setS((p) => {
        const l = p.lessons.find((x) => x.id === lessonId);
        if (!l?.stops) return p;
        const start = l.stops[0];
        const left = l.stops.slice(1).filter((st) => !l.visited.includes(st.placeId));
        return { ...p, draft: [{ placeId: start.placeId }, ...left.map((st, i) => ({ ...st, must: i === 0 ? true : st.must, maybe: false, subway: false }))] };
      }),
    []
  );
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setS(initial());
  }, []);

  const value = useMemo(
    () => ({ ...s, setDraft, saveDraft, setTest, setVisited, upsertFeedback, setPublished, finishLesson, mark, carryOver, reset }),
    [s, setDraft, saveDraft, setTest, setVisited, upsertFeedback, setPublished, finishLesson, mark, carryOver, reset]
  );
  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}

export function useDemo() {
  const c = useContext(DemoCtx);
  if (!c) throw new Error("DemoProvider missing");
  return c;
}
