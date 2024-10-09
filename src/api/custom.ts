import * as vscode from "vscode";

import { Challenge, ChallengeAPI } from "../challenge/types";
import { Team, TeamAPI } from "../team/types";

export class CustomAPI implements ChallengeAPI, TeamAPI {
  public readonly context: vscode.ExtensionContext;

  public constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public async getTeamId(): Promise<string | null> {
    return null;
  }

  public getChallenge(id: string): Challenge | null {
    return null;
  }

  public getChallenges(): readonly Challenge[] {
    return [];
  }

  public async refreshChallenge(id: string): Promise<boolean> {
    return false;
  }

  public async refreshChallenges(): Promise<boolean> {
    return false;
  }

  public async solveChallenge(id: string, flag: string): Promise<boolean> {
    return true;
  }

  public async downloadChallenge(
    id: string,
    uri: vscode.Uri
  ): Promise<boolean> {
    return false;
  }

  public getTeam(id: string): Team | null {
    return null;
  }

  public getTeams(): readonly Team[] {
    return [];
  }

  public async refreshTeam(id: string): Promise<boolean> {
    return false;
  }

  public async refreshTeams(): Promise<boolean> {
    return false;
  }
}
