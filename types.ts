
export interface VideoDetails {
  title: string;
  channelName: string;
  views: string;
  uploadDate: string;
  thumbnailUrl: string;
  avatarUrl: string;
  isVerified: boolean;
}

export interface ScorecardItem {
  category: string;
  description: string;
  strengthScore: number; // 1-100
}

export type AnalysisLength = 'short' | 'medium' | 'long';
