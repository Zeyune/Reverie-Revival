"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

type ToastProps = {
  message: string;
  tone?: "success" | "warning" | "danger" | "info";
  duration?: number;
  onClose?: () => void;
};

const tones: Record<NonNullable<ToastProps["tone"]>, string> = {
  success: "border-emerald-400/30 text-emerald-200 bg-emerald-500/10",
  warning: "border-amber-400/30 text-amber-200 bg-amber-500/10",
  danger: "border-[#E10613]/40 text-[#E10613] bg-[#E10613]/10",
  info: "border-white/20 text-white/70 bg-white/5",
};

export function Toast({
  message,
  tone = "info",
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg",
        tones[tone]
      )}
    >
      {message}
    </div>
  );
}
