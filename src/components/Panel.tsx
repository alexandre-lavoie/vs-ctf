import fs from "fs";
import * as React from "react";
import * as vscode from "vscode";

const Panel = (props: { extensionUri: vscode.Uri; children: any }) => {
  const vscodeCSSPath = vscode.Uri.joinPath(
    props.extensionUri,
    "resources",
    "css",
    "panel.css"
  );

  const vscodeCSS = fs.readFileSync(vscodeCSSPath.fsPath, {
    encoding: "utf-8",
  });

  return (
    <html>
      <head>
        <style>{vscodeCSS}</style>
      </head>
      <body>{props.children}</body>
    </html>
  );
};

export default Panel;
