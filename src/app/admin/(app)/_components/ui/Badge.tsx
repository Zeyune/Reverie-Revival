import { cn } from "@/lib/cn";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "success" | "warning" | "danger";
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default: "border-white/20 text-white/70",
  success: "border-emerald-400/40 text-emerald-200",
  warning: "border-amber-400/40 text-amber-200",
  danger: "border-[#E10613]/60 text-[#E10613]",
};

export function Badge({ tone = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs tracking-[0.2em]",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
