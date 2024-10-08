import * as vscode from "vscode";

import { Challenge } from "./challenge/types";
import { stringToSafePath } from "./utils";

export async function updateChallengeFolder(
  extensionUri: vscode.Uri,
  workspaceUri: vscode.Uri,
  challenge: Challenge
): Promise<void> {
  const challengePath = vscode.Uri.joinPath(
    workspaceUri,
    stringToSafePath(challenge.name)
  );

  try {
    await vscode.workspace.fs.stat(challengePath);
    return;
  } catch {}

  const sourceChallengePath = vscode.Uri.joinPath(
    extensionUri,
    "resources",
    "template",
    "challenge"
  );
  await vscode.workspace.fs.copy(sourceChallengePath, challengePath);
}
