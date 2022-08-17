import { useEffect } from "react";
import Prism from "prismjs";
import styles from "./code.scss";

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
