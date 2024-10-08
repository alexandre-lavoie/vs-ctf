import * as React from "react";

import { extractFileName } from "../utils";

const FileButton = (props: { uri: string }) => {
  const name = React.useMemo(() => extractFileName(props.uri), [props.uri]);

  return (
    <a href={props.uri.toString()}>
      <button>{name}</button>
    </a>
  );
};

export default FileButton;
