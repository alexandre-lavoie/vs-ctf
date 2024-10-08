import * as vscode from "vscode";

import { VSCodeAPI } from "./api/vscode";
import { ChallengeTreeDataProvider } from "./challenge/tree";
import {
  Challenge,
  ChallengeAPI,
  ChallengeTreeID,
  OnChallengeRefresh,
} from "./challenge/types";
import { ChallengeWebview } from "./challenge/view";
import { CTF_TYPES, FLAG_KEY } from "./config";
import { updateChallengeFolder, updateWorkspaceFolder } from "./fileSystem";
import { TeamTreeDataProvider } from "./team/tree";
import { OnTeamRefresh, TeamAPI } from "./team/types";
import { showChallengePicker, showTeamPicker, stringToSafePath } from "./utils";

interface RegisterData {
  context: vscode.ExtensionContext;
  api: ChallengeAPI & TeamAPI;
  onTeamRefresh: OnTeamRefresh;
  onChallengeRefresh: OnChallengeRefresh;
}

export function activate(context: vscode.ExtensionContext): void {
  const api = new VSCodeAPI(context);
  api.initialize();

  const props: RegisterData = {
    api,
    context,
    onTeamRefresh: api.onTeamRefresh,
    onChallengeRefresh: api.onChallengeRefresh,
  };

  const registers = [
    registerConfigure,
    registerRefreshConfiguration,
    registerChallengeProvider,
    registerTeamProvider,
    registerRefreshChallenge,
    registerOpenChallenge,
    registerViewChallenge,
    registerSolveChallenge,
    registerRefreshScoreboard,
    registerSearchTeam,
    registerSearchChallenge,
    registerGotoMe,
  ];

  registers.forEach((register) => register(props));
}

function registerConfigure(props: RegisterData): void {
  const command = vscode.commands.registerCommand(
    "vs-ctf.configure",
    async () => {
      const config = vscode.workspace.getConfiguration("vs-ctf");

      const ctfType = await vscode.window.showQuickPick(CTF_TYPES, {
        title: "What platform is this CTF running on?",
        canPickMany: false,
        ignoreFocusOut: true,
      });
      if (!ctfType) return;
      await config.update("ctf.type", ctfType);

      const url = await vscode.window.showInputBox({
        title: "What is the URL of the CTF?",
        value: config.get("ctf.url"),
        ignoreFocusOut: true,
      });
      if (!url) return;
      await config.update("ctf.url", url);

      switch (ctfType) {
        case "ctfd":
          {
            const token = await vscode.window.showInputBox({
              title: "What is your CTFd session token or api key?",
              value: config.get("ctfd.token"),
              password: true,
              ignoreFocusOut: true,
            });
            if (!token) return;
            await config.update("ctfd.token", token);
          }
          break;
      }

      await config.update("ctf.enabled", true);
    }
  );

  props.context.subscriptions.push(command);
}

function registerChallengeProvider(props: RegisterData): void {
  const provider = new ChallengeTreeDataProvider(
    props.api,
    props.onChallengeRefresh
  );

  vscode.window.registerTreeDataProvider("vs-ctf.challenges", provider);

  const tree = vscode.window.createTreeView("vs-ctf.challenges", {
    treeDataProvider: provider,
  });

  const command = vscode.commands.registerCommand(
    "vs-ctf.goto-challenge",
    (id: { id: string }) => {
      tree.reveal({ type: "challenge", id: id.id });
      vscode.commands.executeCommand("vs-ctf.view-challenge", id);
    }
  );

  props.context.subscriptions.push(command);
}

function registerTeamProvider(props: RegisterData): void {
  const treeDataProvider = new TeamTreeDataProvider(
    props.api,
    props.onTeamRefresh
  );

  vscode.window.registerTreeDataProvider("vs-ctf.scoreboard", treeDataProvider);

  const tree = vscode.window.createTreeView("vs-ctf.scoreboard", {
    treeDataProvider,
  });

  const listener = vscode.commands.registerCommand(
    "vs-ctf.goto-team",
    async (id: { id: string }) => {
      tree.reveal(id.id);
    }
  );

  props.context.subscriptions.push(listener);
}

function registerRefreshConfiguration(props: RegisterData): void {
  const listener = vscode.workspace.onDidChangeConfiguration(async (event) => {
    const config = vscode.workspace.getConfiguration("vs-ctf");

    let folder = undefined;
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
    ) {
      folder = vscode.workspace.workspaceFolders[0];
    }

    if (event.affectsConfiguration("vs-ctf.ctf.enabled")) {
      if (folder && config.get("ctf.enabled")) {
        await updateWorkspaceFolder(props.context.extensionUri, folder.uri);
      }
    }
  });

  props.context.subscriptions.push(listener);
}

