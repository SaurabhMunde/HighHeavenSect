"use client";

import { useRef, useState } from "react";

const MAX_IMAGE_MB = 8;

export function GalleryUploadForm() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      if (!file) {
        setError("Choose an image before submitting.");
        return;
      }

      const formData = new FormData();
      formData.set("displayName", displayName);
      formData.set("title", title);
      formData.set("caption", caption);
      formData.set("file", file);
      formData.set("website", "");

      if (typeof window !== "undefined") {
        const objectUrl = URL.createObjectURL(file);
        try {
          const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = () => reject(new Error("Could not read image dimensions."));
            img.src = objectUrl;
          });
          formData.set("width", String(dimensions.width));
          formData.set("height", String(dimensions.height));
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }

      const res = await fetch("/api/gallery/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };

      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }

      setMessage(
        data.message ?? "Upload received. An admin will review it before it appears in the gallery.",
      );
      setDisplayName("");
      setTitle("");
      setCaption("");
      setFile(null);
      formRef.current?.reset();
    } catch (unknown) {
      setError(unknown instanceof Error ? unknown.message : "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-gold/25 bg-card/90 p-5 shadow-card md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="font-display text-xl text-gold-bright">Share a memory</h2>
        <p className="mt-1 text-sm text-mist">
          Guild members can submit screenshots here. Every image goes into admin review first and only approved images appear publicly.
        </p>
      </div>
      <label className="space-y-1">
        <span className="block text-sm text-mist">Your in-game name / username</span>
        <input
          required
          maxLength={50}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/55"
          placeholder="Example: Demonsau"
        />
      </label>
      <label className="space-y-1">
        <span className="block text-sm text-mist">Title (optional)</span>
        <input
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/55"
          placeholder="Guild raid victory"
        />
      </label>
      <label className="space-y-1 md:col-span-2">
        <span className="block text-sm text-mist">Caption (optional)</span>
        <textarea
          rows={3}
          maxLength={240}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full rounded-lg border border-gold/25 bg-void/80 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/55"
          placeholder="Tell the elders what was happening in the screenshot."
        />
      </label>
      <label className="space-y-1 md:col-span-2">
        <span className="block text-sm text-mist">Image file</span>
        <input
          required
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full rounded-lg border border-dashed border-gold/30 bg-void/65 px-3 py-2 text-sm text-mist file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-void hover:border-gold/55"
        />
        <p className="text-xs text-mist/90">JPG, PNG, or WEBP. Max {MAX_IMAGE_MB} MB. Please upload game screenshots only.</p>
      </label>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />
      {error && <p className="md:col-span-2 text-sm text-red-400">{error}</p>}
      {message && <p className="md:col-span-2 text-sm text-emerald-300">{message}</p>}
      <div className="md:col-span-2 flex items-center justify-between gap-3">
        <p className="text-xs text-mist/85">Basic spam controls and rate limits are enabled. Rejected uploads are removed from storage.</p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-void transition hover:bg-gold-bright disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit for approval"}
        </button>
      </div>
    </form>
  );
}
