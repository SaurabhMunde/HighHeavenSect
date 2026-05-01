"use client";

import { useCallback, useMemo, useState } from "react";

import type { GalleryShot } from "@/lib/gallery-shots";
import { GALLERY_PAGE_SIZE_DEFAULT } from "@/lib/gallery-approved";
import { GalleryImageCard } from "./gallery-image-card";
import { GalleryPreviewModal } from "./gallery-preview-modal";

function shotKey(s: GalleryShot, index: number) {
  return s.id ?? `${s.src}-${index}`;
}

type Props = {
  approvedFirstPage: GalleryShot[];
  totalApproved: number;
  deferredSeedShots: GalleryShot[];
  pageSize?: number;
};

export function GalleryGrid({
  approvedFirstPage,
  totalApproved,
  deferredSeedShots,
  pageSize = GALLERY_PAGE_SIZE_DEFAULT,
}: Props) {
  const [preview, setPreview] = useState<GalleryShot | null>(null);

  const [shots, setShots] = useState<GalleryShot[]>(() =>
    approvedFirstPage.length > 0 ? approvedFirstPage : deferredSeedShots,
  );

  const [approvedFetchedCount, setApprovedFetchedCount] = useState(
    approvedFirstPage.length > 0 ? approvedFirstPage.length : 0,
  );
  const [nextPage, setNextPage] = useState(approvedFirstPage.length > 0 ? 2 : 1);

  /** Seeds show after moderated pages when there are DB rows; omitted when we opened on seeds-only. */
  const [seedsAppended, setSeedsAppended] = useState(
    deferredSeedShots.length === 0 || approvedFirstPage.length === 0 || totalApproved === 0,
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMoreApproved = approvedFetchedCount < totalApproved;
  const canRevealSeeds =
    !seedsAppended &&
    deferredSeedShots.length > 0 &&
    approvedFetchedCount >= totalApproved &&
    totalApproved > 0;

  const showLoadMore = hasMoreApproved || canRevealSeeds;

  const closePreview = useCallback(() => {
    setPreview(null);
  }, []);

  const revealSeeds = useCallback(() => {
    setShots((prev) => [...prev, ...deferredSeedShots]);
    setSeedsAppended(true);
    setError(null);
  }, [deferredSeedShots]);

  const fetchNextApprovedPage = useCallback(async () => {
    const res = await fetch(`/api/gallery?page=${nextPage}&limit=${pageSize}`, { method: "GET" });
    if (!res.ok) {
      throw new Error(`Gallery request failed (${res.status})`);
    }
    return (await res.json()) as { shots: GalleryShot[]; hasMore?: boolean };
  }, [nextPage, pageSize]);

  const loadMore = useCallback(async () => {
    if (busy || !showLoadMore) return;
    setError(null);

    if (canRevealSeeds) {
      revealSeeds();
      return;
    }

    setBusy(true);
    try {
      const data = await fetchNextApprovedPage();
      const next = data.shots ?? [];
      if (!next.length) {
        setApprovedFetchedCount(totalApproved);
        setError("No more images returned from the server.");
        return;
      }
      setShots((prev) => [...prev, ...next]);
      setApprovedFetchedCount((c) => c + next.length);
      setNextPage((p) => p + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load more gallery images.");
    } finally {
      setBusy(false);
    }
  }, [busy, canRevealSeeds, fetchNextApprovedPage, revealSeeds, showLoadMore, totalApproved]);

  const nextBatchSize = useMemo(() => {
    if (!hasMoreApproved) return 0;
    return Math.min(pageSize, Math.max(0, totalApproved - approvedFetchedCount));
  }, [approvedFetchedCount, hasMoreApproved, pageSize, totalApproved]);

  const remainingApproved = Math.max(0, totalApproved - approvedFetchedCount);

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        {shots.map((s, i) => (
          <GalleryImageCard
            key={shotKey(s, i)}
            shot={s}
            index={i}
            eagerImage={i < 8}
            isPreviewOpen={preview?.src === s.src}
            onToggle={() => {
              setPreview((p) => (p?.src === s.src ? null : s));
            }}
          />
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-400/40 bg-red-950/40 px-4 py-2 text-center text-sm text-red-100">
          {error}
        </p>
      )}

      {showLoadMore ? (
        <div className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={busy}
            aria-busy={busy}
            className="rounded-2xl border border-gold/45 bg-black/42 px-6 py-2.5 font-display text-sm text-gold-bright shadow-[0_14px_32px_rgba(8,14,26,0.45)] backdrop-blur transition hover:border-gold/70 hover:brightness-110 disabled:pointer-events-none disabled:opacity-45"
          >
            {busy
              ? "Loading…"
              : hasMoreApproved
                ? `Load next ${nextBatchSize} photo${nextBatchSize === 1 ? "" : "s"} (${remainingApproved} remaining)`
                : "Load more"}
          </button>
          {totalApproved > pageSize ? (
            <p className="max-w-lg text-center text-xs text-mist">
              Showing {approvedFetchedCount} of {totalApproved} approved uploads · each batch loads progressively; images use
              lazy loading until scrolled into view.
            </p>
          ) : null}
        </div>
      ) : shots.length === 0 ? (
        <p className="mt-6 text-center text-sm text-mist">Nothing published in the hall yet.</p>
      ) : null}

      <GalleryPreviewModal shot={preview} onClose={closePreview} />
    </>
  );
}
