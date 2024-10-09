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
import {
  getActiveWorkspaceFolder,
  revealFolderRecursive,
  showChallengePick,
  showTeamPick,
  stringToSafePath,
} from "./utils";

interface RegisterData {
  context: vscode.ExtensionContext;
  api: ChallengeAPI & TeamAPI;
  onTeamRefresh: OnTeamRefresh;
  onChallengeRefresh: OnChallengeRefresh;
}

export function activate(context: vscode.ExtensionContext): void {
  const api = new VSCodeAPI(context);

  const props: RegisterData = {
    api,
    context,
    onTeamRefresh: api.onTeamRefresh,
    onChallengeRefresh: api.onChallengeRefresh,
  };

  const registers = [
    registerConfigure,
    registerRefreshWorkspace,
    registerChallengeProvider,
    registerTeamProvider,
    registerRefreshChallenge,
    registerDownloadChallenge,
    registerSolveChallenge,
    registerRefreshScoreboard,
    registerSearchTeam,
    registerSearchChallenge,
    registerGotoMe,
    registerRefresh,
  ];

  registers.forEach((register) => register(props));
}

function registerRefresh(props: RegisterData): void {
  const config = vscode.workspace.getConfiguration("vs-ctf");

  let interval: any | null = null;

  function updateInterval() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    const rate = config.get<number>("sync") || 0;
    if (rate > 0) {
      interval = setInterval(async () => {
        await props.api.refreshChallenges();
        await props.api.refreshTeams();
      }, rate * 1000);
    }
  }

  updateInterval();

  const listener = vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (!event.affectsConfiguration("vs-ctf.ctf.sync")) return;

    updateInterval();
  });

  props.context.subscriptions.push(listener);
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

      await props.api.refreshChallenges();
      await props.api.refreshTeams();
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

function registerRefreshWorkspace(props: RegisterData): void {
  const listener = vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (!event.affectsConfiguration("vs-ctf.ctf.enabled")) return;

    const config = vscode.workspace.getConfiguration("vs-ctf");

    if (!config.get("ctf.enabled")) return;

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return;

    let folder = folders[0];

    await updateWorkspaceFolder(props.context.extensionUri, folder.uri);
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

function registerSearchChallenge(props: RegisterData): void {
  const challengePanel = new ChallengeWebview(
    props.api,
    props.context.extensionUri,
    props.onChallengeRefresh
  );

  const listener = vscode.commands.registerCommand(
    "vs-ctf.search-challenge",
    async (entry?: { id: string }) => {
      let challenge: Challenge;
      if (entry) {
        challenge = props.api.getChallenge(entry.id) as Challenge;
      } else {
        challenge = (await showChallengePick(props.api)) as Challenge;
      }

      if (!challenge) return;

      const folder = getActiveWorkspaceFolder() as vscode.WorkspaceFolder;
      if (!folder) return;

      const challengePath = vscode.Uri.joinPath(
        folder.uri,
        stringToSafePath(challenge.name)
      );

      async function updatePanel() {
        challengePanel.challengeId = challenge.id;
        await challengePanel.showPanel();
      }

      async function updateChallenges() {
        await vscode.commands.executeCommand("vs-ctf.goto-challenge", {
          id: challenge.id,
        });
      }

      async function updateWorkspace() {
        await updateChallengeFolder(
          props.context.extensionUri,
          folder.uri,
          challenge
        );

        await vscode.commands.executeCommand(
          "workbench.files.action.collapseExplorerFolders"
        );

        await revealFolderRecursive(challengePath);

        await vscode.commands.executeCommand("revealInExplorer", challengePath);

        await updateTerminal();
      }

      async function updateTerminal() {
        let terminal = vscode.window.terminals.find(
          (terminal) => terminal.name === challenge.name
        );
        if (terminal) {
          terminal.show();
          return;
        }

        terminal = vscode.window.createTerminal({
          name: challenge.name,
          cwd: challengePath,
        });

        terminal.show();
      }

      await Promise.all([updatePanel(), updateChallenges(), updateWorkspace()]);
    }
  );

  props.context.subscriptions.push(listener);
}

function registerDownloadChallenge(props: RegisterData): void {
  const listener = vscode.commands.registerCommand(
    "vs-ctf.download-challenge",
    async (entry?: { id: string }) => {
      let challenge: Challenge | null;
      if (entry) {
        challenge = props.api.getChallenge(entry.id);
      } else {
        challenge = await showChallengePick(props.api);
      }

      if (!challenge) return;

      const folder = getActiveWorkspaceFolder();
      if (!folder) return;

      if (await props.api.downloadChallenge(challenge.id, folder.uri)) {
        vscode.window.showInformationMessage(
          `Download complete for ${challenge.name}`
        );
      } else {
        vscode.window.showInformationMessage(
          `Download failed for ${challenge.name}`
        );
      }
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
        challenge = await showChallengePick(props.api);
      }

      if (!challenge) return;

      const flagKey = `${FLAG_KEY}${challenge.id}`;
      const previousFlag: string | undefined =
        props.context.workspaceState.get(flagKey) || undefined;

      if (challenge.solved) {
        if (previousFlag) {
          vscode.window.showInformationMessage(
            `Already solved.\n\nFlag: ${previousFlag}`,
            {
              modal: true,
            }
          );
        } else {
          vscode.window.showInformationMessage("Already solved.", {
            modal: true,
          });
        }

        return;
      }

      const flag = (
        await vscode.window.showInputBox({
          value: previousFlag,
          placeHolder: "Enter flag...",
        })
      )?.trim();

      if (!flag) return;

      await props.context.workspaceState.update(flagKey, flag);

      if (await props.api.solveChallenge(challenge.id, flag)) {
        const folder = getActiveWorkspaceFolder();
        if (folder) {
          vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(
              folder.uri,
              stringToSafePath(challenge.name),
              "FLAG"
            ),
            new TextEncoder().encode(flag)
          );
        }

        vscode.window.showInformationMessage("Valid flag", {
          modal: true,
        });
      } else {
        vscode.window.showErrorMessage("Invalid flag", {
          modal: true,
        });
      }
    }
  );

  props.context.subscriptions.push(listener);
}

function registerSearchTeam(props: RegisterData): void {
  const listener = vscode.commands.registerCommand(
    "vs-ctf.search-team",
    async () => {
      const team = await showTeamPick(props.api);
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
