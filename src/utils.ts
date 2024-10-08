import * as vscode from "vscode";

import { Challenge, ChallengeAPI } from "./challenge/types";
import { Team, TeamAPI } from "./team/types";

const BAD_CHARS = `!"#$%&'()*+,./:;<=>?@[\]^\`{|}~`;

export function stringToSafePath(value: string): string {
  value = value.replaceAll(" ", "_").toLowerCase();

  for (let i = 0; i < BAD_CHARS.length; i++) {
    value = value.replaceAll(BAD_CHARS.charAt(i), "");
  }

  return value;
}

export function extractFileName(uri: string): string {
  const uriObj = vscode.Uri.parse(uri);
  const sections = uriObj.path.split("/");
  return sections[sections.length - 1];
}

export async function showChallengePicker(
  api: ChallengeAPI
): Promise<Challenge | null> {
  const challenges = api.getChallenges();

  const name = await vscode.window.showQuickPick(
    challenges.map((challenge) => challenge.name),
    { canPickMany: false }
  );
  if (name == null) return null;

  const challenge = challenges.find((challenge) => challenge.name === name);
  if (challenge == null) return null;

  return challenge;
}

export async function showTeamPicker(api: TeamAPI): Promise<Team | null> {
  const teams = api.getTeams();

  const name = await vscode.window.showQuickPick(
    teams.map((team) => team.name),
    { canPickMany: false }
  );
  if (name === undefined) return null;

  const team = teams.find((team) => team.name === name);
  if (team === undefined) return null;

  return team;
}
