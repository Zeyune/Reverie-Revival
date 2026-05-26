"use client";

import { useEffect, useRef } from "react";

type VisitTrackerProps = {
  page: string;
  pageData?: string;
};

const SESSION_KEY = "rr_visit_session_id";

const getSessionId = () => {
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_KEY, created);
  return created;
};

export function VisitTracker({ page, pageData }: VisitTrackerProps) {
  const lastVisitKey = useRef<string>("");

  useEffect(() => {
    const visitKey = `${page}:${pageData ?? ""}`;
    if (lastVisitKey.current === visitKey) {
      return;
    }

    lastVisitKey.current = visitKey;

    const sessionId = getSessionId();

    void fetch("/api/visit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page,
        pageData: pageData ?? null,
        path: window.location.pathname,
        sessionId,
        referrer: document.referrer || null,
      }),
      keepalive: true,
    }).catch((error) => {
      console.error("Failed to log visit.", error);
    });
  }, [page, pageData]);

  return null;
}
