"use client";

import { cn } from "@/lib/cn";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "w-full rounded-md border border-white/20 bg-[#121214] px-3 py-2 text-sm text-white focus:border-white/60 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
