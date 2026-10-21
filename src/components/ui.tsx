import type { ComponentProps, ReactNode } from "react";
import { keyColor } from "@/library";

export const inputClass =
  "w-full rounded-lg border border-line bg-panel-2 px-2.5 py-2 text-text placeholder:text-muted/70";

export function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[13px] text-muted">
      {children}
    </label>
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "ghost"; size?: "md" | "sm" };

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  const look =
    variant === "primary" ? "bg-accent text-chip" : "border border-line bg-transparent text-text hover:border-accent";
  const pad = size === "sm" ? "px-2 py-1 text-[13px]" : "px-3.5 py-2";
  return <button className={`cursor-pointer rounded-lg font-semibold ${look} ${pad} ${className}`} {...props} />;
}

export function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="cursor-pointer rounded-md px-1.5 py-1 text-lg leading-none text-muted hover:text-danger"
    >
      ×
    </button>
  );
}

export function KeyChip({ songKey }: { songKey: string }) {
  return (
    <span
      className="inline-grid h-6 min-w-9 flex-none place-items-center rounded-md px-1.5 text-xs font-bold text-chip"
      style={{ background: keyColor(songKey) ?? "var(--muted)" }}
    >
      {songKey || "—"}
    </span>
  );
}
