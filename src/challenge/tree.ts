import * as vscode from "vscode";

import { Challenge, ChallengeAPI, ChallengeTreeEntry, OnChallengeRefresh } from "./types";

export class ChallengeTreeDataProvider implements vscode.TreeDataProvider<ChallengeTreeEntry> {
    private _onDidChangeTreeData: vscode.EventEmitter<ChallengeTreeEntry | undefined | void> = new vscode.EventEmitter<ChallengeTreeEntry | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<ChallengeTreeEntry | undefined | void> = this._onDidChangeTreeData.event;

    public readonly api: ChallengeAPI;
    private readonly onChallengeRefresh: OnChallengeRefresh;

    public constructor(api: ChallengeAPI, onChallengeRefresh: OnChallengeRefresh) {
        this.api = api;
        this.onChallengeRefresh = onChallengeRefresh;

        this.onChallengeRefresh.event(() => {
            this._onDidChangeTreeData.fire();
        });
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
        } else {
            switch (entry.type) {
                case "category": {
                    const filteredChallenges = challenges.filter((challenge) => challenge.category === entry.data);

                    entries = filteredChallenges.map((data) => ({
                        type: "challenge",
                        data
                    }));

                } break;
            }
        }

        return entries;
    }

    public getTreeItem(entry: ChallengeTreeEntry): vscode.TreeItem {
        switch (entry.type) {
            case "challenge":
                return new ChallengeTreeItem(entry.data);
            case "category":
                return new ChallengeCategoryTreeItem(entry.data);
        }
    }
}

export class ChallengeTreeItem extends vscode.TreeItem {
    public static readonly SOLVED_ICON = new vscode.ThemeIcon("check");
    public static readonly TODO_ICON = new vscode.ThemeIcon("close");

    public constructor(challenge: Challenge) {
        super(challenge.name, vscode.TreeItemCollapsibleState.None);
        this.contextValue = `challenge_${challenge.solved ? "done" : "todo"}`;

        this.description = `${challenge.value} Points, ${challenge.solves} Solves`;

        this.iconPath = challenge.solved ? ChallengeTreeItem.SOLVED_ICON : ChallengeTreeItem.TODO_ICON;

        this.command = {
            title: "View challenge",
            command: "vs-ctf.view-challenge",
            arguments: [{data: challenge}]
        };
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
