import Page from "src/elements/page";
import { WUPCheckControl } from "web-ui-pack";
import MyLink from "src/elements/myLink";
import stylesCom from "./controls.scss";
import styles from "./check.scss";

WUPCheckControl.$use();

export default function CheckControlView() {
  return (
    <Page
      header="CheckControl"
      link="src/controls/check.ts"
      features={["Inheritted features from SwitchControl"]}
      details={{
        tag: "wup-check",
        linkDemo: "demo/src/components/controls/check.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("submitted model", e.detail.model);
          }
        }}
        w-autoFocus
      >
        <wup-check w-name="check" w-label="Check" w-initValue={false} w-reverse={false} />
        <div className={stylesCom.group}>
          <wup-check w-name="readonly" readonly />
          <wup-check w-name="disabled" disabled />
          <wup-check w-name="defaultChecked" w-initValue />
        </div>
        <wup-check w-label="Very very very incredible long label to check if it has ellipsis rule and it works as expected" />
        <wup-check w-name="reversed" w-reverse="" />
        <wup-check
          w-name="reversed2"
          w-reverse=""
          w-label="Very very very incredible long label to check if it has ellipsis rule and it works as expected"
        />
        <wup-check //
          w-name="saveUrlCheck"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey
          w-storage="url"
        />
        <section>
          <h3>Customized</h3>
          <small>
            See details in <MyLink href="/demo/src/components/controls/check.scss">demo/src...</MyLink>
          </small>
          <div className={stylesCom.group}>
            <wup-check class={stylesCom.noBorders} w-name="No borders" />
            <wup-check class={styles.anotherStyle} w-name="Another style" />
          </div>
        </section>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
