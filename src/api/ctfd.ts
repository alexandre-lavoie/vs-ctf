import path from "path";
import * as vscode from "vscode";

import { Challenge, ChallengeAPI } from "../challenge/types";
import { TOKEN_KEY } from "../config";
import { Team, TeamAPI } from "../team/types";
import { extractFileName, stringToSafePath } from "../utils";

interface CTFdAPIResponse {
  success: boolean;
  data?: any;
}

interface CTFdChallengeResponse {
  id: string;
  category: string;
  name: string;
  solved_by_me: boolean;
  solves: number;
  value: number;
  connection_info?: string;
  description?: string;
  files?: string[];
}

type CTFdScoreboardResponse = {
  pos: number;
  account_id: string;
  account_url: string;
  account_type: "user" | "team";
  oauth_id: string | null;
  name: string;
  score: number;
  bracket_id: string | null;
  bracket_name: string | null;
};

export class CTFdAPI implements ChallengeAPI, TeamAPI {
  public static readonly CONFIG: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration("vs-ctf");

  public readonly context: vscode.ExtensionContext;

  private challenges: Record<string, Challenge> = {};
  private teams: Record<string, Team> = {};

  public constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  private getBaseUri(): vscode.Uri {
    return vscode.Uri.parse(
      CTFdAPI.CONFIG.get("ctf.url") || "http://localhost"
    );
  }

  private getAPIUri(): vscode.Uri {
    return vscode.Uri.joinPath(this.getBaseUri(), "api", "v1");
  }

  private getToken(): string {
    return CTFdAPI.CONFIG.get("ctfd.token") || "";
  }

  private async getHeaders(csrf?: boolean): Promise<Record<string, string>> {
    const token = this.getToken();

    let headers: Record<string, string> = {
      "User-Agent": "VS CTF",
      "Content-Type": "application/json",
    };

    if (token.startsWith("ctfd_")) {
      headers["Authorization"] = `Token ${token}`;
    } else {
      headers["Cookie"] = `session=${token}`;
    }

    if (csrf) {
      headers["CSRF-Token"] = (await this.getCSRF()) || "";
    }

    return headers;
  }

  private async getUserData(): Promise<string | null> {
    const url = vscode.Uri.joinPath(this.getBaseUri(), "challenges").toString();
    const headers = await this.getHeaders(false);

    const res = await fetch(url, {
      headers,
    });

    const text = await res.text();

    const match = text.replaceAll("\n", " ").match(/window\.init = ({.*?})/);
    if (!match) return null;

    return match[1];
  }

  private async getCSRF(): Promise<string | null> {
    const data = await this.getUserData();
    if (!data) return null;

    const match = data.match(/"([a-f0-9]{64})"/) || ["", ""];

    return match[1];
  }

  private async requestGet(path: string[]): Promise<CTFdAPIResponse> {
    const url = vscode.Uri.joinPath(this.getAPIUri(), ...path).toString();
    const headers = await this.getHeaders(false);

    const res = await fetch(url, {
      headers,
    });

    const out = (await res.json()) as CTFdAPIResponse;

    return out;
  }

  private async requestPost(
    path: string[],
    data: Record<string, unknown>
  ): Promise<CTFdAPIResponse> {
    const url = vscode.Uri.joinPath(this.getAPIUri(), ...path).toString();
    const headers = await this.getHeaders(true);

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    const out = (await res.json()) as CTFdAPIResponse;

    return out;
  }

  private mergeChallenge(old: Challenge | null, new_: Challenge): Challenge {
    return { ...(old || ({} as any)), ...new_ };
  }

  private mergeTeam(old: Team | null, new_: Team): Team {
    return { ...(old || {}), ...new_ };
  }

  public getChallenge(id: string): Challenge | null {
    return this.challenges[id] || null;
  }

  public getChallenges(): readonly Challenge[] {
    return Object.values(this.challenges);
  }

  private parseFile(file: string): string {
    if (file.startsWith("http:") || file.startsWith("https:")) return file;

    const firstQuestionMark = file.indexOf("?");
    const path = file.substring(0, firstQuestionMark);
    const query = file.substring(firstQuestionMark + 1);

    const uri = vscode.Uri.joinPath(this.getBaseUri(), ...path.split("/"));

    return vscode.Uri.from({
      ...uri,
      query,
    }).toString();
  }

