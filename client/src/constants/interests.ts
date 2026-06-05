export const MUSIC_INTERESTS = [
  "Vocals",
  "Guitar",
  "Piano",
  "Drums",
  "Producer",
  "Rap",
  "Jazz",
  "Pop",
  "Rock",
  "Acoustic",
] as const;

export const INTEREST_DISPLAY: Record<
  (typeof MUSIC_INTERESTS)[number],
  string
> = {
  Vocals: "🎤 Vocals",
  Guitar: "🎸 Guitar",
  Piano: "🎹 Piano",
  Drums: "🥁 Drums",
  Producer: "🎧 Producer",
  Rap: "🎤 Rap",
  Jazz: "🎷 Jazz",
  Pop: "🎵 Pop",
  Rock: "🎸 Rock",
  Acoustic: "🎻 Acoustic",
};

export type MusicInterest = (typeof MUSIC_INTERESTS)[number];

export type MatchMode = "random" | "interest";
