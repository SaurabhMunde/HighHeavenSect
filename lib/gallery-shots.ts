export const GALLERY_SHOTS = [
  { src: "/gallery/group-pic-1.png", title: "Guild snapshot", w: 1200, h: 800 },
  { src: "/gallery/group-pic-2.png", title: "Sect in the jianghu", w: 1200, h: 800 },
  { src: "/gallery/leader-pic.png", title: "Leadership moment", w: 1200, h: 800 },
] as const;

export type GalleryShot = (typeof GALLERY_SHOTS)[number];
