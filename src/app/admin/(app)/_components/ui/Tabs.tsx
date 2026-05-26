"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type TabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type TabsProps = {
  items: TabItem[];
  initialId?: string;
};

export function Tabs({ items, initialId }: TabsProps) {
  const [activeId, setActiveId] = useState(initialId ?? items[0]?.id);

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveId(item.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs tracking-[0.2em]",
              activeId === item.id
                ? "border-white text-white"
                : "border-white/20 text-white/60 hover:border-white/60 hover:text-white"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="pt-6">
        {items.map((item) =>
          item.id === activeId ? <div key={item.id}>{item.content}</div> : null
        )}
      </div>
    </div>
  );
}
