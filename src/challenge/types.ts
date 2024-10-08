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
    getChallenge: (id: string) => Challenge | undefined, 
    getChallenges: () => readonly Challenge[],
    refreshChallenge: (id: string) => Promise<void>,
    refreshChallenges: () => Promise<void>,
    solveChallenge: (id: string, flag: string) => Promise<boolean>, 
}

export type OnChallengeRefresh = vscode.EventEmitter<string | null>;

export type ChallengeTreeID = {
    type: "challenge" | "category";
    id: string;
}
