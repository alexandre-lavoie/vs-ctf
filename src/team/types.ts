import * as vscode from "vscode";

export interface Team {
  id: string;
  name: string;
  position: number;
  score: number;
}

export interface TeamAPI {
  getTeamId: () => Promise<string | null>;
  getTeam: (id: string) => Team | null;
  getTeams: () => readonly Team[];
  refreshTeam: (id: string) => Promise<boolean>;
  refreshTeams: () => Promise<boolean>;
}

export interface TeamTreeItem {
  type: "team";
  data: Team;
}

export type OnTeamRefresh = vscode.EventEmitter<string | null>;

export type TeamTreeID = string;
