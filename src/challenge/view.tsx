import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import * as vscode from "vscode";

import ChallengeJSX from "../components/Challenge";
import { Challenge, ChallengeAPI, OnChallengeRefresh } from "./types";

export class ChallengeWebview {
  public challengeId: string | null = null;

  public readonly api: ChallengeAPI;
  public readonly extensionUri: vscode.Uri;
  public readonly todoIconPath: vscode.Uri;
  public readonly solvedIconPath: vscode.Uri;
  private readonly onChallengeRefresh: OnChallengeRefresh;

  private panel?: vscode.WebviewPanel;
  private challenge: Challenge | null = null;

  public constructor(
    api: ChallengeAPI,
    extensionUri: vscode.Uri,
    onChallengeRefresh: OnChallengeRefresh
  ) {
    this.api = api;
    this.extensionUri = extensionUri;
    this.onChallengeRefresh = onChallengeRefresh;

    this.todoIconPath = vscode.Uri.joinPath(
      this.extensionUri,
      "resources",
      "icons",
      "assignment.svg"
    );

    this.solvedIconPath = vscode.Uri.joinPath(
      this.extensionUri,
      "resources",
      "icons",
      "flag.svg"
    );

    this.onChallengeRefresh = onChallengeRefresh;
    this.onChallengeRefresh.event((id) => {
      if (!id || id != this.challengeId) return;

      this.refreshPanel();
    });
  }

  public async showPanel(): Promise<void> {
    if (this.panel) {
      try {
        this.panel.reveal();
        await this.refreshPanel();

        return;
      } catch {}
    }

    const panel = vscode.window.createWebviewPanel(
      "vs-ctf.challenge",
      "Challenge",
      vscode.ViewColumn.One
    );

    this.panel = panel;

    await this.refreshPanel();
  }

  public async refreshPanel(): Promise<void> {
    if (!this.panel) return;

    if (this.challengeId === null) return;

    this.challenge = this.api.getChallenge(this.challengeId);
    if (!this.challenge) return;

    this.panel.title = this.challenge.name;
    this.panel.iconPath = this.challenge.solved
      ? this.solvedIconPath
      : this.todoIconPath;
    this.panel.webview.html = this.buildHTML();
  }

  public buildHTML(): string {
    return ReactDOMServer.renderToString(
      <ChallengeJSX
        extensionUri={this.extensionUri}
        challenge={this.challenge!}
      />
    );
  }
}
