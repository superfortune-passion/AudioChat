export const MUSIC_INTERESTS = [
  "Guitar",
  "Piano/Keys",
  "Drums",
  "Vocals",
  "Bass",
  "Production",
  "Songwriting",
  "Jamming",
  "Jazz",
  "Rock",
  "Hip-Hop",
  "Electronic",
  "Classical",
  "Folk",
  "Metal",
] as const;

export type MusicInterest = (typeof MUSIC_INTERESTS)[number];

export type MatchMode = "random" | "interest";
