"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui";

type PendingGalleryItem = {
  id: string;
  title: string;
  caption: string;
  display_name: string;
  created_at: string;
  width: number | null;
  height: number | null;
  size_bytes: number;
  mime_type: string;
  preview_url: string | null;
};

type ApprovedGalleryItem = {
  id: string;
  title: string;
  caption: string;
  display_name: string;
  created_at: string;
  approved_at: string | null;
  size_bytes: number;
  mime_type: string;
  width: number | null;
  height: number | null;
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminGalleryManager({
  pendingRows,
  approvedRows,
}: {
  pendingRows: PendingGalleryItem[];
  approvedRows: ApprovedGalleryItem[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const pending = useMemo(() => pendingRows, [pendingRows]);
  const approved = useMemo(() => approvedRows, [approvedRows]);

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/gallery/${id}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reviewNote: notes[id] ?? "" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `${action} failed.`);
        return;
      }
      setFeedback(action === "approve" ? "Submission approved." : "Submission rejected and removed.");
      router.refresh();
    } catch (unknown) {
      setError(unknown instanceof Error ? unknown.message : `${action} failed.`);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteImage(id: string) {
    setBusyId(id);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/gallery/${id}/delete`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Delete failed.");
        return;
      }
      setFeedback("Image deleted from gallery and storage.");
      router.refresh();
    } catch (unknown) {
      setError(unknown instanceof Error ? unknown.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl text-gold-bright md:text-3xl">Gallery moderation</h1>
        <p className="mt-2 text-mist">
          Review member submissions before they become public. Approved items are published to storage, rejected ones are deleted from the private bucket.
        </p>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {feedback && <p className="text-sm text-emerald-300">{feedback}</p>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="space-y-3">
          <h2 className="font-display text-xl text-gold-bright">Pending approvals</h2>
          {pending.length === 0 && (
            <Card>
              <p className="text-mist">No gallery submissions are waiting for review.</p>
            </Card>
          )}
          {pending.map((row, index) => (
            <Card key={row.id} delay={0.03 * index} className="!p-4">
              <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-gold/20 bg-void/45">
                  {row.preview_url ? (
                    <Image
                      src={row.preview_url}
                      alt={row.title || `Pending upload from ${row.display_name}`}
                      fill
                      className="object-cover"
                      sizes="260px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-mist">
                      Preview unavailable. The file is still stored privately and can still be approved or rejected.
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="font-display text-lg text-gold-bright">{row.title || "Untitled submission"}</p>
                    <p className="text-sm text-gold">Uploaded by {row.display_name}</p>
                    <p className="mt-1 text-xs text-mist">
                      {new Date(row.created_at).toLocaleString()} · {formatBytes(row.size_bytes)} · {row.mime_type}
                      {row.width && row.height ? ` · ${row.width}×${row.height}` : ""}
                    </p>
                  </div>
                  {row.caption && <p className="text-sm text-mist">{row.caption}</p>}
                  <label className="block">
                    <span className="mb-1 block text-xs text-mist">Moderator note (optional)</span>
                    <textarea
                      rows={3}
                      value={notes[row.id] ?? ""}
                      onChange={(e) => setNotes((current) => ({ ...current, [row.id]: e.target.value }))}
                      className="w-full rounded-lg border border-gold/25 bg-void/70 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/55"
                      placeholder="Optional reason or internal note."
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => review(row.id, "approve")}
                      className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-void transition hover:bg-gold-bright disabled:opacity-50"
                    >
                      {busyId === row.id ? "Working..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => review(row.id, "reject")}
                      className="rounded-xl border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-300/60 hover:text-red-200 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl text-gold-bright">Approved images</h2>
          <Card className="!p-0">
            {approved.length === 0 ? (
              <p className="p-4 text-sm text-mist">No approved images yet.</p>
            ) : (
              <div className="divide-y divide-gold/10">
                {approved.map((row) => (
                  <div key={row.id} className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.title || "Untitled image"}
                      </p>
                      <p className="text-xs text-gold">By {row.display_name}</p>
                      <p className="mt-1 text-[11px] text-mist">
                        Approved{" "}
                        {new Date(row.approved_at ?? row.created_at).toLocaleString()} ·{" "}
                        {formatBytes(row.size_bytes)}
                        {row.width && row.height ? ` · ${row.width}×${row.height}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => deleteImage(row.id)}
                      className="shrink-0 rounded-lg border border-red-400/40 px-2.5 py-1.5 text-xs font-semibold text-red-300 transition hover:border-red-300/60 hover:text-red-200 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
