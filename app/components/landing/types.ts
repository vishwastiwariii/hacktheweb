// Data the server page hands to the landing experience. Every field degrades
// gracefully: an empty array / null / 0 just switches a section into its
// "awaiting event" or simulation mode.
export type LandingEvent = {
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  registrationOpen: boolean;
};

export type LandingRepo = {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string | null;
  issueCount: number;
};

export type LandingTeam = {
  teamId: string;
  name: string;
  score: number;
  memberCount: number;
  rank: number;
};

export type LandingData = {
  signedIn: boolean;
  event: LandingEvent | null;
  repos: LandingRepo[];
  issueCount: number;
  solvedCount: number;
  leaderboard: LandingTeam[];
};
