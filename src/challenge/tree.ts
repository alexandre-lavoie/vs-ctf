import * as vscode from "vscode";

import { Challenge, ChallengeAPI, ChallengeTreeEntry } from "./types";

export class ChallengeTreeDataProvider implements vscode.TreeDataProvider<ChallengeTreeEntry> {
    private _onDidChangeTreeData: vscode.EventEmitter<ChallengeTreeEntry | undefined | void> = new vscode.EventEmitter<ChallengeTreeEntry | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<ChallengeTreeEntry | undefined | void> = this._onDidChangeTreeData.event;

    public readonly api: ChallengeAPI;

    public constructor(api: ChallengeAPI) {
        this.api = api;
    }

    public async getChildren(entry?: ChallengeTreeEntry): Promise<ChallengeTreeEntry[]> {
        const challenges = await this.api.getChallenges();

        let entries: ChallengeTreeEntry[] = [];

        if (entry == null) {
            const categories = [...new Set(challenges.map((challenge) => challenge.category))];
            const sortedCategories = categories.sort((a, b) => a.localeCompare(b));

            entries = sortedCategories.map((data) => ({
                type: "category",
                data
            }));
        } else if (entry.type === "category") {
            const filteredChallenges = challenges.filter((challenge) => challenge.category === entry.data);

            entries = filteredChallenges.map((data) => ({
                type: "challenge",
                data
            }));
        } else if (entry.type == "challenge") {
            entries = [
                {
                    type: "file",
                    data: "TODO"
                }
            ];
        }

        return entries;
    }

    public getTreeItem(entry: ChallengeTreeEntry): vscode.TreeItem {
        switch (entry.type) {
            case "challenge":
                return new ChallengeTreeItem(entry.data);
            case "category":
                return new ChallengeCategoryTreeItem(entry.data);
            case "file":
                return new ChallengeFileTreeItem(entry.data);
        }
    }
}

export class ChallengeTreeItem extends vscode.TreeItem {
    public static readonly SOLVED_ICON = new vscode.ThemeIcon("check");
    public static readonly TODO_ICON = new vscode.ThemeIcon("close");

    public constructor(challenge: Challenge) {
        super(challenge.name, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = `challenge_${challenge.solved ? "done" : "todo"}`;

        this.description = `${challenge.value} Points, ${challenge.solves} Solves`;

        this.iconPath = challenge.solved ? ChallengeTreeItem.SOLVED_ICON : ChallengeTreeItem.TODO_ICON;
    }
}

export class ChallengeCategoryTreeItem extends vscode.TreeItem {
    public static readonly ICON = vscode.ThemeIcon.Folder;

    public constructor(name: string) {
        super(name, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = "category";

        this.iconPath = ChallengeCategoryTreeItem.ICON;
    }
}

export class ChallengeFileTreeItem extends vscode.TreeItem {
    public constructor(name: string) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.contextValue = "file";

        this.resourceUri = vscode.Uri.parse("/etc/passwd");
    }
}
