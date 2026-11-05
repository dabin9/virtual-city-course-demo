"use client";

import { useState } from "react";
import { cn } from "cn";
import { toast } from "sonner";
import { CityMap } from "@/components/city-map";
import { Button } from "@/components/ui/button";
import { PREVIEW_NOTE, fmt, isStation, placeById, totalSteps, type PlaceId } from "@/lib/city";
import { FEEDBACK_LABEL, useDemo } from "@/lib/store";

export function StudentReview({ onCarry }: { onCarry: () => void }) {
  const d = useDemo();
  const done = d.lessons.filter((l) => l.status === "done" && l.stops);
  const [lessonId, setLessonId] = useState(done[done.length - 1]?.id);
  const lesson = done.find((l) => l.id === lessonId) ?? done[done.length - 1];
  const [place, setPlace] = useState<PlaceId | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [onlyAgain, setOnlyAgain] = useState(false);

  if (!lesson) return <p className="text-[14px] text-neutral-500">아직 끝난 수업이 없습니다.</p>;
  const stops = lesson.stops!;
  const unvisited = stops.slice(1).filter((s) => !lesson.visited.includes(s.placeId) && !isStation(s.placeId));
  const published = d.feedback.filter((f) => f.lessonId === lesson.id && f.published);
  const shown = published.filter((f) => (place ? f.placeId === place : true)).filter((f) => (onlyAgain ? d.marks[f.id] === "again" : true));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[19px] font-bold tracking-[-0.02em]">지난 수업 복습</h2>
        <p className="mt-0.5 text-[13px] text-neutral-500">다녀온 가게를 누르면 강사가 공개한 표현을 볼 수 있어요.</p>
      </div>
      {done.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {done.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => { setLessonId(l.id); setPlace(null); }}
              className={cn("h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold", l.id === lesson.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600")}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
      <div className="rounded-2xl border border-neutral-200 px-4 py-3 text-[14px]">
        <p className="font-semibold">{lesson.label} · {lesson.date}</p>
        <p className="text-neutral-500 tabular-nums">
          계획 {stops.length - 1}곳 {fmt(totalSteps(stops, d.overrides))}보 · 다녀온 곳 {lesson.visited.map((v) => placeById(v).name).join("·") || "없음"}
          {unvisited.length > 0 && ` · 다음에 ${unvisited.map((u) => placeById(u.placeId).name).join("·")}`}
        </p>
      </div>
      <div className="overflow-hidden rounded-3xl border border-neutral-200">
        <CityMap stops={stops} overrides={d.overrides} visited={lesson.visited} dimUnvisited selected={place} onTap={(id) => setPlace((p) => (p === id ? null : id))} />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[15px] font-bold">{place ? `${placeById(place).name}에서 다시 볼 표현` : "이번 수업 표현 전체"}</h3>
          <button
            type="button"
            onClick={() => setOnlyAgain((v) => !v)}
            className={cn("h-8 rounded-full border px-3 text-[12px] font-semibold", onlyAgain ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600")}
            data-testid="only-again"
          >
            ‘다시 보기’만
          </button>
        </div>
        {place && PREVIEW_NOTE[place] && <p className="mb-2 rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-500">예습 자료 · {PREVIEW_NOTE[place]}</p>}
        <div className="space-y-2" data-testid="review-list">
          {shown.length === 0 && (
            <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-6 text-center text-[13px] text-neutral-400">
              {place && !lesson.visited.includes(place) ? "이번 수업에서 가지 못한 곳입니다." : "공개된 표현이 없습니다. 강사가 공개하면 여기에 나타납니다."}
            </p>
          )}
          {shown.map((f) => {
            const m = d.marks[f.id];
            return (
              <div key={f.id} className="rounded-2xl border border-neutral-200 px-4 py-3.5" data-review={f.id}>
                <p className="text-[11px] font-semibold text-neutral-500">
                  {placeById(f.placeId).name} · {FEEDBACK_LABEL[f.type]}
                </p>
                <p className="mt-1 text-[15px] font-semibold leading-snug">{f.prompt}</p>
                {open[f.id] ? (
                  <div className="mt-2 rounded-xl bg-[var(--ink-bg)] px-3.5 py-3" data-testid={`answer-${f.id}`}>
                    <p className="text-[17px] font-bold text-[var(--ink)]" lang={/[ぁ-んァ-ン一-龯]/.test(f.answer) ? "ja" : undefined}>
                      {f.answer}
                    </p>
                    <p className="mt-0.5 text-[13px] text-neutral-600">{f.meaning}</p>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="mt-2 rounded-lg" onClick={() => setOpen((o) => ({ ...o, [f.id]: true }))} data-testid={`reveal-${f.id}`}>
                    답 보기
                  </Button>
                )}
                <div className="mt-3 flex gap-2">
                  {(["again", "got"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => d.mark(f.id, k)}
                      data-testid={`mark-${k}-${f.id}`}
                      className={cn(
                        "h-8 flex-1 rounded-lg border text-[13px] font-semibold",
                        m === k ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600"
                      )}
                    >
                      {k === "again" ? "다시 보기" : "익혔어요"}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {unvisited.length > 0 && (
        <section className="rounded-2xl border border-neutral-200 px-4 py-4">
          <h3 className="text-[15px] font-bold">못 간 가게 이어가기</h3>
          <p className="mt-1 text-[13px] text-neutral-500">
            {unvisited.map((u) => `${placeById(u.placeId).name}${u.memo ? `(“${u.memo}”)` : ""}`).join(", ")} — 다음 코스 초안에 담고 출발역부터 걸음 수를 다시 계산합니다. 지난 기록과 수강권 차감 내역은 그대로 남습니다.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              className="h-10 rounded-xl"
              data-testid="carry"
              onClick={() => {
                d.carryOver(lesson.id);
                toast.success("못 간 가게를 다음 코스 초안에 담았습니다");
                onCarry();
              }}
            >
              다음 코스에 이어 담기
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => {
                d.setDraft([{ placeId: stops[0].placeId }]);
                onCarry();
              }}
            >
              새로 시작하기
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