  private parseChallenge(data: CTFdChallengeResponse): Challenge {
    const challenge: Challenge = {
      id: data.id,
      name: data.name,
      category: data.category,
      value: data.value,
      solves: data.solves,
      solved: data.solved_by_me,
    };

    if (data.description) challenge.description = data.description;

    if (data.connection_info) challenge.connection = data.connection_info;

    if (data.files)
      challenge.files = data.files.map((file) => this.parseFile(file));

    return challenge;
  }

  private refreshChallengeInteral(new_: Challenge): void {
    const old = this.getChallenge(new_.id);

    this.challenges[new_.id] = this.mergeChallenge(old, new_);
  }

  public async refreshChallenge(id: string): Promise<boolean> {
    const res = await this.requestGet(["challenges", id.toString()]);
    if (!res.data) return false;

    this.refreshChallengeInteral(this.parseChallenge(res.data));

    return true;
  }

  public async refreshChallenges(): Promise<boolean> {
    const res = await this.requestGet(["challenges"]);
    if (!res.data) return false;

    const challenges: any[] = res.data;

    challenges.forEach((data) =>
      this.refreshChallengeInteral(this.parseChallenge(data))
    );

    return true;
  }

  public async solveChallenge(id: string, flag: string): Promise<boolean> {
    const res = await this.requestPost(["challenges", "attempt"], {
      challenge_id: id,
      submission: flag,
    });
    if (!res.data) return false;

    return (
      res.data.status === "correct" || res.data.status === "already_solved"
    );
  }

  public async downloadChallenge(
    id: string,
    uri: vscode.Uri
  ): Promise<boolean> {
    if (!(await this.refreshChallenge(id))) return false;

    const challenge = this.getChallenge(id);
    if (!challenge) return false;

    if (!challenge.files || challenge.files.length === 0) return true;

    const downloadPath = vscode.Uri.joinPath(
      uri,
      stringToSafePath(challenge.name),
      "download"
    );

    const statuses = await Promise.all(
      challenge.files.map(async (file) => {
        const sourceUri = vscode.Uri.parse(file);
        const fileName = extractFileName(file);
        const destinationUri = vscode.Uri.joinPath(downloadPath, fileName);

        const headers = await this.getHeaders(false);
        const res = await fetch(sourceUri.toString(), {
          headers,
        });

        if (res.status !== 200) return false;

        const buffer = new Uint8Array(await res.arrayBuffer());

        await vscode.workspace.fs.writeFile(destinationUri, buffer);

        return true;
      })
    );

    return statuses.every((status) => status);
  }

  public async getTeamId(): Promise<string | null> {
    const token = this.getToken();
    const tokenKey = `${TOKEN_KEY}${token}`;

    let id = this.context.workspaceState.get<string>(tokenKey);
    if (id) return id;

    const data = await this.getUserData();
    if (!data) return "-1";

    const teamMatch = data.match(/'teamId': (.*?),/);
    if (teamMatch) {
      id = teamMatch[1].trim();

      if (id != "null") {
        this.context.workspaceState.update(tokenKey, id);

        return id;
      }
    }

    const userMatch = data.match(/'userId': (.*?),/);
    if (userMatch) {
      id = userMatch[1].trim();

      this.context.workspaceState.update(tokenKey, id);

      return id;
    }

    return null;
  }

  public getTeam(id: string): Team | null {
    return this.teams[id] || null;
  }

  public getTeams(): readonly Team[] {
    return Object.values(this.teams);
  }

  private refreshTeamInteral(new_: Team): void {
    const old = this.getTeam(new_.id);

    this.teams[new_.id] = this.mergeTeam(old, new_);
  }

  private parseScoreboard(res: CTFdScoreboardResponse): Team {
    return {
      id: res.account_id,
      name: res.name,
      position: res.pos,
      score: res.score,
    };
  }

  public async refreshTeam(id: string): Promise<boolean> {
    return false;
  }

  public async refreshTeams(): Promise<boolean> {
    const res = await this.requestGet(["scoreboard"]);
    if (!res.data) return false;

    const teams: CTFdScoreboardResponse[] = res.data;
    teams.forEach((team) =>
      this.refreshTeamInteral(this.parseScoreboard(team))
    );

    return true;
  }
}
