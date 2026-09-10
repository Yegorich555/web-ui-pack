import Code from "src/elements/code";
import Example from "src/elements/example";
import WUPNotifyElement from "web-ui-pack/notifyElement";
import styles from "./notifyView.scss";

export default function Example2() {
  return (
    <Example header="Single function call" link="demo/src/components/notify/example2.tsx">
      <small>Use WUPNotifyElement.$show(...)</small>
      <Code code={codeJS} />
      <Code code={codeCSS} />
      <div className={styles.inlineCenter}>
        <button
          className="btn"
          type="button"
          onClick={() => {
            WUPNotifyElement.$show({
              defaults: { placement: "top-middle", autoClose: 0, closeOnClick: true },
              className: styles.myTooltip,
              textContent: "Example how to show me in 1 call",
              onRender: (el) => {
                const iconEl = document.createElement("div");
                iconEl.className = styles.iconAlert;
                iconEl.textContent = "!";
                el.append(iconEl);
              },
            });
          }}
        >
          Show Notification on click
        </button>
      </div>
    </Example>
  );
}

const codeJS = `js
/* TS */
import WUPNotifyElement from "web-ui-pack/notifyElement";
WUPNotifyElement.$use();

 WUPNotifyElement.$show({
  defaults: { placement: "top-middle", autoClose: 0, closeOnClick: true },
  className: styles.myTooltip,
  textContent: 'Example how to show me in 1 call',
  onRender: (el) => {
    const iconEl = document.createElement("div");
    iconEl.className = styles.iconAlert;
    iconEl.textContent = "!";
    el.append(iconEl);
  },
});`;

const codeCSS = `css
/* SCSS */
.myTooltip {
  &[open] {
    display: flex;
  }
  justify-content: center;
  align-items: center;
  gap: 6px;

  > button[close] {
    display: none;
  }

  .iconAlert {
    width: 20px;
    height: 20px;
    line-height: 20px;
    font-size: 14px;
    border-radius: 50%;
    margin-left: auto;
    color: white;
    background: #e74c3c;
    text-align: center;
  }
}`;
