import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Select } from "antd";

export default function HelpPage() {
    const [lang, setLang] = useState("fr");
    const [text, setText] = useState("");

    useEffect(() => {
        const file = lang === "en"
            ? new URL("../help/getting-started.en.md", import.meta.url)
            : new URL("../help/getting-started.fr.md", import.meta.url);

        fetch(file)
            .then((r) => r.text())
            .then(setText)
            .catch(() => setText("Failed to load help file."));
    }, [lang]);

    return (
        <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
            <Select
                value={lang}
                onChange={setLang}
                style={{ marginBottom: 20, width: 120 }}
                options={[
                    { value: "en", label: "English" },
                    { value: "fr", label: "Français" },
                ]}
            />

            <ReactMarkdown>{text}</ReactMarkdown>
        </div>
    );
}
