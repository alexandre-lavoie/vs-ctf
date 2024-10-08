import * as vscode from "vscode";

import { Challenge } from "./challenge/types";
import { stringToSafePath } from "./utils";

function templateFolder(extensionUri: vscode.Uri) {
  const config = vscode.workspace.getConfiguration("vs-ctf");

  const customTemplateFolder: string | undefined = config.get("template");
  if (customTemplateFolder) {
    return vscode.Uri.parse(customTemplateFolder);
  } else {
    return vscode.Uri.joinPath(extensionUri, "resources", "template");
  }
}

export async function updateWorkspaceFolder(
  extensionUri: vscode.Uri,
  workspaceUri: vscode.Uri
): Promise<void> {
  const sourceWorkspaceUri = vscode.Uri.joinPath(
    templateFolder(extensionUri),
    "workspace"
  );

  const files = await vscode.workspace.fs.readDirectory(sourceWorkspaceUri);

  await Promise.all(
    files.map(async ([name]) => {
      const sourceUri = vscode.Uri.joinPath(sourceWorkspaceUri, name);
      const destUri = vscode.Uri.joinPath(workspaceUri, name);

      try {
        await vscode.workspace.fs.stat(destUri);
        return;
      } catch {}

      await vscode.workspace.fs.copy(sourceUri, destUri);
    })
  );
}

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
    templateFolder(extensionUri),
    "challenge"
  );
  await vscode.workspace.fs.copy(sourceChallengePath, challengePath);
}
