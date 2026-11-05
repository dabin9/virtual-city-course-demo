"use client";

import { useState } from "react";
import { cn } from "cn";
import { toast } from "sonner";
import { Footprints, TrainFront, MessageCircleQuestion } from "lucide-react";
import { CityMap } from "@/components/city-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ASK_WAY_MIN, TEACHER_PREP, fmt, isStation, placeById, segments, totalSteps, type PlaceId } from "@/lib/city";
import { FEEDBACK_LABEL, useDemo, type Feedback, type FeedbackType } from "@/lib/store";

const PROMPT_LABEL: Record<FeedbackType, string> = {
  vocab: "어휘",
  fix: "학생이 한 말",
  twist: "점원의 말 · 상황",
};
const ANSWER_LABEL: Record<FeedbackType, string> = {
  vocab: "표현",
  fix: "고친 일본어",
  twist: "연습할 답변",
};

export function TeacherView() {
  const d = useDemo();
  const withCourse = d.lessons.filter((l) => l.stops);
  const scheduled = d.lessons.find((l) => l.status === "scheduled" && l.stops);
  const [lessonId, setLessonId] = useState<string>(scheduled?.id ?? withCourse[withCourse.length - 1]?.id ?? d.lessons[0].id);
  const lesson = d.lessons.find((l) => l.id === lessonId) ?? d.lessons[0];
  const stops = lesson.stops ?? [];
  const segs = segments(stops, d.overrides);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[19px] font-bold tracking-[-0.02em]">오늘 수업 · 같은 지도</h2>
        <p className="mt-0.5 text-[13px] text-neutral-500">배정된 학생 A의 코스입니다. 통화는 기존 전화·화상 링크로 진행합니다.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="수업 선택">
        {d.lessons.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLessonId(l.id)}
            data-testid={`lesson-${l.id}`}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold",
              l.id === lesson.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600"
            )}
          >
            {l.label} · {l.status === "done" ? "완료" : "예정"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 px-4 py-3 text-[14px]">
        <p className="font-semibold">학생 A · {lesson.label}</p>
        <p className="text-neutral-500">{lesson.date}</p>
      </div>

      {!lesson.stops ? (
        <p className="rounded-2xl bg-neutral-50 px-4 py-8 text-center text-[14px] text-neutral-500" data-testid="no-course">
          학생이 아직 이 수업의 코스를 저장하지 않았습니다.
          <br />
          학생 탭에서 코스를 저장하면 여기에 같은 순서로 열립니다.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-neutral-200">
            <CityMap stops={stops} overrides={d.overrides} visited={lesson.status === "done" ? lesson.visited : undefined} />
          </div>
          <p className="text-[13px] text-neutral-500 tabular-nums" data-testid="teacher-total">
            학생이 고른 코스 {fmt(totalSteps(stops, d.overrides))}보 · {stops.length - 1}곳
          </p>

          <ol className="space-y-3" data-testid="teacher-list">
            {stops.map((s, i) => {
              const p = placeById(s.placeId);
              const seg = i > 0 ? segs[i - 1] : null;
              return (
                <li key={s.placeId}>
                  {seg && (
                    <div className="mb-2 flex items-center gap-2 pl-2 text-[12px] text-neutral-500">
                      {seg.subway ? <TrainFront className="size-3.5" /> : <Footprints className="size-3.5" />}
                      <span className="tabular-nums">{seg.subway ? "지하철 0보" : `도보 ${fmt(seg.steps)}보`}</span>
                      {!seg.subway && seg.steps >= ASK_WAY_MIN && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ink-bg)] px-2 py-0.5 font-semibold text-[var(--ink)]">
                          <MessageCircleQuestion className="size-3" /> 길 묻기 넣기 좋은 구간
                        </span>
                      )}
                    </div>
                  )}
                  {i === 0 || isStation(s.placeId) ? (
                    <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-[14px] font-semibold">
                      {i === 0 ? "출발" : i} · {p.name}
                    </div>
                  ) : (
                    <ShopCard index={i} placeId={s.placeId} must={!!s.must} memo={s.memo} maybe={!!s.maybe} lessonId={lesson.id} done={lesson.status === "done"} visited={lesson.visited.includes(s.placeId)} />
                  )}
                </li>
              );
            })}
          </ol>

          <Button
            className="h-11 w-full rounded-xl text-[15px]"
            data-testid="finish"
            onClick={() => {
              const remainBefore = d.ticketTotal - d.ticketUsed;
              const already = lesson.charged;
              d.finishLesson(lesson.id);
              toast.success(already ? "이미 완료한 수업입니다 · 수강권은 다시 차감하지 않습니다" : `${lesson.label} 완료 · 수강권 1회 차감 (잔여 ${remainBefore - 1}회)`);
            }}
          >
            {lesson.status === "done" ? "완료된 수업 (다시 눌러도 1회만 차감)" : "수업 마치기"}
          </Button>
        </>
      )}
    </div>
  );
}

