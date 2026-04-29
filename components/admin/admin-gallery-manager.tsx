"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useModalDismiss } from "@/hooks/use-modal-dismiss";
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

type PreviewItem = {
  title: string;
  display_name: string;
  width: number | null;
  height: number | null;
  preview_url: string | null;
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
  const [preview, setPreview] = useState<PreviewItem | null>(null);
  const [mounted, setMounted] = useState(false);

  const pending = useMemo(() => pendingRows, [pendingRows]);
  const approved = useMemo(() => approvedRows, [approvedRows]);
  const previewOpen = preview !== null;
  useModalDismiss(previewOpen, () => setPreview(null), { lockBody: true });

  useEffect(() => setMounted(true), []);

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

  async function viewApprovedImage(row: ApprovedGalleryItem) {
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/gallery/${row.id}/view`, { method: "GET" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        previewUrl?: string;
      };
      if (!res.ok || !data.previewUrl) {
        setError(data.error ?? "Could not load image preview.");
        return;
      }
      setPreview({
        title: row.title,
        display_name: row.display_name,
        width: row.width,
        height: row.height,
        preview_url: data.previewUrl,
      });
    } catch (unknown) {
      setError(unknown instanceof Error ? unknown.message : "Could not load image preview.");
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
                    <button
                      type="button"
                      onClick={() => setPreview(row)}
                      className="group relative block h-full w-full"
                      aria-label={`Preview full image: ${row.title || row.display_name}`}
                    >
                      <Image
                        src={row.preview_url}
                        alt={row.title || `Pending upload from ${row.display_name}`}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-[1.01]"
                        sizes="260px"
                      />
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-1 text-[11px] text-mist">
                        Click to preview full image
                      </span>
                    </button>
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
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => viewApprovedImage(row)}
                        className="rounded-lg border border-gold/35 px-2.5 py-1.5 text-xs font-semibold text-gold transition hover:border-gold/60 hover:text-gold-bright disabled:opacity-50"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => deleteImage(row.id)}
                        className="rounded-lg border border-red-400/40 px-2.5 py-1.5 text-xs font-semibold text-red-300 transition hover:border-red-300/60 hover:text-red-200 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
      {mounted && previewOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[450] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
              role="dialog"
              aria-modal
              aria-label={preview.title || `Pending upload from ${preview.display_name}`}
              onClick={() => setPreview(null)}
            >
              <div
                className="relative max-h-[min(88vh,980px)] max-w-[min(96vw,1450px)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm text-mist">
                    {preview.title || "Untitled submission"} · by {preview.display_name}
                  </p>
                  <button
                    type="button"
                    className="rounded-md border border-mist/30 bg-void/60 px-3 py-1.5 text-sm text-mist transition hover:text-foreground"
                    onClick={() => setPreview(null)}
                  >
                    Close
                  </button>
                </div>
                {preview.preview_url ? (
                  <Image
                    src={preview.preview_url}
                    alt={preview.title || `Pending upload from ${preview.display_name}`}
                    width={preview.width && preview.width > 0 ? preview.width : 1600}
                    height={preview.height && preview.height > 0 ? preview.height : 1000}
                    className="h-auto max-h-[min(84vh,980px)] w-full object-contain shadow-2xl ring-1 ring-gold/30"
                  />
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
