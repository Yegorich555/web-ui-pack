import Page from "src/elements/page";
import { Fragment } from "react";
import WUPNotifyElement, { NotifyOpenCases } from "web-ui-pack/notifyElement";
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
  w-selfremove="true"
  w-closeonclick="true"
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
        <h3>Different placements</h3>
        <small>Use $options.placement or attribute [w-placement]</small>
        <div className={styles.block}>
          {(
            [
              { placement: "top-left", className: styles.topLeft },
              { placement: "bottom-left", className: styles.bottomLeft },
              // { placement: "top-middle", className: styles.topMiddle },
              // { placement: "bottom-middle", className: styles.bottomMiddle },
              { placement: "top-right", className: styles.topRight },
              { placement: "bottom-right", className: styles.bottomRight },
            ] as IExample[]
          ).map((a, i) => (
            <Fragment key={a.placement}>
              <button
                ref={(el) => {
                  if (el && i === 1) {
                    [0, 1, 100, 100].forEach((t) => {
                      setTimeout(() => el.click(), t);
                    });
                  }
                }}
                className={`btn ${a.className}`}
                type="button"
                onClick={() => {
                  // const btn = e.currentTarget as HTMLButtonElement;
                  WUPNotifyElement.$show({
                    textContent: `I am wup-notify element with $options.placement: ${a.placement}${
                      ++iter % 2 ? "\r\nTest \rBigger content" : ""
                    }`,
                    defaults: { placement: a.placement, autoClose: iter % 2 ? 5000 : 10000 },
                    className: styles.notify,
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
        <small>Comming soon...</small>
      </section>
      <section>
        <h3>Integrated with form</h3>
        <small>Comming soon...</small>
      </section>
    </Page>
  );
}

// todo test with small content - 1 word
