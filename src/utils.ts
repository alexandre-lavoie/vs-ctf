import * as vscode from "vscode";

const BAD_CHARS = `!"#$%&'()*+,./:;<=>?@[\]^\`{|}~`;

export function stringToSafePath(value: string): string {
  value = value.replaceAll(" ", "_").toLowerCase();

  for (let i = 0; i < BAD_CHARS.length; i++) {
    value = value.replaceAll(BAD_CHARS.charAt(i), "");
  }

  return value;
}

export function extractFileName(uri: string): string {
  const uriObj = vscode.Uri.parse(uri);
  const sections = uriObj.path.split("/");
  return sections[sections.length - 1];
}
