import * as React from "react";
import * as vscode from "vscode";

import { Challenge as ChallengeType } from "../challenge/types";
import Connection from "./Connection";
import FileButton from "./FileButton";
import Markdown from "./Markdown";
import Panel from "./Panel";

const Challenge = (props: {
  extensionUri: vscode.Uri;
  challenge: ChallengeType;
}) => {
  const data = React.useMemo(() => {
    const sections = [];

    if (props.challenge.description) {
      sections.push(
        <Markdown key="description">{props.challenge.description}</Markdown>
      );
    }

    if (props.challenge.connection) {
      sections.push(
        <>
          <div key="connection">
            <Connection>{props.challenge.connection}</Connection>
          </div>
          <br />
        </>
      );
    }

    if (props.challenge.files && props.challenge.files.length > 0) {
      sections.push(
        <div className="button-group">
          {props.challenge.files.map((path) => (
            <FileButton key={path} uri={path} />
          ))}
        </div>
      );
    }

    const dividedSections = sections.flatMap((section, i) => [
      section,
      <>
        <hr key={`hr-${i}`} />
        <br key={`br-${i}`} />
      </>,
    ]);

    if (dividedSections.length > 0) dividedSections.pop();

    return dividedSections;
  }, [props.challenge]);

  return (
    <Panel extensionUri={props.extensionUri}>
      <div style={{ display: "flex", gap: "16px" }}>
        <div style={{ flexGrow: 1 }}>
          <h2>{props.challenge.name}</h2>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <h2>
            {props.challenge.value} Points, {props.challenge.solves} Solves
          </h2>
        </div>
      </div>
      <hr />
      {data}
    </Panel>
  );
};

export default Challenge;
