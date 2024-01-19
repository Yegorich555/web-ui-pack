import Page from "src/elements/page";
import { WUPNotifyElement } from "web-ui-pack";
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
            <>
              <button className={`btn ${a.className}`} type="button">
                {a.placement}
              </button>
              <wup-notify w-placement={a.placement} w-autoClose={5000} w-selfremove="true" w-closeonclick="true">
                I am wup-notify element with $options.placement: {a.placement}
              </wup-notify>
            </>
          ))}
        </div>
      </section>
      <section>
        <h3>Integrated with form</h3>
        <small>Comming soon...</small>
      </section>
      <section>
        <h3>Single function call</h3>
        <small>Comming soon...</small>
      </section>
    </Page>
  );
}
