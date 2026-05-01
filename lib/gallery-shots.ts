export type GalleryShot = {
  /** Present for DB-backed rows — stable React keys */
  id?: string;
  src: string;
  title: string;
  w: number;
  h: number;
  caption?: string;
  uploadedBy?: string;
};

/** No bundled placeholder images — gallery is moderated uploads only (`/gallery`). */
export const GALLERY_SHOTS: GalleryShot[] = [];
