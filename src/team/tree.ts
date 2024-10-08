import * as vscode from "vscode";

import { OnTeamRefresh, Team, TeamAPI, TeamTreeID } from "./types";

export class TeamTreeDataProvider
  implements vscode.TreeDataProvider<TeamTreeID>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TeamTreeID | undefined | void
  > = new vscode.EventEmitter<TeamTreeID | undefined | void>();

  readonly onDidChangeTreeData: vscode.Event<TeamTreeID | undefined | void> =
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

  public getParent(element: TeamTreeID): vscode.ProviderResult<TeamTreeID> {
    return null;
  }

  public async getChildren(element?: TeamTreeID): Promise<TeamTreeID[]> {
    if (element) return [];

    const teams = await this.api.getTeams();

    const sortedTeams = [...teams].sort((a, b) => a.position - b.position);

    let entries: TeamTreeID[] = sortedTeams.map((team) => team.id);

    return entries;
  }

  public getTreeItem(element: TeamTreeID): vscode.TreeItem {
    const team = this.api.getTeam(element);
    if (!team) return {};

    return new TeamTreeItem(team);
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
