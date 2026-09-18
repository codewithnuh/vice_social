/**
 * Vice Social — shared types & mock data.
 * Ported from the reference HTML state + feed posts.
 */

export type ScreenId =
  | "entry"
  | "feed"
  | "momentSelect"
  | "studio"
  | "reveal";

export type FeedTab = "trending" | "nearby" | "following";

export interface VicePost {
  id: number;
  author: string;
  avatar: string;
  category: string;
  image: string;
  caption: string;
  likes: number;
  comments: number;
  repBonus: string;
  time: string;
  liked: boolean;
}

export const CURRENT_USER = {
  name: "Jax_Viper",
  crew: "@ViceOutlaws",
  avatar:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  repLevel: 24,
} as const;

export const SEED_POSTS: VicePost[] = [
  {
    id: 1,
    author: "Razor_V8",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    category: "Vehicle Showcase",
    image:
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=900&q=80",
    caption:
      "Custom turbocharged twin engine flex outside Ocean Beach marina 🔥 #ViceSocial #CustomRide",
    likes: 1240,
    comments: 89,
    repBonus: "+350 REP",
    time: "12m ago",
    liked: false,
  },
  {
    id: 2,
    author: "Kira_Neon",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    category: "Night Life",
    image:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80",
    caption:
      "Malibu Club rooftop session with the full crew tonight 🌴 Miami synthwave energy only.",
    likes: 3410,
    comments: 215,
    repBonus: "+500 REP",
    time: "45m ago",
    liked: false,
  },
  {
    id: 3,
    author: "Synth_God",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    category: "Street Moment",
    image:
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=900&q=80",
    caption:
      "Downtown alleyways hit different under rain and neon lights. Captured on Vice ID Engine.",
    likes: 890,
    comments: 42,
    repBonus: "+200 REP",
    time: "2h ago",
    liked: false,
  },
];

export const HOT_DISTRICTS: ReadonlyArray<{ tag: string; moments: string }> = [
  { tag: "#OceanDriveRaces", moments: "2.4k moments" },
  { tag: "#MalibuNightlife", moments: "1.8k moments" },
  { tag: "#CrewWarfare", moments: "950 moments" },
  { tag: "#SupercarShowcase", moments: "3.1k moments" },
];

export interface TickerEvent {
  id: string;
  html: ReadonlyArray<{ text: string; tone: "pink" | "gold" | "cyan" | "white" | "plain" }>;
  ago: string;
}

export const CITY_TICKER: TickerEvent[] = [
  {
    id: "t1",
    html: [
      { text: "@Kira_Neon", tone: "pink" },
      { text: " uploaded a new Street Moment from ", tone: "plain" },
      { text: "Starfish Island", tone: "white" },
      { text: ".", tone: "plain" },
    ],
    ago: "2 mins ago",
  },
  {
    id: "t2",
    html: [
      { text: "Bounty Alert:", tone: "gold" },
      { text: " Top photo of the hour earns +500 REP Bonus!", tone: "plain" },
    ],
    ago: "5 mins ago",
  },
  {
    id: "t3",
    html: [
      { text: "@Synth_God", tone: "cyan" },
      { text: " unlocked trophy ", tone: "plain" },
      { text: '"Night City Legend"', tone: "white" },
      { text: "", tone: "plain" },
    ],
    ago: "12 mins ago",
  },
];

export const SPLASH_PREVIEWS = [
  {
    id: "preview-trending",
    label: "TRENDING MOMENT",
    labelClass: "text-slate-400",
    title: "@Razor_V8",
    titleClass: "text-neon-pink",
    body: '"Midnight run through Ocean Park..."',
    cardClass: "-rotate-3",
  },
  {
    id: "preview-crew",
    label: "NEW CREW ALERT",
    labelClass: "text-neon-cyan",
    title: "★ SYNTH KINGS",
    titleClass: "text-white",
    body: "Rank #1 District Domination",
    cardClass: "translate-y-2",
  },
  {
    id: "preview-bounty",
    label: "BOUNTY CLAIMED",
    labelClass: "text-amber-gold",
    title: "+2,500 REP",
    titleClass: "text-amber-gold",
    body: "Identity Card Customized",
    cardClass: "rotate-3",
  },
] as const;
