import * as React from "react";

const FileButton = (props: { path: string }) => {
    const sections = props.path.split("/");
    const lastSection = sections[sections.length - 1];
    const file = lastSection.split("?")[0];

    return <a href={props.path}><button>{file}</button></a>;
};

export default FileButton;
