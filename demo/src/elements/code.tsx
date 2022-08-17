import { useEffect } from "react";
import Prism from "prismjs";

interface Props {
  code: string;
  // language?: "css";
}
export default function Code({ code }: Props) {
  const lng = "css";
  useEffect(() => Prism.highlightAll(), []);
  return (
    <div className="code">
      <pre>
        <code className={`language-${lng}`}>{code}</code>
      </pre>
    </div>
  );
}
