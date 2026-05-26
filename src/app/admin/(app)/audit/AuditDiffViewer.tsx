"use client";

import { useState } from "react";
import { Button } from "@/app/admin/(app)/_components/ui/Button";
import { Modal } from "@/app/admin/(app)/_components/ui/Modal";
import { EyeIcon } from "lucide-react";

export function AuditDiffViewer({ diff }: { diff: unknown }) {
    const [open, setOpen] = useState(false);

    if (!diff) return <span className="text-white/30">-</span>;

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="h-6 px-2 text-xs"
            >
                <EyeIcon className="mr-1 h-3 w-3" />
                View
            </Button>

            <Modal open={open} onClose={() => setOpen(false)} title="AUDIT LOG DIFF">
                <div className="max-h-[60vh] overflow-y-auto rounded-md bg-black/50 p-4 font-mono text-xs text-white/80">
                    <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(diff, null, 2)}
                    </pre>
                </div>
            </Modal>
        </>
    );
}
