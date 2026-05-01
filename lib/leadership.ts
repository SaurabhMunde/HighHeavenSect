import { STORAGE_ASSETS } from "@/lib/storage-public";

export type LeaderProfile = {
  name: string;
  role: string;
  /** WWM in-game name; shown as IGN on the card when set, otherwise display `name` is used */
  ign?: string;
  image: string;
  /** Short bio / tagline */
  note?: string;
};

/** Order: top leadership → admins & specialists → elders */
export const LEADERSHIP: LeaderProfile[] = [
  {
    name: "Demonsau",
    role: "Guild Leader",
    image: STORAGE_ASSETS.leadership.demonsau,
    note: "Runs the guild from the shadows so well that guildmates rarely see him in-game.",
  },
  {
    name: "Linqi",
    role: "Guild Vice Leader",
    image: STORAGE_ASSETS.leadership.linqi,
    note: "Handles guild affairs and occasionally brings out the whip to “encourage” attendance in war.",
  },
  {
    name: "RayAsher",
    role: "Admin",
    image: STORAGE_ASSETS.leadership.rayAsher,
    note: "The silent observer willing to aid when you're in need, whether as warrior in guild or therapist IRL.",
  },
  {
    name: "Beleriand",
    role: "Admin · founding WWM steward",
    image: STORAGE_ASSETS.leadership.beleriand,
    ign: "Beleriand'",
    note: "The chill guy who has no enemies except \"Breaking Army\".",
  },
  {
    name: "Noa",
    role: "Admin",
    ign: "Flourish",
    image: STORAGE_ASSETS.leadership.flourish,
    note: "Sushi chef, too busy cooking IRL getting cooked in game.",
  },
  {
    name: "James Venom",
    role: "Commander",
    ign: "Jamun",
    image: STORAGE_ASSETS.leadership.jamesVenom,
    note: "A sharp commander who leads guild wars and carries players through events like Guild Raid and Sword Trial (ST). Patient mentor for new disciples. No Slacking fr.",
  },
  {
    name: "Skeng",
    role: "Firefly",
    ign: "Skengk",
    image: STORAGE_ASSETS.leadership.skeng,
    note: "I will fight for myself, until everything... burns to ashes!",
  },
  {
    name: "Sylvely",
    role: "Admin",
    image: STORAGE_ASSETS.leadership.sylvely,
    note: "Fellow Chicken enjoyer that is addicted to PvP.",
  },
  {
    name: "Yami",
    role: "Heavenly Envoy",
    image: STORAGE_ASSETS.leadership.yami,
    note: "The one who mastered the art of iron fortress. Heavenly poacher of HighHeavenSect: roam solo too long and you'll get poached into the guild.",
  },
  {
    name: "Sayaka",
    role: "Grand Elder",
    ign: "Sayaka-",
    image: STORAGE_ASSETS.leadership.sayaka,
    note: "Introverted manager who tries her best but prefers slacking.",
  },
  {
    name: "RE:Shanto",
    role: "Grand Elder",
    ign: "CheungMyung",
    image: STORAGE_ASSETS.leadership.shanto,
    note: "Cultist who follows the shadow of honored one, mastering the thousand sword waves that bring calamity.",
  },
];
