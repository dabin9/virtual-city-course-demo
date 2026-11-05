"use client";

import { useState } from "react";
import { cn } from "cn";
import { DemoProvider, useDemo } from "@/lib/store";
import { StudentCourse } from "@/components/student-course";
import { StudentReview } from "@/components/student-review";
import { TeacherView } from "@/components/teacher";

type Role = "student" | "teacher";
type StudentTab = "course" | "review";

export default function Page() {
  return (
    <DemoProvider>
      <Shell />
    </DemoProvider>
  );
}

function Shell() {
  const [role, setRole] = useState<Role>("student");
  const [tab, setTab] = useState<StudentTab>("course");
  const d = useDemo();

  return (
    <div className="min-h-dvh bg-white">
      <div className="bg-neutral-900 px-4 py-2 text-center text-[12px] leading-snug text-white">
        제안용 예시 화면 · 목업 데이터 · 지도는 임시 그림입니다
      </div>
      <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <p className="text-[15px] font-bold tracking-[-0.02em]">
            가상 도시 코스 <span className="font-normal text-neutral-400">· 1차 시연 예시</span>
          </p>
          <button type="button" onClick={d.reset} className="text-[12px] text-neutral-400 underline-offset-2 hover:underline" data-testid="reset">
            처음 상태로
          </button>
        </div>
        <nav className="mx-auto flex max-w-2xl gap-1 px-4 pb-3" aria-label="역할 전환">
          {(
            [
              { id: "student", label: "학생" },
              { id: "teacher", label: "강사" },
            ] as { id: Role; label: string }[]
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              data-testid={`role-${r.id}`}
              onClick={() => {
                setRole(r.id);
                window.scrollTo({ top: 0 });
              }}
              className={cn(
                "h-10 flex-1 rounded-xl text-[14px] font-semibold transition-colors",
                role === r.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {r.label}
            </button>
          ))}
        </nav>
        {role === "student" && (
          <div className="mx-auto flex max-w-2xl gap-5 px-4" role="tablist">
            {(
              [
                { id: "course", label: "코스 만들기" },
                { id: "review", label: "지난 수업 복습" },
              ] as { id: StudentTab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                data-testid={`tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px border-b-2 pb-2.5 text-[14px] font-semibold",
                  tab === t.id ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>
      <main className="mx-auto max-w-2xl px-4 pt-5 pb-10">
        {role === "student" && tab === "course" && <StudentCourse />}
        {role === "student" && tab === "review" && <StudentReview onCarry={() => { setTab("course"); window.scrollTo({ top: 0 }); }} />}
        {role === "teacher" && <TeacherView />}
        <p className="mt-10 text-center text-[12px] leading-relaxed text-neutral-400">
          운영자 화면(계정·배정, 일정, 수강권 차감, 지도·자료 수정)은 이번 예시에서 빼고 제안서에 범위만 적었습니다.
        </p>
      </main>
    </div>
  );
}
