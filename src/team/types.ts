export interface Team {
    id: string;
    name: string;
    position: number;
    score: number;
}

export interface TeamAPI {
    getTeams: () => Promise<readonly Team[]>,
    refreshTeams: () => Promise<void>,
}

export interface TeamTreeItem {
    type: "team",
    data: Team,
}

export type TeamTreeEntry = TeamTreeItem;
