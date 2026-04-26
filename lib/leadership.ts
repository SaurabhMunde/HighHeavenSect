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
    image: "/leadership/demonsau.png",
  },
  {
    name: "Linqi",
    role: "Vice Leader",
    image: "/leadership/linqi.png",
  },
  {
    name: "Ray",
    role: "Officer (RayAsher)",
    image: "/leadership/ray-asher.png",
  },
  {
    name: "Beleriand",
    role: "Officer",
    image: "/leadership/beleriand.png",
  },
  {
    name: "Noa",
    role: "Officer (Flourish)",
    image: "/leadership/flourish.png",
  },
  {
    name: "Skeng (Firefly)",
    role: "Officer (Skengk)",
    image: "/leadership/skeng.png",
  },
  {
    name: "Sylvely",
    role: "PvP Lead",
    image: "/leadership/sylvely.png",
    note: "One of the guild’s strongest duelists",
  },
  {
    name: "Yami",
    role: "Recruiter & Admin",
    image: "/leadership/yami.png",
  },
  {
    name: "James Venom",
    role: "Grand Elder (Jamun)",
    image: "/leadership/james-venom.png",
  },
  {
    name: "Sayaka",
    role: "Grand Elder (Sayaka-)",
    image: "/leadership/sayaka.png",
  },
  {
    name: "Re:shanto",
    role: "Grand Elder (CheungMyung)",
    image: "/leadership/shanto.png",
  },
];
