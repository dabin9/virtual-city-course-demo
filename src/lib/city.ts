/**
 * 가상 도시 데이터와 걸음 수 계산.
 * 거리 숫자는 기획안 6~7쪽 예시를 그대로 쓴다(예시 거리표, 최종 값은 운영자가 표에서 수정).
 *  - 역앞역–카페 2,000 / 카페–가챠숍 8,000 / 가챠숍–프리쿠라 1,000
 *  - 쇼핑역–가챠숍 3,000 / 가챠숍–이자카야 7,000 / 카페–이자카야 3,000
 *  - 역앞역–쇼핑역은 지하철(학생이 탑승을 골랐을 때만 0보)
 */

export type PlaceId =
  | "station-front"
  | "station-shop"
  | "cafe"
  | "gacha"
  | "purikura"
  | "izakaya"
  | "konbini"
  | "bookstore"
  | "ramen"
  | "drugstore";

export type ZoneId = "front" | "shopping" | "alley";

export type Place = {
  id: PlaceId;
  name: string;
  zone: ZoneId;
  kind: "station" | "shop";
  ready: boolean; // false = 자리만 (예시 데모에서 준비 중)
  x: number;
  y: number;
  label?: "below" | "above" | "left" | "right";
};

export const ZONES: { id: ZoneId; name: string }[] = [
  { id: "front", name: "역 앞 상점가" },
  { id: "shopping", name: "쇼핑거리" },
  { id: "alley", name: "취향 가게가 모인 골목" },
];

export const PLACES: Place[] = [
  { id: "station-front", name: "역앞역", zone: "front", kind: "station", ready: true, x: 62, y: 370, label: "below" },
  { id: "cafe", name: "카페", zone: "front", kind: "shop", ready: true, x: 104, y: 284, label: "left" },
  { id: "konbini", name: "편의점", zone: "front", kind: "shop", ready: false, x: 58, y: 250 },
  { id: "drugstore", name: "약국", zone: "front", kind: "shop", ready: false, x: 146, y: 346 },
  { id: "izakaya", name: "이자카야", zone: "shopping", kind: "shop", ready: true, x: 244, y: 300, label: "below" },
  { id: "bookstore", name: "서점", zone: "shopping", kind: "shop", ready: false, x: 318, y: 374 },
  { id: "station-shop", name: "쇼핑역", zone: "shopping", kind: "station", ready: true, x: 312, y: 226, label: "below" },
  { id: "gacha", name: "가챠숍", zone: "alley", kind: "shop", ready: true, x: 198, y: 132, label: "above" },
  { id: "purikura", name: "프리쿠라", zone: "alley", kind: "shop", ready: true, x: 296, y: 92, label: "above" },
  { id: "ramen", name: "라멘집", zone: "alley", kind: "shop", ready: false, x: 96, y: 124 },
];

export const placeById = (id: PlaceId) => PLACES.find((p) => p.id === id)!;
export const isStation = (id: PlaceId) => placeById(id).kind === "station";

export type Edge = { a: PlaceId; b: PlaceId; steps: number };

export const WALK_EDGES: Edge[] = [
  { a: "station-front", b: "cafe", steps: 2000 },
  { a: "cafe", b: "gacha", steps: 8000 },
  { a: "gacha", b: "purikura", steps: 1000 },
  { a: "station-shop", b: "gacha", steps: 3000 },
  { a: "gacha", b: "izakaya", steps: 7000 },
  { a: "cafe", b: "izakaya", steps: 3000 },
];

/** 지하철 구간: 두 역 사이. 학생이 탑승을 골랐을 때만 0보. */
export const SUBWAY: [PlaceId, PlaceId] = ["station-front", "station-shop"];

export const STEP_LIMIT = 30000;

export type Overrides = Partial<Record<string, number>>; // "a|b" → steps (시험용 거리)

const key = (a: PlaceId, b: PlaceId) => [a, b].sort().join("|");

export function edgesWith(overrides: Overrides): Edge[] {
  return WALK_EDGES.map((e) => {
    const o = overrides[key(e.a, e.b)];
    return o == null ? e : { ...e, steps: o };
  });
}

/** 정한 길 위에서 가장 짧은 도보 거리 (다익스트라). 길이 없으면 null. */
export function walkSteps(from: PlaceId, to: PlaceId, overrides: Overrides = {}): number | null {
  if (from === to) return 0;
  const edges = edgesWith(overrides);
  const dist = new Map<PlaceId, number>([[from, 0]]);
  const done = new Set<PlaceId>();
  while (true) {
    let cur: PlaceId | null = null;
    let best = Infinity;
    for (const [id, d] of dist) if (!done.has(id) && d < best) { best = d; cur = id; }
    if (cur == null) return null;
    if (cur === to) return best;
    done.add(cur);
    for (const e of edges) {
      const next = e.a === cur ? e.b : e.b === cur ? e.a : null;
      if (!next || done.has(next)) continue;
      const nd = best + e.steps;
      if (nd < (dist.get(next) ?? Infinity)) dist.set(next, nd);
    }
  }
}

/** 가장 짧은 도보 경로의 장소 순서 */
export function walkPath(from: PlaceId, to: PlaceId, overrides: Overrides = {}): PlaceId[] {
  if (from === to) return [from];
  const edges = edgesWith(overrides);
  const dist = new Map<PlaceId, number>([[from, 0]]);
  const prev = new Map<PlaceId, PlaceId>();
  const done = new Set<PlaceId>();
  while (true) {
    let cur: PlaceId | null = null;
    let best = Infinity;
    for (const [id, d] of dist) if (!done.has(id) && d < best) { best = d; cur = id; }
    if (cur == null) return [];
    if (cur === to) break;
    done.add(cur);
    for (const e of edges) {
      const next = e.a === cur ? e.b : e.b === cur ? e.a : null;
      if (!next || done.has(next)) continue;
      const nd = best + e.steps;
      if (nd < (dist.get(next) ?? Infinity)) { dist.set(next, nd); prev.set(next, cur); }
    }
  }
  const path: PlaceId[] = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0])!);
  return path;
}

