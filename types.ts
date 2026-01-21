
export interface SmokeLog {
  id: string;
  timestamp: number;
  percentage: number; // 0-100
  priceAtTime: number; // Price of one cigarette when logged
}

export interface StreakLog {
  id: string;
  startTimestamp: number;
  endTimestamp: number;
  durationMs: number;
}

export interface UserSettings {
  dailyLimit: number;
  pricePerCigarette: number;
  quitDate: number;
}

export interface DailySummary {
  date: string;
  totalUnits: number;
  count: number;
  cost: number;
}

export interface StreakSummary {
  date: string;
  durationHours: number;
}
