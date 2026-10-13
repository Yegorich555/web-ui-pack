import Example from "src/elements/example";
import WUPNotifyElement from "web-ui-pack/notifyElement";
import styles from "./notifyView.scss";

const types: Array<{ type: WUP.Notify.Options["type"]; name: string; text: string }> = [
  { type: "", name: "default", text: "Message without icon" },
  { type: "info", name: "info", text: "New version is available" },
  { type: "success", name: "success", text: "Changes are saved" },
  { type: "warning", name: "warning", text: "Session expires in 5 minutes" },
  { type: "error", name: "error", text: "Failed to save changes" },
];

export default function Example3() {
  return (
    <Example header="Types" link="demo/src/components/notify/example3.tsx">
      <small>Use $options.type or attribute [w-type]</small>
      <div className={styles.types}>
        {types.map((a) => (
          <button
            key={a.name}
            className="btn"
            type="button"
            data-type={a.name}
            onClick={() => WUPNotifyElement.$show({ defaults: { type: a.type }, textContent: a.text })}
          >
            {a.name}
          </button>
        ))}
      </div>
    </Example>
  );
}
