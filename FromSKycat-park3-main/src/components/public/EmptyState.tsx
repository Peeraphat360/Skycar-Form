import React from "react";
import { ParkingCircle } from "lucide-react";

interface EmptyStateProps {
  title: string;
  body: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        <ParkingCircle size={24} />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{body}</p>
      {action}
    </div>
  );
}