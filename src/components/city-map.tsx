"use client";

import { cn } from "cn";
import {
  PLACES,
  SUBWAY,
  ZONES,
  edgesWith,
  placeById,
  walkPath,
  fmt,
  type Overrides,
  type PlaceId,
  type Stop,
} from "@/lib/city";

const ZONE_SHAPES: Record<string, { x: number; y: number; w: number; h: number; lx: number; ly: number }> = {
  front: { x: 14, y: 210, w: 172, h: 196, lx: 26, ly: 230 },
  shopping: { x: 196, y: 196, w: 150, h: 210, lx: 208, ly: 216 },
  alley: { x: 40, y: 30, w: 306, h: 154, lx: 52, ly: 50 },
};

type Props = {
  stops?: Stop[];
  overrides?: Overrides;
  visited?: PlaceId[];
  dimUnvisited?: boolean;
  selected?: PlaceId | null;
  onTap?: (id: PlaceId) => void;
  className?: string;
};

export function CityMap({ stops = [], overrides = {}, visited, dimUnvisited, selected, onTap, className }: Props) {
  const edges = edgesWith(overrides);
  const order = new Map<PlaceId, number>();
  stops.forEach((s, i) => {
    if (!order.has(s.placeId)) order.set(s.placeId, i);
  });
  const must = stops.find((s) => s.must)?.placeId;

  // 코스가 지나는 길(도보 최단 경로 / 지하철)을 강조
  const usedWalk = new Set<string>();
  let usedSubway = false;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1].placeId;
    const b = stops[i].placeId;
    if (stops[i].subway && ((a === SUBWAY[0] && b === SUBWAY[1]) || (a === SUBWAY[1] && b === SUBWAY[0]))) {
      usedSubway = true;
      continue;
    }
    const path = walkPath(a, b, overrides);
    for (let j = 1; j < path.length; j++) usedWalk.add([path[j - 1], path[j]].sort().join("|"));
  }

  const s0 = placeById(SUBWAY[0]);
  const s1 = placeById(SUBWAY[1]);

  return (
    <svg viewBox="0 0 360 420" className={cn("h-auto w-full select-none", className)} role="img" aria-label="가상 도시 지도">
      <rect x="0" y="0" width="360" height="420" rx="20" fill="#fafafa" />
      {ZONES.map((z) => {
        const s = ZONE_SHAPES[z.id];
        return (
          <g key={z.id}>
            <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="16" fill={z.id === "alley" ? "#f1f1f0" : z.id === "front" ? "#f4f4f3" : "#efefee"} />
            <text x={s.lx} y={s.ly} fontSize="10.5" fill="#8a8a88" fontWeight="600" letterSpacing="-0.2">
              {z.name}
            </text>
          </g>
        );
      })}

      {/* 지하철 */}
      <path
        d={`M ${s0.x} ${s0.y} C ${s0.x + 120} ${s0.y + 30}, ${s1.x + 30} ${s1.y + 110}, ${s1.x} ${s1.y}`}
        fill="none"
        stroke={usedSubway ? "var(--ink)" : "#c9c9c6"}
        strokeWidth={usedSubway ? 3 : 2}
        strokeDasharray="6 5"
      />
      <text x="214" y="404" fontSize="10" fill={usedSubway ? "var(--ink)" : "#9a9a97"} fontWeight="600">
        지하철 0보
      </text>

      {/* 도보 길 */}
      {edges.map((e) => {
        const a = placeById(e.a);
        const b = placeById(e.b);
        const used = usedWalk.has([e.a, e.b].sort().join("|"));
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return (
          <g key={e.a + e.b}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={used ? "var(--ink)" : "#d6d6d3"} strokeWidth={used ? 3.5 : 2.5} strokeLinecap="round" />
            <g transform={`translate(${mx},${my})`}>
              <rect x="-24" y="-9" width="48" height="18" rx="9" fill="#fff" stroke={used ? "var(--ink)" : "#e3e3e0"} />
              <text textAnchor="middle" y="4" fontSize="9.5" fontWeight="600" fill={used ? "var(--ink)" : "#7d7d7a"} className="tabular-nums">
                {fmt(e.steps)}보
              </text>
            </g>
          </g>
        );
      })}

      {/* 장소 */}
      {PLACES.map((p) => {
        const idx = order.get(p.id);
        const inCourse = idx != null && idx > 0;
        const isStart = idx === 0;
        const isMust = must === p.id;
        const dim = dimUnvisited && visited && !visited.includes(p.id) && inCourse;
        const tappable = !!onTap && p.ready;
        const isSel = selected === p.id;
        return (
          <g
            key={p.id}
            transform={`translate(${p.x},${p.y})`}
            onClick={tappable ? () => onTap!(p.id) : undefined}
            className={cn(tappable && "cursor-pointer")}
            role={tappable ? "button" : undefined}
            aria-label={tappable ? `${p.name} 선택` : undefined}
            data-place={p.id}
            opacity={p.ready ? (dim ? 0.55 : 1) : 0.6}
          >
            <circle r="22" fill="transparent" />
            {isSel && <circle r="19" fill="none" stroke="var(--ink)" strokeOpacity="0.25" strokeWidth="6" />}
            {p.kind === "station" ? (
              <rect x="-15" y="-11" width="30" height="22" rx="7" fill={isStart || inCourse ? "#171717" : "#fff"} stroke="#171717" strokeWidth="1.5" />
            ) : (
              <circle
                r={p.ready ? 12 : 7}
                fill={inCourse ? "var(--ink)" : "#fff"}
                stroke={p.ready ? (inCourse ? "var(--ink)" : "#3f3f3d") : "#bdbdba"}
                strokeWidth={isMust ? 3 : 1.5}
                strokeDasharray={p.ready ? undefined : "2 2"}
              />
            )}
            {isMust && <circle r="17" fill="none" stroke="var(--ink)" strokeWidth="1.5" />}
            {(inCourse || isStart) && (
              <text textAnchor="middle" y="4" fontSize="11" fontWeight="700" fill="#fff" className="tabular-nums">
                {isStart ? "출발" : idx}
              </text>
            )}
            {p.kind === "station" && !(inCourse || isStart) && (
              <text textAnchor="middle" y="4" fontSize="9" fontWeight="700" fill="#171717">
                역
              </text>
            )}
            <text
              textAnchor={p.label === "left" ? "end" : p.label === "right" ? "start" : "middle"}
              x={p.label === "left" ? -19 : p.label === "right" ? 19 : 0}
              y={p.label === "above" ? -21 : p.label === "left" || p.label === "right" ? 4 : p.kind === "station" ? 25 : p.ready ? 27 : 20}
              fontSize={p.ready ? 11.5 : 9.5}
              fontWeight={p.ready ? 700 : 500}
              fill={p.ready ? "#1a1a19" : "#a3a3a0"}
            >
              {p.name}
            </text>
            {visited && inCourse && (
              <text textAnchor="middle" y={p.label === "above" ? 29 : -18} fontSize="9" fontWeight="700" fill={visited.includes(p.id) ? "var(--ink)" : "#8a8a88"}>
                {visited.includes(p.id) ? "다녀옴" : "다음에"}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