export const isSubwayPair =(a: PlaceId, b: PlaceId) =>
  (a === SUBWAY[0] && b === SUBWAY[1]) || (a === SUBWAY[1] && b === SUBWAY[0]);

export type Stop = {
  placeId: PlaceId;
  must?: boolean; // 꼭 갈 곳
  memo?: string; // 꼭 갈 곳 한 줄
  maybe?: boolean; // 시간이 되면
  subway?: boolean; // 이전 장소에서 이 장소까지 지하철 탑승 (두 역 사이만)
};

export type Segment = { from: PlaceId; to: PlaceId; steps: number; subway: boolean };

export function segments(stops: Stop[], overrides: Overrides = {}): Segment[] {
  const out: Segment[] = [];
  for (let i = 1; i < stops.length; i++) {
    const from = stops[i - 1].placeId;
    const to = stops[i].placeId;
    const subway = !!stops[i].subway && isSubwayPair(from, to);
    out.push({ from, to, subway, steps: subway ? 0 : walkSteps(from, to, overrides) ?? 0 });
  }
  return out;
}

export const totalSteps = (stops: Stop[], overrides: Overrides = {}) =>
  segments(stops, overrides).reduce((s, x) => s + x.steps, 0);

/** 새 장소를 넣었을 때 걸음이 가장 덜 늘어나는 자리 (출발역 뒤부터). */
export function cheapestInsert(stops: Stop[], placeId: PlaceId, overrides: Overrides = {}) {
  const base = totalSteps(stops, overrides);
  let bestIdx = stops.length;
  let bestAdd = Infinity;
  for (let i = 1; i <= stops.length; i++) {
    const trial = [...stops.slice(0, i), { placeId }, ...stops.slice(i)];
    const add = totalSteps(trial, overrides) - base;
    if (add < bestAdd) { bestAdd = add; bestIdx = i; }
  }
  return { index: bestIdx, add: bestAdd };
}

export function appendCost(stops: Stop[], placeId: PlaceId, overrides: Overrides = {}) {
  return totalSteps([...stops, { placeId }], overrides) - totalSteps(stops, overrides);
}

export const fmt = (n: number) => n.toLocaleString("ko-KR");

/** 한도 초과 시 '이 장소를 빼면 몇 보' 제안 */
export function reduceHints(stops: Stop[], overrides: Overrides = {}) {
  const hints: { placeId: PlaceId; total: number }[] = [];
  for (let i = 1; i < stops.length; i++) {
    if (stops[i].must) continue;
    const trial = stops.filter((_, j) => j !== i);
    hints.push({ placeId: stops[i].placeId, total: totalSteps(trial, overrides) });
  }
  return hints.filter((h) => h.total <= STEP_LIMIT).sort((a, b) => b.total - a.total);
}

/** 강사용 가게별 준비 문장 (기획안 10~12쪽 내용을 한국어로). 학생 화면에는 보이지 않는다. */
export const TEACHER_PREP: Partial<Record<PlaceId, { base: string; follow: [string, string]; twist: string }>> = {
  cafe: {
    base: "점원 역할로 음료 주문을 받습니다.",
    follow: ["주문이 빨리 끝나면 \"원두를 추천해 드릴까요?\"로 원두 취향을 묻습니다.", "답이 짧으면 품절된 메뉴 대신 다른 음료를 권합니다."],
    twist: "질문을 못 알아들으면 카페 장면을 유지하고 \"다시 한번 말씀해 주시겠어요?\"를 써 보게 합니다.",
  },
  gacha: {
    base: "학생이 원하는 캐릭터 시리즈를 함께 찾습니다.",
    follow: ["어떤 시리즈를 찾는지, 왜 좋아하는지 묻습니다.", "시리즈를 찾으면 몇 번 뽑을지 묻습니다."],
    twist: "동전이 모자라는 상황을 만들어 점원에게 동전 교환을 부탁하게 합니다.",
  },
  purikura: {
    base: "기계 사용법을 묻고 사진을 찍습니다.",
    follow: ["몇 명이 찍는지, 어떤 배경을 고를지 묻습니다.", "뽑은 키링과 같이 찍어도 되는지 물어보게 합니다."],
    twist: "기계가 고장 나 다른 기계로 안내받는 상황.",
  },
  izakaya: {
    base: "자리 안내를 받고 첫 주문을 합니다.",
    follow: ["추천 메뉴를 묻게 합니다.", "음료를 하나 더 시킬지 묻습니다."],
    twist: "주문한 메뉴가 다 떨어진 상황.",
  },
};

/** 예습 표현 (자료는 운영자가 장소·난이도별로 등록 — 데모는 자리만). */
export const PREVIEW_NOTE: Partial<Record<PlaceId, string>> = {
  cafe: "카페 어휘·예문·교재 링크 (운영자가 난이도별로 등록)",
  gacha: "가챠숍 어휘·예문·교재 링크 (운영자가 난이도별로 등록)",
  purikura: "프리쿠라 어휘·예문·교재 링크 (운영자가 난이도별로 등록)",
  izakaya: "이자카야 어휘·예문·교재 링크 (운영자가 난이도별로 등록)",
};

/** 긴 도보 구간에는 강사 화면에 '길 묻기'를 제안한다. */
export const ASK_WAY_MIN = 7000;

/** 받침에 따라 을/를 */
export const eulReul = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return w + "을(를)";
  return w + ((c - 0xac00) % 28 ? "을" : "를");
};
