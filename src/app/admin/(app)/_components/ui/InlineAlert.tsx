import { cn } from "@/lib/cn";

type InlineAlertProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: "success" | "warning" | "danger" | "info";
};

const tones: Record<NonNullable<InlineAlertProps["tone"]>, string> = {
  success: "border-emerald-400/30 text-emerald-200 bg-emerald-500/10",
  warning: "border-amber-400/30 text-amber-200 bg-amber-500/10",
  danger: "border-[#E10613]/40 text-[#E10613] bg-[#E10613]/10",
  info: "border-white/20 text-white/70 bg-white/5",
};

export function InlineAlert({
  tone = "info",
  className,
  ...props
}: InlineAlertProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
