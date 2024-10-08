import { marked } from "marked";
import * as React from "react";

const Markdown = (props: { children: string }) => {
  const html = React.useMemo(() => marked(props.children), [props.children]);

  return <div dangerouslySetInnerHTML={{ __html: html }}></div>;
};

export default Markdown;
