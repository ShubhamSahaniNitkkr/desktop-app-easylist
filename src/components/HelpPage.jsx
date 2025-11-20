import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function HelpPage() {
    const [text, setText] = useState("");

    useEffect(() => {
        const url = new URL("../help/getting-started.md", import.meta.url);

        fetch(url)
            .then((r) => r.text())
            .then(setText)
            .catch((e) => setText("Failed to load help file."));
    }, []);

    return (
        <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
            <ReactMarkdown>{text}</ReactMarkdown>
        </div>
    );
}
