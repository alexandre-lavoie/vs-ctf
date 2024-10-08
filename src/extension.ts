import * as vscode from "vscode";

import { ChallengeTreeDataProvider } from "./challenge/tree";
import {
  Challenge,
  ChallengeAPI,
  ChallengeTreeID,
  OnChallengeRefresh,
} from "./challenge/types";
import { ChallengeWebview } from "./challenge/view";
import { TeamTreeDataProvider } from "./team/tree";
import { OnTeamRefresh, Team, TeamAPI } from "./team/types";
import { stringToSafePath } from "./utils";
import { updateChallengeFolder } from "./challenge/fileSystem";

interface RegisterData {
  context: vscode.ExtensionContext;
  api: ChallengeAPI & TeamAPI;
  onTeamRefresh: OnTeamRefresh;
  onChallengeRefresh: OnChallengeRefresh;
}

export function activate(context: vscode.ExtensionContext): void {
  const challenges: Challenge[] = [
    {
      id: "0",
      name: "Challenge 1",
      category: "Reverse Engineering",
      description: "This is a test",
      value: 69,
      solves: 420,
      solved: true,
      files: ["http://test.com/a.b"],
    },
    {
      id: "1",
      name: "Challenge 2",
      category: "Steganography",
      description: "This is a test",
      value: 456,
      solves: 123,
      solved: false,
      files: ["http://test.com/a.b"],
    },
  ];

  const teams: Team[] = [
    {
      id: "0",
      name: "Team 1",
      position: 1,
      score: 69,
    },
  ];

  const onTeamRefresh: OnTeamRefresh = new vscode.EventEmitter();
  const onChallengeRefresh: OnChallengeRefresh = new vscode.EventEmitter();

  const api: ChallengeAPI & TeamAPI = {
    getChallenge: (id) =>
      challenges.find((challenge) => challenge.id === id) || null,
    getChallenges: () => challenges,
    refreshChallenge: async (id) => onChallengeRefresh.fire(id),
    refreshChallenges: async () => onChallengeRefresh.fire(null),
    solveChallenge: async (id, flag) => false,
    getTeam: (id) => teams.find((team) => team.id === id) || null,
    getTeams: () => teams,
    refreshTeam: async (id) => onTeamRefresh.fire(id),
    refreshTeams: async () => onTeamRefresh.fire(null),
  };

  const props: RegisterData = {
    api,
    context,
    onTeamRefresh,
    onChallengeRefresh,
  };

  const registers = [
    registerChallengeProvider,
    registerTeamProvider,
    registerRefreshChallenge,
    registerOpenChallenge,
    registerViewChallenge,
    registerSolveChallenge,
    registerRefreshScoreboard,
    registerSearchTeam,
    registerSearchChallenge,
  ];

  registers.forEach((register) => register(props));
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
    async (id: { id: string }) => {
      await vscode.commands.executeCommand("vs-ctf.view-challenge", id);
      tree.reveal({ type: "challenge", id: id.id });
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

  const command = vscode.commands.registerCommand(
    "vs-ctf.goto-team",
    async (id: { id: string }) => {
      tree.reveal(id.id);
    }
  );

  props.context.subscriptions.push(command);
}

function registerRefreshChallenge(props: RegisterData): void {
  const command = vscode.commands.registerCommand(
    "vs-ctf.refresh-challenges",
    async () => {
      await props.api.refreshChallenges();
    }
  );

  props.context.subscriptions.push(command);
}

function registerOpenChallenge(props: RegisterData): void {
  const command = vscode.commands.registerCommand(
    "vs-ctf.open-challenge",
    async (id: ChallengeTreeID) => {
      const challenge = props.api.getChallenge(id.id);
      if (!challenge) return;

      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) return;
      const folder = folders[0];

      await updateChallengeFolder(props.context.extensionUri, folder.uri, challenge);

      const path = vscode.Uri.joinPath(
        folder.uri,
        stringToSafePath(challenge.name),
        "README.md"
      );

      await vscode.commands.executeCommand("revealInExplorer", path);
    }
  );

  props.context.subscriptions.push(command);
}

function registerSearchChallenge(props: RegisterData): void {
  const command = vscode.commands.registerCommand(
    "vs-ctf.search-challenge",
    async () => {
      const challenges = props.api.getChallenges();

      const name = await vscode.window.showQuickPick(
        challenges.map((challenge) => challenge.name),
        { canPickMany: false }
      );
      if (name == null) return;

      const challenge = challenges.find((challenge) => challenge.name === name);
      if (challenge == null) return;

      await vscode.commands.executeCommand("vs-ctf.goto-challenge", {
        id: challenge.id,
      });
    }
  );

  props.context.subscriptions.push(command);
}

function registerViewChallenge(props: RegisterData): void {
  const challengeViews: Record<string, ChallengeWebview> = {};

  const command = vscode.commands.registerCommand(
    "vs-ctf.view-challenge",
    (entry: { id: string }) => {
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

      view.showPanel();
    }
  );

  props.context.subscriptions.push(command);
}

function registerSolveChallenge(props: RegisterData): void {
  const command = vscode.commands.registerCommand(
    "vs-ctf.solve-challenge",
    async (id: ChallengeTreeID) => {
      const challenge = props.api.getChallenge(id.id);
      if (!challenge) return;

      const flag = await vscode.window.showInputBox({
        placeHolder: "Enter flag...",
      });

      if (!flag) {
        return;
      }

      if (await props.api.solveChallenge(challenge.id, flag)) {
        await props.api.refreshChallenge(challenge.id);

        vscode.window.showInformationMessage("Valid flag");
      } else {
        vscode.window.showErrorMessage("Invalid flag");
      }
    }
  );

  props.context.subscriptions.push(command);
}

function registerSearchTeam(props: RegisterData): void {
  const command = vscode.commands.registerCommand(
    "vs-ctf.search-team",
    async () => {
      const teams = props.api.getTeams();

      const name = await vscode.window.showQuickPick(
        teams.map((team) => team.name),
        { canPickMany: false }
      );
      if (name == null) return;

      const team = teams.find((team) => team.name === name);
      if (team == null) return;

      await vscode.commands.executeCommand("vs-ctf.goto-team", {
        id: team.id,
      });
    }
  );

  props.context.subscriptions.push(command);
}

function registerRefreshScoreboard(props: RegisterData): void {
  const command = vscode.commands.registerCommand(
    "vs-ctf.refresh-scoreboard",
    async () => {
      await props.api.refreshTeams();
    }
  );

  props.context.subscriptions.push(command);
}

export function deactivate(): void {}
