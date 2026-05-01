import { STORAGE_ASSETS } from "@/lib/storage-public";

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

export const GALLERY_SHOTS: GalleryShot[] = [
  {
    src: STORAGE_ASSETS.gallerySeedOne,
    title: "Guild snapshot",
    w: 1200,
    h: 800,
  },
  {
    src: STORAGE_ASSETS.gallerySeedTwo,
    title: "Sect in the jianghu",
    w: 1200,
    h: 800,
  },
];
