export type Member = {
  inGame: string;
  discord: string;
  /** Extra Discord nick / @handle strings that should map to the same IGN. */
  discordAliases?: string[];
  role?: string;
};

/** Current roster — roles reserved for future highlights */
export const MEMBERS: Member[] = [
  { inGame: "Demonsau", discord: "Demonsau" },
  { inGame: "Linqi", discord: "Linqi" },
  { inGame: "RayAsher", discord: "Ray" },
  { inGame: "Jamun", discord: "James Venom" },
  {
    inGame: "Skengk",
    discord: "Skeng (Firefly)",
    discordAliases: ["skeng", "._skeng"],
  },
  { inGame: "Sylvely", discord: "Sylvely" },
  { inGame: "Beleriand'", discord: "Beleriand" },
  { inGame: "Hiromee (후미르)", discord: "Suze雨 | Hiromi" },
  { inGame: "YAmi", discord: "Yami" },
  { inGame: "Flourish", discord: "Noa" },
  { inGame: "Sayaka-", discord: "Sayaka" },
  { inGame: "LuXingwang", discord: "Lu❀" },
  { inGame: "SSRMOGGER", discord: "SSR" },
  { inGame: "minsi", discord: "min" },
  {
    inGame: "DrChilling",
    discord: "Dr_Chiling",
    discordAliases: ["Dr_Chilling", "dr_chilling", "DrChilling"],
  },
  { inGame: "Insanelyx", discord: "Insanely" },
  { inGame: "Cattermint", discord: "Catter Mint" },
  { inGame: "Sekaimirai", discord: "Sekai" },
  {
    inGame: "ZhangSiran",
    discord: "Sirano❄",
    discordAliases: [
      "Sirano❄️🦭",
      "张sīran❄️",
      "mylishengwe",
      "sirano❄",
    ],
  },
  { inGame: "Sena-sama", discord: "Sena-sama" },
  { inGame: "藍櫻月", discord: "Cleo" },
  {
    inGame: "銘千咲",
    discord: "銘千咲",
    discordAliases: ["銘千咲 (Skyzawa)", "skyzawa"],
  },
  { inGame: "CheungMyung", discord: "Re:shanto" },
  { inGame: "Salmonnns", discord: "Salmon" },
  { inGame: "「宝」", discord: "Zy" },
  { inGame: "Mings", discord: "Kam" },
  { inGame: "Meikey", discord: "Mikey" },
  { inGame: "Ryè", discord: "Mickey Mouse" },
  { inGame: "VAASANTH", discord: "Vaasanth" },
  {
    inGame: "Carefree",
    discord: "Carefree, Shark",
    discordAliases: ["carefree", "shark", ".111py"],
  },
  { inGame: "LanXuan", discord: "Lucifugus" },
  { inGame: "Xiaoyuexiang", discord: "Xiaoyuexiang" },
  { inGame: "Cheel", discord: "cheel" },
  { inGame: "Southpaw", discord: "Southpaw" },
  { inGame: "KenTJY", discord: "KenTJY" },
  { inGame: "Comespring", discord: "Comespring" },
  { inGame: "CyrusZyn", discord: "Cyrus" },
  { inGame: "kalabeda", discord: "BôôM" },
  { inGame: "Xavolon", discord: "Xavolon" },
  { inGame: "Wali", discord: "Wali" },
  { inGame: "WANg", discord: "WANG" },
  { inGame: "Infr", discord: "Hriday" },
  { inGame: "Joysrii", discord: "Jay" },
  { inGame: "Jaxseconds (Jellybean)", discord: "Jax" },
  { inGame: "Oleander", discord: "smithen" },
  {
    inGame: "AshFuuu",
    discord: "Ashfuuu",
    discordAliases: ["ashfuuugotnochill📈💪🏻", "ashfakjabed6884"],
  },
  { inGame: "KyouMei", discord: "Ethereal" },
  { inGame: "nagahime", discord: "ice" },
  {
    inGame: "LitchtDaCat",
    discord: "LichtDaCat",
    discordAliases: ["LitchtDaCat", "lichtdacat"],
  },
  { inGame: "Yieks", discord: "Yieks" },
  {
    inGame: "FengAoTian",
    discord: "Midnight Falcon (IGN:FengAoTian)",
  },
  { inGame: "Neko (Meowzart)", discord: "Neko" },
  { inGame: "慕容馨", discord: "SmoggyBelle" },
].sort((a, b) =>
  a.inGame.localeCompare(b.inGame, undefined, { sensitivity: "base" }),
);
