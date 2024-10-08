import * as vscode from "vscode";

export interface Challenge {
    id: string;
    name: string;
    category: string;
    description: string;
    value: number;
    solves: number;
    solved: boolean;
    files: string[];
}

export interface ChallengeAPI {
    getChallenge: (id: string) => Promise<Challenge | undefined>, 
    getChallenges: () => Promise<readonly Challenge[]>,
    refreshChallenge: (id: string) => Promise<void>,
    refreshChallenges: () => Promise<void>,
    solveChallenge: (id: string, flag: string) => Promise<boolean>, 
}

export interface ChallengeTreeItem {
    type: "challenge",
    data: Challenge,
}

export interface ChallengeCategoryTreeItem {
    type: "category",
    data: string,
}

export type OnChallengeRefresh = vscode.EventEmitter<string | null>;

export type ChallengeTreeEntry = ChallengeTreeItem | ChallengeCategoryTreeItem;
