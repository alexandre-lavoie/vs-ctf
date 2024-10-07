import * as vscode from "vscode";

import { ChallengeAPI, Challenge, ChallengeTreeItem } from "./challenge/types";
import { ChallengeTreeDataProvider } from "./challenge/tree";
import { ChallengeWebview } from "./challenge/view";
import { TeamAPI, Team } from "./team/types";
import { TeamTreeDataProvider } from "./team/tree";

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

    const api: ChallengeAPI & TeamAPI = {
        getChallenge: async (id) => challenges.find((challenge) => challenge.id === id),
        getChallenges: async () => challenges,
        refreshChallenges: async () => {},
        solveChallenge: async (id, flag) => false,
        getTeams: async () => teams,
        refreshTeams: async () => {},
    };

    const challengeViews: Record<string, ChallengeWebview> = {}; 
    const viewChallenge = vscode.commands.registerCommand("vs-ctf.view-challenge", (item: ChallengeTreeItem) => {
        const challenge = item.data;

        let view = challengeViews[challenge.id];
        if (!view) {
            view = challengeViews[challenge.id] = new ChallengeWebview(api, challenge.id, context.extensionUri);
        }

        view.showPanel();
    });
    context.subscriptions.push(viewChallenge);

    const solveChallenge = vscode.commands.registerCommand("vs-ctf.solve-challenge", async (item: ChallengeTreeItem) => {
        const challenge = item.data;

        const flag = await vscode.window.showInputBox({
            placeHolder: "Enter flag..."
        });

        if (!flag) {
            return;
        }

        if (await api.solveChallenge(challenge.id, flag)) {
            vscode.window.showInformationMessage("Valid flag");
        } else {
            vscode.window.showErrorMessage("Invalid flag");
        }
    });
    context.subscriptions.push(solveChallenge);

    vscode.window.registerTreeDataProvider("vs-ctf.challenges", new ChallengeTreeDataProvider(api));
    vscode.window.registerTreeDataProvider("vs-ctf.scoreboard", new TeamTreeDataProvider(api));
}

export function deactivate(): void {}
