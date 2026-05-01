import { NextResponse } from "next/server";

import {
  fetchApprovedGalleryPage,
  GALLERY_PAGE_SIZE_DEFAULT,
  GALLERY_PAGE_SIZE_MAX,
} from "@/lib/gallery-approved";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageRaw = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? String(GALLERY_PAGE_SIZE_DEFAULT), 10);

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, GALLERY_PAGE_SIZE_MAX) : GALLERY_PAGE_SIZE_DEFAULT;

  const supabase = await createClient();
  const { shots, total, page: p, limit: l } = await fetchApprovedGalleryPage(supabase, { page, limit });
  const hasMore = p * l < total;

  return NextResponse.json({ shots, total, page: p, limit: l, hasMore });
}
