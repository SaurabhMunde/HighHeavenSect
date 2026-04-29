import { STORAGE_ASSETS } from "@/lib/storage-public";

export type LeaderProfile = {
  name: string;
  role: string;
  image: string;
  note?: string;
};

export const LEADERSHIP: LeaderProfile[] = [
  {
    name: "Demonsau",
    role: "Sect Leader",
    image: STORAGE_ASSETS.leadership.demonsau,
  },
  {
    name: "Linqi",
    role: "Vice Leader",
    image: STORAGE_ASSETS.leadership.linqi,
  },
  {
    name: "Ray",
    role: "Officer (RayAsher)",
    image: STORAGE_ASSETS.leadership.rayAsher,
  },
  {
    name: "Beleriand",
    role: "Officer",
    image: STORAGE_ASSETS.leadership.beleriand,
  },
  {
    name: "Noa",
    role: "Officer (Flourish)",
    image: STORAGE_ASSETS.leadership.flourish,
  },
  {
    name: "Skeng (Firefly)",
    role: "Officer (Skengk)",
    image: STORAGE_ASSETS.leadership.skeng,
  },
  {
    name: "Sylvely",
    role: "PvP Lead",
    image: STORAGE_ASSETS.leadership.sylvely,
    note: "One of the guild’s strongest duelists",
  },
  {
    name: "Yami",
    role: "Recruiter & Admin",
    image: STORAGE_ASSETS.leadership.yami,
  },
  {
    name: "James Venom",
    role: "Grand Elder (Jamun)",
    image: STORAGE_ASSETS.leadership.jamesVenom,
  },
  {
    name: "Sayaka",
    role: "Grand Elder (Sayaka-)",
    image: STORAGE_ASSETS.leadership.sayaka,
  },
  {
    name: "Re:shanto",
    role: "Grand Elder (CheungMyung)",
    image: STORAGE_ASSETS.leadership.shanto,
  },
];
