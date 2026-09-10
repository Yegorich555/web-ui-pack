import { Fragment } from "react";
import Example from "src/elements/example";
import WUPNotifyElement, { NotifyOpenCases } from "web-ui-pack/notifyElement";
import styles from "./notifyView.scss";

interface IPlacement {
  className: string;
  placement: WUP.Notify.Options["placement"];
}

let iter = 0;

export default function Example1() {
  return (
    <Example header="Different placements" link="demo/src/components/notify/example1.tsx">
      <wup-notify
        ref={(el) => {
          if (el) {
            el.$options.openCase = NotifyOpenCases.onManualCall;
          }
        }}
        style={{ display: "none" }}
      >
        Only for gathering CSS vars
      </wup-notify>
      <small>Use $options.placement or attribute [w-placement]</small>
      <div className={styles.block}>
        {(
          [
            { placement: "top-left", className: styles.topLeft },
            { placement: "bottom-left", className: styles.bottomLeft },
            { placement: "top-middle", className: styles.topMiddle },
            { placement: "bottom-middle", className: styles.bottomMiddle },
            { placement: "top-right", className: styles.topRight },
            { placement: "bottom-right", className: styles.bottomRight },
          ] as IPlacement[]
        ).map((a) => (
          <Fragment key={a.placement}>
            <button
              ref={(el) => {
                if (DEV && el && a.placement === "bottom-middle") {
                  [0 /* 1, 100, 100, 1000, 101, 102, 402, 403, 404 */].forEach((t) => {
                    setTimeout(() => el.click(), t);
                  });
                  setTimeout(() => {
                    const all = document.querySelectorAll("wup-notify");
                    all[all.length - 1].refreshVertical(); // just for checking the method
                    all[all.length - 1].$options.pauseOnWinBlur = false;
                  }, 1500);
                }
              }}
              className={`btn ${a.className}`}
              type="button"
              onClick={() => {
                WUPNotifyElement.$show({
                  defaults: { placement: a.placement, autoClose: iter % 2 ? 5000 : 2000 },
                  className: styles.notify,
                  textContent: `${++iter}. I am wup-notify element with $options.placement: ${a.placement}${
                    iter % 2 ? "\r\nTest \rBigger content" : ""
                  }`,
                });
              }}
            >
              {a.placement}
            </button>
          </Fragment>
        ))}
      </div>
    </Example>
  );
}
