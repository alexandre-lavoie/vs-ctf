import * as vscode from "vscode";

import { ChallengeAPI, Challenge, ChallengeTreeItem, OnChallengeRefresh } from "./challenge/types";
import { ChallengeTreeDataProvider } from "./challenge/tree";
import { ChallengeWebview } from "./challenge/view";
import { TeamAPI, Team, OnTeamRefresh } from "./team/types";
import { TeamTreeDataProvider } from "./team/tree";
import { stringToSafePath } from "./utils";

interface RegisterData {
    context: vscode.ExtensionContext,
    api: ChallengeAPI & TeamAPI,
    onTeamRefresh: OnTeamRefresh,
    onChallengeRefresh: OnChallengeRefresh,
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
        }
    ];

    const teams: Team[] = [
        {
            id: "0",
            name: "Team 1",
            position: 1,
            score: 69,
        }
    ];

    const onTeamRefresh: OnTeamRefresh = new vscode.EventEmitter();
    const onChallengeRefresh: OnChallengeRefresh = new vscode.EventEmitter();

    const api: ChallengeAPI & TeamAPI = {
        getChallenge: async (id) => challenges.find((challenge) => challenge.id === id),
        getChallenges: async () => challenges,
        refreshChallenge: async(id) => onChallengeRefresh.fire(id),
        refreshChallenges: async () => onChallengeRefresh.fire(null),
        solveChallenge: async (id, flag) => false,
        getTeams: async () => teams,
        refreshTeam: async(id) => onTeamRefresh.fire(id),
        refreshTeams: async () => onTeamRefresh.fire(null),
    };

    const props: RegisterData = {
        api,
        context,
        onTeamRefresh,
        onChallengeRefresh
    };

    const registers = [
        registerProviders,
        registerRefreshChallenge,
        registerGotoChallenge,
        registerViewChallenge,
        registerSolveChallenge,
        registerRefreshScoreboard,
    ];

    registers.forEach((register) => register(props));
}

function registerProviders(props: RegisterData): void {
    const folders = vscode.workspace.workspaceFolders;

    if (folders && folders.length > 0) {
        vscode.window.registerTreeDataProvider("vs-ctf.challenges", new ChallengeTreeDataProvider(props.api, props.onChallengeRefresh));
    }

    vscode.window.registerTreeDataProvider("vs-ctf.scoreboard", new TeamTreeDataProvider(props.api, props.onTeamRefresh));
}

function registerRefreshChallenge(props: RegisterData): void {
    const command = vscode.commands.registerCommand("vs-ctf.refresh-challenges", async () => {
        await props.api.refreshChallenges();
    });

    props.context.subscriptions.push(command);
}

function registerGotoChallenge(props: RegisterData): void {
    const command = vscode.commands.registerCommand("vs-ctf.goto-challenge", async (item: ChallengeTreeItem) => {
        const challenge = item.data;

        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) return;

        const path = vscode.Uri.joinPath(folders[0].uri, stringToSafePath(challenge.name));

        vscode.commands.executeCommand("revealInExplorer", path);
    });

    props.context.subscriptions.push(command);
}

function registerViewChallenge(props: RegisterData): void {
    const challengeViews: Record<string, ChallengeWebview> = {};

    const command = vscode.commands.registerCommand("vs-ctf.view-challenge", (item: ChallengeTreeItem) => {
        const challenge = item.data;

        let view = challengeViews[challenge.id];
        if (!view) {
            view = challengeViews[challenge.id] = new ChallengeWebview(props.api, challenge.id, props.context.extensionUri, props.onChallengeRefresh);
        }

        view.showPanel();
    });

    props.context.subscriptions.push(command);
}

function registerSolveChallenge(props: RegisterData): void {
    const command = vscode.commands.registerCommand("vs-ctf.solve-challenge", async (item: ChallengeTreeItem) => {
        const challenge = item.data;

        const flag = await vscode.window.showInputBox({
            placeHolder: "Enter flag..."
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
    });

    props.context.subscriptions.push(command);
}

function registerRefreshScoreboard(props: RegisterData): void {
    const command = vscode.commands.registerCommand("vs-ctf.refresh-scoreboard", async () => {
        await props.api.refreshTeams();
    });

    props.context.subscriptions.push(command);
}

export function deactivate(): void {}
