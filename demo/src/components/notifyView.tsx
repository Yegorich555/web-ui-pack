import Page from "src/elements/page";
import { Fragment } from "react";
import WUPNotifyElement, { NotifyOpenCases } from "web-ui-pack/notifyElement";
import Code from "src/elements/code";
import styles from "./notifyView.scss";

WUPNotifyElement.$use();

interface IExample {
  className: string;
  placement: WUP.Notify.Options["placement"];
}

let iter = 0;

export default function NotifyView() {
  return (
    <Page //
      header="NotifyElement"
      link="src/notifyElement.ts"
      details={{
        tag: "wup-notify",
        linkDemo: "demo/src/components/notifyView.tsx",
        customHTML: [
          `html
<wup-notify
  w-placement="bottom-left"
  w-autoclose="5000"
  w-pauseonhover="true"
  w-selfremove="true"
  w-closeonclick="true"
  w-pauseonwinblur="true"
>
 Some message here
</wup-notify>

<!--EQUAL TO-->
<wup-notify>
  Some message here
</wup-notify>`,
        ],
      }}
      features={[
        "Built-in styles & animation",
        "Notifications placed in stack",
        "Easy to use. Add to HTML or just call WUPNotifyElement.$show({textContent: 'Some text'}, ...)",
        "JS Native. Possible to use with any UI framerworks",
        <>
          Integrated with <b>{"<wup-form/>"}</b> (shows submit result; more details see in on Form page)
        </>,
      ]}
    >
      <section>
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
        {/* <wup-notify w-placement="bottom-middle" w-autoclose="8000" w-selfremove="true" w-closeonclick="true">
          Some message here
        </wup-notify> */}
        <h3>Different placements</h3>
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
            ] as IExample[]
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
                  // const btn = e.currentTarget as HTMLButtonElement;
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
      </section>
      <section>
        <h3>Single function call</h3>
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
                textContent: `Example how to show me in 1 call`,
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
      </section>
      <section>
        <h3>Integrated with form</h3>
        <small>Comming soon...</small>
      </section>
    </Page>
  );
}

const codeJS = `js
/* TS */
import WUPNotifyElement from "web-ui-pack/notifyElement";
WUPNotifyElement.$use();

WUPModalElement.$showConfirm({
  defaults: { placement: "top-middle", autoClose: 0, closeOnClick: true }, // override init options here
  className: "myTooltip",
  textContent: "Simple example how to show me in 1 call",
  // OR use onRender for customization
  onRender: (el) => {
    const iconEl = document.createElement("div");
    iconEl.className = "iconAlert";
    iconEl.textContent = "!";
    el.prepend(iconEl);
  },
})`;

const codeCSS = `css
/* SCSS */
.myTooltip {
  display: flex !important;
  justify-content: center;
  align-items: center;
  gap: 6px;

  > button[close] {
    display: none;
  }

  >.iconAlert {
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
} `;
