export interface Challenge {
    id: string;
    name: string;
    category: string;
    description: string;
    value: number;
    solves: number;
    solved: boolean;
}

export interface ChallengeAPI {
    getChallenges: () => readonly Challenge[],
    refreshChallenges: () => void,
}

interface ChallengeTreeItem {
    type: "challenge",
    data: Challenge,
}

interface ChallengeCategoryTreeItem {
    type: "category",
    data: string,
}

interface ChallengeFileTreeItem {
    type: "file",
    data: string,
}

export type ChallengeTreeEntry = ChallengeTreeItem | ChallengeCategoryTreeItem | ChallengeFileTreeItem;
