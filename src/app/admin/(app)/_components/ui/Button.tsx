"use client";

import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const base =
  "inline-flex items-center justify-center rounded-md border border-transparent font-medium tracking-[0.2em] transition-colors focus:outline-none";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-white text-[#0B0B0C] hover:bg-[#E10613] hover:text-white",
  outline:
    "border border-white/20 text-white/70 hover:border-white/60 hover:text-white",
  ghost: "border border-transparent text-white/70 hover:bg-white/5",
  danger:
    "border border-[#E10613]/60 text-[#E10613] hover:bg-[#E10613] hover:text-white",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
