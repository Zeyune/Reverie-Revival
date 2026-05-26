"use client";

import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div
        className={cn(
          "w-full max-w-2xl rounded-xl border border-white/10 bg-[#0B0B0C] p-6 shadow-xl"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          {title ? (
            <h2 className="text-sm tracking-[0.2em]">{title}</h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs tracking-[0.2em] text-white/60 hover:text-white"
          >
            CLOSE
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}
