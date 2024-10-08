import * as vscode from "vscode";

import { OnTeamRefresh, Team, TeamAPI, TeamTreeEntry } from "./types";

export class TeamTreeDataProvider
  implements vscode.TreeDataProvider<TeamTreeEntry>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TeamTreeEntry | undefined | void
  > = new vscode.EventEmitter<TeamTreeEntry | undefined | void>();

  readonly onDidChangeTreeData: vscode.Event<TeamTreeEntry | undefined | void> =
    this._onDidChangeTreeData.event;

  public readonly api: TeamAPI;
  private readonly onTeamRefresh: OnTeamRefresh;

  public constructor(api: TeamAPI, onTeamRefresh: OnTeamRefresh) {
    this.api = api;

    this.onTeamRefresh = onTeamRefresh;
    this.onTeamRefresh.event(() => {
      this._onDidChangeTreeData.fire();
    });
  }

  public async getChildren(entry?: TeamTreeEntry): Promise<TeamTreeEntry[]> {
    const teams = await this.api.getTeams();

    const sortedTeams = [...teams].sort((a, b) => a.position - b.position);

    let entries: TeamTreeEntry[] = sortedTeams.map((data) => ({
      type: "team",
      data,
    }));

    return entries;
  }

  public getTreeItem(entry: TeamTreeEntry): vscode.TreeItem {
    switch (entry.type) {
      case "team":
        return new TeamTreeItem(entry.data);
    }
  }
}

export class TeamTreeItem extends vscode.TreeItem {
  public static readonly ICON = new vscode.ThemeIcon("account");

  public constructor(team: Team) {
    super(team.name, vscode.TreeItemCollapsibleState.None);

    this.description = `${team.position} Position, ${team.score} Points`;

    this.iconPath = TeamTreeItem.ICON;
  }
}
