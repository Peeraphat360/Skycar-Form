import React from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "./utils";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  helper: string;
  tone?: "sky" | "green";
}

export function StatCard({ icon: Icon, label, value, helper, tone = "sky" }: StatCardProps) {
  const iconTone = tone === "green" ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-700";

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", iconTone)}>
          <Icon size={21} strokeWidth={2} />
        </div>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-sm text-slate-500">
        <TrendingUp size={15} className="text-emerald-500" />
        {helper}
      </p>
    </div>
  );
}