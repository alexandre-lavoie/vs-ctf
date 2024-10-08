import * as vscode from "vscode";

export interface Team {
    id: string;
    name: string;
    position: number;
    score: number;
}

export interface TeamAPI {
    getTeams: () => readonly Team[],
    refreshTeam: (id: string) => Promise<void>,
    refreshTeams: () => Promise<void>,
}

export interface TeamTreeItem {
    type: "team",
    data: Team,
}

export type OnTeamRefresh = vscode.EventEmitter<string | null>;

export type TeamTreeEntry = TeamTreeItem;
