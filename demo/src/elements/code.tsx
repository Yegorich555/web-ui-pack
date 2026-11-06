import { useEffect } from "react";
import Prism from "prismjs";
import styles from "./code.scss";

// highlight like VSCode: `WUPPopupElement.$placements.$top`: class & properties (Prism doesn't support it by default)
Prism.languages.insertBefore("javascript", "operator", {
  "pascal-class": { pattern: /\b[A-Z](?:[A-Z\d_]*[a-z])[$\w]*\b/, alias: "class-name" },
  "property-access": { pattern: /(\.\s*)#?[_$a-zA-Z][$\w]*(?![$\w]|\s*\()/, lookbehind: true, alias: "property" },
});

interface Props {
  code: string;
}
export default function Code({ code }: Props) {
  const lng = /^([\w-]+)/.exec(code)![1];
  code = code.substring(lng.length, code.length).trimStart();
  useEffect(() => Prism.highlightAll(), []);
  return (
    <div className={["code", styles.code].join(" ")}>
      <pre>
        <code className={`language-${lng}`}>{code}</code>
      </pre>
    </div>
  );
}
