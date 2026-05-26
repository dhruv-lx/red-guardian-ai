export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type ModerationSummaryRequest = {
  comments: string[];
};

export type ModerationSummaryResponse = {
  type: 'moderation-summary';
  toxicitySummary: string;
  moderationRecommendation: string;
  riskSeverity: string;
};
