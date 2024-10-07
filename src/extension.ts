import * as vscode from "vscode";
import { ChallengeAPI, Challenge } from "./challenge/types";
import { ChallengeTreeDataProvider } from "./challenge/tree";

export function activate(context: vscode.ExtensionContext): void {
    const test = vscode.commands.registerCommand("vs-ctf.test", () => {
        vscode.window.showInformationMessage("Test");
    });

    context.subscriptions.push(test);

    const challenges: Challenge[] = [
        {
            id: "0",
            name: "Challenge 1",
            category: "Reverse Engineering",
            description: "This is a test",
            value: 69,
            solves: 420,
            solved: true,
        },
        {
            id: "1",
            name: "Challenge 2",
            category: "Steganography",
            description: "This is a test",
            value: 456,
            solves: 123,
            solved: false,
        }
    ];

    const api: ChallengeAPI = {
        getChallenges: () => challenges,
        refreshChallenges: () => {},
    };

    const treeDataProvider = new ChallengeTreeDataProvider(api);
    vscode.window.registerTreeDataProvider("vs-ctf.challenges", treeDataProvider);
}

export function deactivate(): void {}
