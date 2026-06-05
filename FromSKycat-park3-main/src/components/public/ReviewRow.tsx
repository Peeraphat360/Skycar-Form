import React from "react";
import { cn } from "./utils";

interface ReviewRowProps {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}

export function ReviewRow({ label, value, strong = false }: ReviewRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={cn("text-right text-sm font-semibold text-slate-800", strong && "text-sky-700")}>{value}</span>
    </div>
  );
}