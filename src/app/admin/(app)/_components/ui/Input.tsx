"use client";

import { cn } from "@/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-white/20 bg-[#121214] px-3 py-2 text-sm text-white focus:border-white/60 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
