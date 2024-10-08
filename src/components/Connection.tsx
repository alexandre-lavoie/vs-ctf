import * as React from "react";

const Connection = (props: { children: string }) => {
  const component = React.useMemo(() => {
    const connection = props.children.trim();

    if (connection.includes("://")) {
      return <a href={connection}>{connection}</a>;
    }

    return <code>{connection}</code>;
  }, [props.children]);

  return component;
};

export default Connection;
