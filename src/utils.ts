import path from "path";
import * as vscode from "vscode";

import { Challenge, ChallengeAPI } from "./challenge/types";
import { Team, TeamAPI } from "./team/types";

export function stringToSafePath(value: string): string {
  value = value.trim().replaceAll(" ", "_").toLowerCase();

  const letters = [];

  for (let i = 0; i < value.length; i++) {
    const char = value.charAt(i);
    const code = value.charCodeAt(i);

    if (
      (48 <= code && code <= 57) ||
      (97 <= code && code <= 122) ||
      code === 45 ||
      code === 95
    ) {
      letters.push(char);
    }
  }

  const out = letters.join("").replaceAll(/_+/g, "_").replace(/_$/, "");

  return out;
}

export function extractFileName(uri: string): string {
  const uriObj = vscode.Uri.parse(uri);

  return path.basename(uriObj.path);
}

export async function showChallengePick(
  api: ChallengeAPI
): Promise<Challenge | null> {
  const challenges = api.getChallenges();

  const name = await vscode.window.showQuickPick(
    challenges
      .map((challenge) => challenge.name)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    { canPickMany: false }
  );
  if (name == null) return null;

  const challenge = challenges.find((challenge) => challenge.name === name);
  if (challenge == null) return null;

  return challenge;
}

export async function showTeamPick(api: TeamAPI): Promise<Team | null> {
  const teams = api.getTeams();

  const name = await vscode.window.showQuickPick(
    teams
      .map((team) => team.name)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    { canPickMany: false }
  );
  if (name === undefined) return null;

  const team = teams.find((team) => team.name === name);
  if (team === undefined) return null;

  return team;
}

export function getActiveWorkspaceFolder(): vscode.WorkspaceFolder | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return null;
  return folders[0];
}

export async function revealFolderRecursive(
  baseUri: vscode.Uri
): Promise<void> {
  let stat;
  try {
    stat = await vscode.workspace.fs.stat(baseUri);
  } catch {
    return;
  }

  const queue: [vscode.Uri, vscode.FileType][] = [[baseUri, stat.type]];

  const files: vscode.Uri[] = [];

  while (true) {
    const next = queue.pop();
    if (!next) break;

    const [uri, type] = next;

    if (type === vscode.FileType.File) {
      files.push(uri);
      continue;
    }

    const directory = await vscode.workspace.fs.readDirectory(uri);

    queue.push(
      ...directory.map(
        ([name, type]) =>
          [vscode.Uri.joinPath(uri, name), type] as [
            vscode.Uri,
            vscode.FileType,
          ]
      )
    );
  }

  const seenPath = new Set();

  for (let file of files) {
    const dir = path.dirname(file.path);
    if (seenPath.has(dir)) continue;
    seenPath.add(dir);

    await vscode.commands.executeCommand("revealInExplorer", file);
  }
}