function registerRefreshChallenge(props: RegisterData): void {
  const listener = vscode.commands.registerCommand(
    "vs-ctf.refresh-challenges",
    async () => {
      await props.api.refreshChallenges();
    }
  );

  props.context.subscriptions.push(listener);
}

function registerOpenChallenge(props: RegisterData): void {
  const listener = vscode.commands.registerCommand(
    "vs-ctf.open-challenge",
    async (id: ChallengeTreeID) => {
      const challenge = props.api.getChallenge(id.id);
      if (!challenge) return;

      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) return;
      const folder = folders[0];

      await updateChallengeFolder(
        props.context.extensionUri,
        folder.uri,
        challenge
      );

      const path = vscode.Uri.joinPath(
        folder.uri,
        stringToSafePath(challenge.name),
        "README.md"
      );

      await vscode.commands.executeCommand(
        "workbench.files.action.collapseExplorerFolders"
      );

      await vscode.commands.executeCommand("revealInExplorer", path);
    }
  );

  props.context.subscriptions.push(listener);
}

function registerSearchChallenge(props: RegisterData): void {
  const listener = vscode.commands.registerCommand(
    "vs-ctf.search-challenge",
    async () => {
      const challenge = await showChallengePicker(props.api);
      if (!challenge) return;

      await vscode.commands.executeCommand("vs-ctf.goto-challenge", {
        id: challenge.id,
      });
    }
  );

  props.context.subscriptions.push(listener);
}

function registerViewChallenge(props: RegisterData): void {
  const challengeViews: Record<string, ChallengeWebview> = {};

  const listener = vscode.commands.registerCommand(
    "vs-ctf.view-challenge",
    async (entry: { id: string }) => {
      const challenge = props.api.getChallenge(entry.id);
      if (!challenge) return;

      let view = challengeViews[challenge.id];
      if (!view) {
        view = challengeViews[challenge.id] = new ChallengeWebview(
          props.api,
          challenge.id,
          props.context.extensionUri,
          props.onChallengeRefresh
        );
      }

      await view.showPanel();

      await props.api.refreshChallenge(entry.id);
    }
  );

  props.context.subscriptions.push(listener);
}

function registerSolveChallenge(props: RegisterData): void {
  const listener = vscode.commands.registerCommand(
    "vs-ctf.solve-challenge",
    async (entry?: { id: string }) => {
      let challenge: Challenge | null;
      if (entry) {
        challenge = props.api.getChallenge(entry.id);
      } else {
        challenge = await showChallengePicker(props.api);
      }

      if (!challenge) return;

      const flagKey = `${FLAG_KEY}${challenge.id}`;
      const value: string | undefined =
        props.context.workspaceState.get(flagKey) || undefined;

      const flag = await vscode.window.showInputBox({
        value,
        placeHolder: "Enter flag...",
      });
      if (!flag) {
        return;
      }

      const cleanFlag = flag.trim();
      await props.context.workspaceState.update(flagKey, cleanFlag);

      if (await props.api.solveChallenge(challenge.id, cleanFlag)) {
        vscode.window.showInformationMessage("Valid flag");
      } else {
        vscode.window.showErrorMessage("Invalid flag");
      }
    }
  );

  props.context.subscriptions.push(listener);
}

function registerSearchTeam(props: RegisterData): void {
  const listener = vscode.commands.registerCommand(
    "vs-ctf.search-team",
    async () => {
      const team = await showTeamPicker(props.api);
      if (!team) return;

      await vscode.commands.executeCommand("vs-ctf.goto-team", {
        id: team.id,
      });
    }
  );

  props.context.subscriptions.push(listener);
}

function registerGotoMe(props: RegisterData): void {
  const listener = vscode.commands.registerCommand(
    "vs-ctf.goto-me",
    async () => {
      const id = await props.api.getTeamId();
      if (!id) return;

      await vscode.commands.executeCommand("vs-ctf.goto-team", {
        id,
      });
    }
  );

  props.context.subscriptions.push(listener);
}

function registerRefreshScoreboard(props: RegisterData): void {
  const listener = vscode.commands.registerCommand(
    "vs-ctf.refresh-scoreboard",
    async () => {
      await props.api.refreshTeams();
    }
  );

  props.context.subscriptions.push(listener);
}

export function deactivate(): void {}
