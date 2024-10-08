import * as vscode from "vscode";

export interface Challenge {
  id: string;
  name: string;
  category: string;
  value: number;
  solves: number;
  solved: boolean;
  description?: string;
  connection?: string;
  files?: string[];
}

export interface ChallengeAPI {
  getChallenge: (id: string) => Challenge | null;
  getChallenges: () => readonly Challenge[];
  refreshChallenge: (id: string) => Promise<boolean>;
  refreshChallenges: () => Promise<boolean>;
  solveChallenge: (id: string, flag: string) => Promise<boolean>;
}

export type OnChallengeRefresh = vscode.EventEmitter<string | null>;

export type ChallengeTreeID = {
  type: "challenge" | "category";
  id: string;
};
