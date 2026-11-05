"use client";

import { useState } from "react";
import { cn } from "cn";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, X, TrainFront, Footprints } from "lucide-react";
import { CityMap } from "@/components/city-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  STEP_LIMIT,
  ZONES,
  appendCost,
  cheapestInsert,
  eulReul,
  fmt,
  isStation,
  isSubwayPair,
  placeById,
  reduceHints,
  segments,
  totalSteps,
  type PlaceId,
  type Stop,
} from "@/lib/city";
import { useDemo } from "@/lib/store";

export function StudentCourse() {
  const d = useDemo();
  const { draft, overrides } = d;
  const [sel, setSel] = useState<PlaceId | null>(null);
  const [mustOnAdd, setMustOnAdd] = useState(false);
  const [memoOnAdd, setMemoOnAdd] = useState("");

  const total = totalSteps(draft, overrides);
  const left = STEP_LIMIT - total;
  const over = total > STEP_LIMIT;
  const segs = segments(draft, overrides);
  const remainTickets = d.ticketTotal - d.ticketUsed;
  const next = d.lessons.find((l) => l.status === "scheduled");
  const hasMust = draft.some((s) => s.must);
  const hints = over ? reduceHints(draft, overrides) : [];

  const update = (stops: Stop[]) => d.setDraft(stops);

  const setStart = (id: PlaceId) => {
    const rest = draft.slice(1).filter((s) => s.placeId !== id);
    update([{ placeId: id }, ...rest.map((s, i) => (i === 0 ? { ...s, subway: false } : s))]);
  };

  const applyMust = (stops: Stop[], id: PlaceId, memo: string) =>
    stops.map((s) => (s.placeId === id ? { ...s, must: true, maybe: false, memo } : { ...s, must: false }));

  const add = (id: PlaceId, mode: "onway" | "end") => {
    let stops = [...draft];
    if (mode === "end") stops.push({ placeId: id });
    else {
      const { index } = cheapestInsert(draft, id, overrides);
      stops.splice(index, 0, { placeId: id });
    }
    if (mustOnAdd) stops = applyMust(stops, id, memoOnAdd.trim());
    update(stops);
    setSel(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 1 || j >= draft.length) return;
    const stops = [...draft];
    [stops[i], stops[j]] = [stops[j], stops[i]];
    update(stops.map((s, k) => (k > 0 && s.subway && !isSubwayPair(stops[k - 1].placeId, s.placeId) ? { ...s, subway: false } : s)));
  };
  const remove = (i: number) => update(draft.filter((_, k) => k !== i));
  const patch = (i: number, p: Partial<Stop>) => update(draft.map((s, k) => (k === i ? { ...s, ...p } : s)));

  const openPlace = (id: PlaceId) => {
    setSel(id);
    const st = draft.find((s) => s.placeId === id);
    setMustOnAdd(!hasMust && !st);
    setMemoOnAdd("");
  };

  const save = () => {
    if (over) return;
    if (!hasMust) {
      toast("꼭 갈 곳을 한 곳 정해 주세요");
      return;
    }
    d.saveDraft();
    toast.success(`코스를 저장해 ${next?.label ?? "다음"} 수업에 연결했습니다 · 잔여 수강권 ${remainTickets}회 그대로`);
  };

  const selPlace = sel ? placeById(sel) : null;
  const selIdx = sel ? draft.findIndex((s) => s.placeId === sel) : -1;
  const onway = sel && selIdx < 0 ? cheapestInsert(draft, sel, overrides) : null;
  const endAdd = sel && selIdx < 0 ? appendCost(draft, sel, overrides) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3.5">
        <div>
          <p className="text-[12px] text-neutral-500">다음 수업</p>
          <p className="text-[15px] font-semibold">{next ? `${next.label} · ${next.date}` : "예정된 수업 없음"}</p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-neutral-500">잔여 수강권</p>
          <p className="text-[15px] font-bold tabular-nums" data-testid="tickets">
            {remainTickets}회 <span className="font-normal text-neutral-400">/ {d.ticketTotal}회</span>
          </p>
        </div>
      </div>

      <section>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <h2 className="text-[19px] font-bold tracking-[-0.02em]">코스 만들기</h2>
            <p className="mt-0.5 text-[13px] text-neutral-500">지도에서 가게를 눌러 코스에 담으세요. 회색 점은 아직 준비 중인 자리입니다.</p>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2 text-[13px]">
          <span className="text-neutral-500">출발역</span>
          {(["station-front", "station-shop"] as PlaceId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setStart(id)}
              className={cn(
                "h-8 rounded-full border px-3 font-semibold",
                draft[0].placeId === id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600"
              )}
            >
              {placeById(id).name}
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-3xl border border-neutral-200">
          <CityMap stops={draft} overrides={overrides} selected={sel} onTap={openPlace} />
        </div>
      </section>

      <section aria-label="방문 순서">
        <h3 className="mb-2 text-[15px] font-bold">방문 순서</h3>
        <ol className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200" data-testid="course-list">
          {draft.map((s, i) => {
            const p = placeById(s.placeId);
            const seg = i > 0 ? segs[i - 1] : null;
            const canSubway = i > 0 && isSubwayPair(draft[i - 1].placeId, s.placeId);
            return (
              <li key={s.placeId} className="px-4 py-3" data-stop={s.placeId}>
                {seg && (
                  <div className="mb-2 flex items-center gap-2 text-[12px] text-neutral-500">
                    {seg.subway ? <TrainFront className="size-3.5" /> : <Footprints className="size-3.5" />}
                    <span className="tabular-nums">
                      {seg.subway ? "지하철 0보" : `도보 ${fmt(seg.steps)}보`}
                    </span>
                    {canSubway && (
                      <label className="ml-auto flex items-center gap-1.5 text-neutral-700">
                        지하철 타기
                        <Switch checked={!!s.subway} onCheckedChange={(v) => patch(i, { subway: v })} data-testid={`subway-${i}`} />
                      </label>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums",
                      i === 0 ? "bg-neutral-900 text-white" : "bg-[var(--ink)] text-white"
                    )}
                  >
                    {i === 0 ? "출" : i}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold">
                      {p.name}
                      {i === 0 && <span className="text-[12px] font-normal text-neutral-400">출발</span>}
                      {s.must && <span className="rounded-full bg-[var(--ink-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--ink)]">꼭 갈 곳</span>}
                      {s.maybe && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">시간이 되면</span>}
                    </p>
                    {s.memo && <p className="mt-0.5 truncate text-[13px] text-neutral-500">“{s.memo}”</p>}
                  </div>
                  {i > 0 && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button variant="ghost" size="icon-sm" aria-label={`${p.name} 위로`} onClick={() => move(i, -1)} disabled={i === 1}>
                        <ArrowUp />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`${p.name} 아래로`} onClick={() => move(i, 1)} disabled={i === draft.length - 1}>
                        <ArrowDown />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`${p.name} 빼기`} onClick={() => remove(i)}>
                        <X />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {draft.length === 1 && <li className="px-4 py-6 text-center text-[13px] text-neutral-400">아직 담은 가게가 없습니다.</li>}
        </ol>
      </section>

      <details className="rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-[13px]">
        <summary className="cursor-pointer font-semibold text-neutral-600">첫 시연 확인용 · 시험 거리</summary>
        <p className="mt-2 text-neutral-500">
          기획안 22쪽 ③처럼 합계를 정확히 맞춰 보는 버튼입니다. 가챠숍–프리쿠라 구간만 시험 거리로 바꾸고 역앞역 → 카페 → 가챠숍 → 프리쿠라 코스를 불러옵니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[30000, 31000].map((t) => (
            <Button
              key={t}
              variant="outline"
              size="sm"
              data-testid={`test-${t}`}
              onClick={() =>
                d.setTest({ "gacha|purikura": t - 10000 }, `가챠숍–프리쿠라 ${fmt(t - 10000)}보 (시험)`, [
                  { placeId: "station-front" },
                  { placeId: "cafe" },
                  { placeId: "gacha", must: true, memo: "좋아하는 캐릭터 시리즈 찾기" },
                  { placeId: "purikura" },
                ])
              }
            >
              합계 {fmt(t)}보 만들기
            </Button>
          ))}
          <Button variant="ghost" size="sm" data-testid="test-reset" onClick={() => d.setTest({}, null)}>
            원래 거리로
          </Button>
        </div>
        {d.testLabel && <p className="mt-2 font-semibold text-neutral-700">시험 거리 사용 중 · {d.testLabel}</p>}
      </details>

      {/* 하단 고정 합계 */}
      <div className="sticky bottom-0 -mx-4 border-t border-neutral-200 bg-white/95 px-4 pt-3 pb-4 backdrop-blur">
        <div className="flex items-baseline justify-between text-[14px]">
          <p className="font-semibold tabular-nums" data-testid="total">
            선택한 코스 {fmt(total)}보
          </p>
          <p className={cn("tabular-nums", over ? "font-bold text-[var(--over)]" : "text-neutral-500")} data-testid="left">
            {over ? `${fmt(-left)}보 초과` : `남은 ${fmt(left)}보`}
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            className={cn("h-full rounded-full", over ? "bg-[var(--over)]" : "bg-[var(--ink)]")}
            style={{ width: `${Math.min(100, (total / STEP_LIMIT) * 100)}%` }}
          />
        </div>
        {over && (
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-700" data-testid="over-help">
            한 코스는 {fmt(STEP_LIMIT)}보까지입니다. {fmt(-left)}보를 줄여 주세요.
            {hints.length > 0
              ? ` ${hints
                  .slice(0, 2)
                  .map((h) => `${eulReul(placeById(h.placeId).name)} 빼면 ${fmt(h.total)}보`)
                  .join(", ")}가 됩니다. 순서를 바꿔도 줄어들 수 있습니다.`
              : " 장소를 빼거나 순서를 바꿔 보세요."}
          </p>
        )}
        <Button className="mt-3 h-11 w-full rounded-xl text-[15px]" disabled={over || draft.length < 2} onClick={save} data-testid="save">
          {over ? "한도를 넘어 저장할 수 없어요" : `코스 저장하고 ${next?.label ?? ""} 수업에 연결`}
        </Button>
        <p className="mt-2 text-center text-[12px] text-neutral-400" data-testid="save-note">
          코스를 저장하거나 고쳐도 수강권은 줄지 않습니다{d.saves > 0 ? ` · 저장 ${d.saves}번` : ""}
        </p>
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-2xl rounded-t-3xl">
          {selPlace && (
            <>
              <SheetHeader className="px-5 pt-5">
                <SheetTitle className="text-[18px] font-bold">{selPlace.name}</SheetTitle>
                <SheetDescription>{ZONES.find((z) => z.id === selPlace.zone)?.name}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-5 pb-6" data-testid="place-sheet">
                {selIdx === 0 ? (
                  <p className="text-[14px] text-neutral-600">출발역입니다. 위에서 출발역을 바꿀 수 있어요.</p>
                ) : selIdx > 0 ? (
                  <>
                    <label className="flex items-center justify-between text-[14px] font-semibold">
                      꼭 갈 곳
                      <Switch
                        checked={!!draft[selIdx].must}
                        onCheckedChange={(v) =>
                          update(v ? applyMust(draft, sel!, draft[selIdx].memo ?? "") : draft.map((s, k) => (k === selIdx ? { ...s, must: false } : s)))
                        }
                      />
                    </label>
                    {draft[selIdx].must && (
                      <Input
                        value={draft[selIdx].memo ?? ""}
                        onChange={(e) => patch(selIdx, { memo: e.target.value })}
                        placeholder="한 줄 메모 (예: 좋아하는 캐릭터 시리즈 찾기)"
                        className="h-10"
                      />
                    )}
                    {!draft[selIdx].must && (
                      <label className="flex items-center justify-between text-[14px] font-semibold">
                        시간이 되면
                        <Switch checked={!!draft[selIdx].maybe} onCheckedChange={(v) => patch(selIdx, { maybe: v })} />
                      </label>
                    )}
                    <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => { remove(selIdx); setSel(null); }}>
                      코스에서 빼기
                    </Button>
                  </>
                ) : (
                  <>
                    <label className="flex items-center justify-between text-[14px] font-semibold">
                      꼭 갈 곳으로 정하기
                      <Switch checked={mustOnAdd} onCheckedChange={setMustOnAdd} data-testid="must-toggle" />
                    </label>
                    {mustOnAdd && (
                      <Input
                        value={memoOnAdd}
                        onChange={(e) => setMemoOnAdd(e.target.value)}
                        placeholder="한 줄 메모 (예: 좋아하는 캐릭터 시리즈 찾기)"
                        className="h-10"
                      />
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button className="h-auto flex-col gap-0.5 rounded-xl py-3" onClick={() => add(sel!, "onway")} data-testid="add-onway">
                        <span className="text-[14px] font-semibold">가는 길에 넣기</span>
                        <span className="text-[12px] font-normal opacity-80 tabular-nums">
                          {onway ? `${onway.index}번째 · +${fmt(onway.add)}보` : ""}
                        </span>
                      </Button>
                      <Button variant="outline" className="h-auto flex-col gap-0.5 rounded-xl py-3" onClick={() => add(sel!, "end")} data-testid="add-end">
                        <span className="text-[14px] font-semibold">맨 뒤에 넣기</span>
                        <span className="text-[12px] font-normal text-neutral-500 tabular-nums">+{fmt(endAdd)}보</span>
                      </Button>
                    </div>
                    {isStation(sel!) && <p className="text-[12px] text-neutral-500">두 역 사이는 코스 목록에서 ‘지하철 타기’를 켜면 0보로 계산합니다.</p>}
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
