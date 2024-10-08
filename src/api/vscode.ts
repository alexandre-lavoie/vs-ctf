import * as vscode from "vscode";

import {
  Challenge,
  ChallengeAPI,
  OnChallengeRefresh,
} from "../challenge/types";
import { CHALLENGE_KEY, CTF_TYPES, TEAM_KEY } from "../config";
import { OnTeamRefresh, Team, TeamAPI } from "../team/types";
import { CTFdAPI } from "./ctfd";
import { CustomAPI } from "./custom";

export class VSCodeAPI implements ChallengeAPI, TeamAPI {
  public static readonly CONFIG: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration("vs-ctf.ctf");

  public readonly context: vscode.ExtensionContext;
  public readonly onTeamRefresh: OnTeamRefresh = new vscode.EventEmitter();
  public readonly onChallengeRefresh: OnChallengeRefresh =
    new vscode.EventEmitter();

  private api: CTFdAPI | CustomAPI;
  private refreshConfiguration: vscode.Disposable;

  public constructor(context: vscode.ExtensionContext) {
    this.context = context;

    this.api = this.buildAPI();
    this.refreshConfiguration = this.registerRefreshConfiguration();
  }

  public async initialize(): Promise<void> {
    await this.api.refreshChallenges();
    await this.api.refreshTeams();
  }

  public dispose(): void {
    this.refreshConfiguration.dispose();
  }

  private buildAPI(): CTFdAPI | CustomAPI {
    const ctfType: (typeof CTF_TYPES)[number] = VSCodeAPI.CONFIG.get("type")!;

    switch (ctfType) {
      case "ctfd":
        return new CTFdAPI();
      case "custom":
        return new CustomAPI();
    }
  }

  private registerRefreshConfiguration(): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("vs-ctf.ctf.type")) {
        this.api = this.buildAPI();

        await this.api.refreshChallenges();
        await this.api.refreshTeams();
      }
    });
  }

  private mergeChallenge(old: Challenge | null, new_: Challenge): Challenge {
    return { ...(old || {}), ...new_ };
  }

  private mergeTeam(old: Team | null, new_: Team): Team {
    return { ...(old || {}), ...new_ };
  }

  public getChallenge(id: string): Challenge | null {
    return this.context.workspaceState.get(`${CHALLENGE_KEY}${id}`) || null;
  }

  public getChallenges(): readonly Challenge[] {
    return this.context.workspaceState
      .keys()
      .filter((key) => key.startsWith(CHALLENGE_KEY))
      .map((key) => this.context.workspaceState.get(key)!);
  }

  public async refreshChallenge(id: string): Promise<boolean> {
    if (!(await this.api.refreshChallenge(id))) return false;

    await this.refreshChallengeInternal(id, true);

    return true;
  }

  private async refreshChallengeInternal(
    id: string,
    update: boolean
  ): Promise<void> {
    const new_ = this.api.getChallenge(id);
    if (!new_) return;

    const key = `${CHALLENGE_KEY}${new_.id}`;

    const old: Challenge | null = this.context.workspaceState.get(key) || null;

    this.context.workspaceState.update(key, this.mergeChallenge(old, new_));

    if (update) this.onChallengeRefresh.fire(id);
  }

  public async refreshChallenges(): Promise<boolean> {
    if (!(await this.api.refreshChallenges())) return false;

    await this.refreshChallengesInteral();

    return true;
  }

  private async refreshChallengesInteral(): Promise<void> {
    this.api
      .getChallenges()
      .forEach((entry) => this.refreshChallengeInternal(entry.id, false));

    this.onChallengeRefresh.fire(null);
  }

  public async solveChallenge(id: string, flag: string): Promise<boolean> {
    if (!(await this.api.solveChallenge(id, flag))) return false;

    await this.refreshChallenge(id);

    return true;
  }

  public getTeam(id: string): Team | null {
    return this.context.workspaceState.get(`${TEAM_KEY}${id}`) || null;
  }

  public async getTeamId(): Promise<string | null> {
    return this.api.getTeamId();
  }

  public getTeams(): readonly Team[] {
    return this.context.workspaceState
      .keys()
      .filter((key) => key.startsWith(TEAM_KEY))
      .map((key) => this.context.workspaceState.get(key)!);
  }

  public async refreshTeam(id: string): Promise<boolean> {
    if (!(await this.refreshTeam(id))) return false;

    await this.refreshTeamInternal(id, true);

    return true;
  }

  private async refreshTeamInternal(
    id: string,
    update: boolean
  ): Promise<void> {
    const new_ = this.api.getTeam(id);
    if (!new_) return;

    const key = `${TEAM_KEY}${new_.id}`;

    const old: Team | null = this.context.workspaceState.get(key) || null;

    this.context.workspaceState.update(key, this.mergeTeam(old, new_));

    if (update) this.onTeamRefresh.fire(id);
  }

  public async refreshTeams(): Promise<boolean> {
    if (!(await this.api.refreshTeams())) return false;

    await this.refreshTeamsInteral();

    return true;
  }

  private async refreshTeamsInteral(): Promise<void> {
    this.api
      .getTeams()
      .forEach((entry) => this.refreshTeamInternal(entry.id, false));

    this.onTeamRefresh.fire(null);
  }
}