function ShopCard({
  index,
  placeId,
  must,
  memo,
  maybe,
  lessonId,
  done,
  visited,
}: {
  index: number;
  placeId: PlaceId;
  must: boolean;
  memo?: string;
  maybe: boolean;
  lessonId: string;
  done: boolean;
  visited: boolean;
}) {
  const d = useDemo();
  const p = placeById(placeId);
  const prep = TEACHER_PREP[placeId];
  const items = d.feedback.filter((f) => f.lessonId === lessonId && f.placeId === placeId);
  const [editing, setEditing] = useState<Feedback | null>(null);

  const blank = (): Feedback => ({
    id: `F-${Date.now()}`,
    lessonId,
    placeId,
    type: "fix",
    prompt: "",
    answer: "",
    meaning: "",
    published: false,
  });

  return (
    <div className="rounded-2xl border border-neutral-200 px-4 py-4" data-shop={placeId}>
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-[12px] font-bold text-white">{index}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold">
            {p.name}
            {must && <span className="rounded-full bg-[var(--ink-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--ink)]">꼭 갈 곳</span>}
            {maybe && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">시간이 되면</span>}
          </p>
          {memo && <p className="mt-0.5 text-[13px] text-neutral-600">학생 메모 “{memo}”</p>}
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-neutral-600">
          <input
            type="checkbox"
            className="size-4 accent-[var(--ink)]"
            checked={visited}
            onChange={(e) => d.setVisited(lessonId, placeId, e.target.checked)}
            data-testid={`visited-${placeId}`}
          />
          대화한 가게
        </label>
      </div>

      {prep && (
        <div className="mt-3 rounded-xl bg-neutral-50 px-3.5 py-3 text-[13px] leading-relaxed" data-testid={`prep-${placeId}`}>
          <p className="mb-1.5 text-[11px] font-bold text-neutral-400">강사만 보는 준비 문장</p>
          <p>
            <b className="font-semibold">기본 상황</b> {prep.base}
          </p>
          <p className="mt-1">
            <b className="font-semibold">이어 갈 질문</b> ① {prep.follow[0]} ② {prep.follow[1]}
          </p>
          <p className="mt-1">
            <b className="font-semibold">돌발 상황</b> {prep.twist}
          </p>
        </div>
      )}

      <div className="mt-3 space-y-2">
        <p className="text-[12px] font-bold text-neutral-400">수업 피드백 {done ? "" : "(수업 후 입력)"}</p>
        {items.map((f) => (
          <div key={f.id} className="flex items-start gap-2 rounded-xl border border-neutral-100 px-3 py-2.5 text-[13px]" data-feedback={f.id}>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-neutral-500">
                {FEEDBACK_LABEL[f.type]} · {f.published ? "학생에게 공개" : "작성 중 (강사·운영자만 보임)"}
              </p>
              <p className="mt-0.5">{f.prompt}</p>
              <p className="font-semibold">{f.answer}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <Button size="xs" variant={f.published ? "outline" : "default"} onClick={() => d.setPublished(f.id, !f.published)} data-testid={`publish-${f.id}`}>
                {f.published ? "비공개로" : "공개"}
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setEditing(f)}>
                고치기
              </Button>
            </div>
          </div>
        ))}
        {editing ? (
          <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
            <div className="flex gap-1.5">
              {(Object.keys(FEEDBACK_LABEL) as FeedbackType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEditing({ ...editing, type: t })}
                  className={cn(
                    "h-8 rounded-full border px-3 text-[12px] font-semibold",
                    editing.type === t ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600"
                  )}
                >
                  {FEEDBACK_LABEL[t]}
                </button>
              ))}
            </div>
            <Textarea value={editing.prompt} onChange={(e) => setEditing({ ...editing, prompt: e.target.value })} placeholder={PROMPT_LABEL[editing.type]} rows={2} />
            <Input value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} placeholder={ANSWER_LABEL[editing.type]} />
            <Input value={editing.meaning} onChange={(e) => setEditing({ ...editing, meaning: e.target.value })} placeholder="뜻 · 설명" />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  d.upsertFeedback(editing);
                  setEditing(null);
                  toast("저장했습니다 · 같은 항목을 고치면 복습에 중복되지 않습니다");
                }}
              >
                저장
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditing(blank())}>
            피드백 추가
          </Button>
        )}
      </div>
    </div>
  );
}
