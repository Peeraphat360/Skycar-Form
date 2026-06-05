import React from "react";
import { cn } from "./utils";

interface BadgeProps {
  children: React.ReactNode;
  tone?: "sky" | "green" | "amber" | "red" | "slate";
}

export function Badge({ children, tone = "sky" }: BadgeProps) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", tones[tone])}>
      {children}
    </span>
  );
}