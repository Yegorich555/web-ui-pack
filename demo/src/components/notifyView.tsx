import Page from "src/elements/page";
import { Fragment } from "react";
import WUPNotifyElement from "web-ui-pack/notifyElement";
import styles from "./notifyView.scss";

WUPNotifyElement.$use();

interface IExample {
  className: string;
  placement: WUP.Notify.Options["placement"];
}

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
        "Easy to use. Add to HTML or just call WUPNotifyElement.$show('Some text', ...)",
        "JS Native. Possible to use with any UI framerworks",
        <>
          Integrated with <b>{"<wup-form/>"}</b> (shows submit result; more details see in on Form page)
        </>,
      ]}
    >
      <section>
        <wup-notify style={{ display: "none" }}>Only for gathering CSS vars</wup-notify>
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
                className={`btn ${a.className}`}
                type="button"
                onClick={(e) => {
                  // const btn = e.currentTarget as HTMLButtonElement;
                  WUPNotifyElement.$show({
                    textContent: `I am wup-notify element with $options.placement: ${a.placement}`,
                    defaults: { placement: a.placement },
                    className: styles.notify,
                  });
                }}
              >
                {a.placement}
              </button>
              {/* <wup-notify
                w-placement={a.placement}
                w-autoClose={5000}
                w-selfremove="true"
                w-closeonclick="true"
                ref={(el) => {
                  if (el) {
                    el.$options.openCase = NotifyOpenCases.onManualCall;
                  }
                }}
              >
                I am wup-notify element with $options.placement: {a.placement}
              </wup-notify> */}
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
// todo test with huge content - must be scrollable ???
