import * as vscode from "vscode";

import {
  Challenge,
  ChallengeAPI,
  ChallengeTreeID,
  OnChallengeRefresh,
} from "./types";

export class ChallengeTreeDataProvider
  implements vscode.TreeDataProvider<ChallengeTreeID>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ChallengeTreeID | undefined | void
  > = new vscode.EventEmitter<ChallengeTreeID | undefined | void>();

  readonly onDidChangeTreeData: vscode.Event<
    ChallengeTreeID | undefined | void
  > = this._onDidChangeTreeData.event;

  public readonly api: ChallengeAPI;
  private readonly onChallengeRefresh: OnChallengeRefresh;

  public constructor(
    api: ChallengeAPI,
    onChallengeRefresh: OnChallengeRefresh
  ) {
    this.api = api;

    this.onChallengeRefresh = onChallengeRefresh;
    this.registerRefresh();
  }

  private registerRefresh() {
    this.onChallengeRefresh.event((id: string | null) => {
      this._onDidChangeTreeData.fire();
    });
  }

  public getParent(
    element: ChallengeTreeID
  ): vscode.ProviderResult<ChallengeTreeID> {
    switch (element.type) {
      case "category":
        return null;
      case "challenge":
        const challenge = this.api.getChallenge(element.id)!;

        return { type: "category", id: challenge.category };
    }
  }

  public async getChildren(
    element?: ChallengeTreeID
  ): Promise<ChallengeTreeID[]> {
    const challenges = this.api.getChallenges();

    let ids: ChallengeTreeID[] = [];

    if (element == null) {
      const categories = [
        ...new Set(challenges.map((challenge) => challenge.category)),
      ];
      const sortedCategories = categories.sort((a, b) =>
        a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase())
      );

      ids = sortedCategories.map((id) => ({
        type: "category",
        id,
      }));
    } else if (element.type === "category") {
      const filteredChallenges = challenges.filter(
        (challenge) => challenge.category === element.id
      );

      const sortedChallenges = filteredChallenges.sort((a, b) =>
        a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase())
      );

      ids = sortedChallenges.map((challenge) => ({
        type: "challenge",
        id: challenge.id,
      }));
    }

    return ids;
  }

  public getTreeItem(element: ChallengeTreeID): vscode.TreeItem {
    switch (element.type) {
      case "challenge":
        const challenge = this.api.getChallenge(element.id);
        if (!challenge) return {};

        return new ChallengeTreeItem(challenge);
      case "category":
        return new ChallengeCategoryTreeItem(element.id);
    }
  }
}

export class ChallengeTreeItem extends vscode.TreeItem {
  public static readonly SOLVED_ICON = new vscode.ThemeIcon("check");
  public static readonly TODO_ICON = new vscode.ThemeIcon("close");

  public constructor(challenge: Challenge) {
    super(challenge.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = challenge.solved
      ? "solved_challenge"
      : "todo_challenge";

    this.description = `${challenge.value} Points, ${challenge.solves} Solves`;

    this.iconPath = challenge.solved
      ? ChallengeTreeItem.SOLVED_ICON
      : ChallengeTreeItem.TODO_ICON;

    this.command = {
      title: "Search Challenge",
      command: "vs-ctf.search-challenge",
      arguments: [{ id: challenge.id }],
    };
  }
}

export class ChallengeCategoryTreeItem extends vscode.TreeItem {
  public static readonly ICON = vscode.ThemeIcon.Folder;

  public constructor(name: string) {
    super(name, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = "category";

    this.iconPath = ChallengeCategoryTreeItem.ICON;
  }
}
