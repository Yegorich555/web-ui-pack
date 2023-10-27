import Page from "src/elements/page";
import { WUPSwitchControl } from "web-ui-pack";
import MyLink from "src/elements/myLink";
import stylesCom from "./controls.scss";
import styles from "./switch.scss";

WUPSwitchControl.$use();

export default function SwitchControlView() {
  return (
    <Page
      header="SwitchControl"
      link="src/controls/switch.ts"
      features={[
        "Easy to change size of items via css-variables (ctrl-switch-h...)", //
        "Easy to reverse label",
        "Powerful accessibility support (keyboard, announcenement)",
        "Ability to save value to localStorage, sessionStorage, URL (options storageKey & storage)",
      ]}
      details={{
        tag: "wup-switch",
        linkDemo: "demo/src/components/controls/switch.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { reversed: true };
            el.$onSubmit = (e) => console.warn("submitted model", e.detail.model);
          }
        }}
        w-autoFocus
      >
        <wup-switch //
          w-name="switch"
          w-label="Switch"
          w-initValue={false}
          w-reverse={false}
        />
        <div className={stylesCom.group}>
          <wup-switch w-name="readonly" readonly />
          <wup-switch w-name="disabled" disabled />
          <wup-switch w-name="defaultChecked" w-initValue />
        </div>
        <wup-switch w-label="Very very very incredible long label to check if it has ellipsis rule and it works as expected" />
        <wup-switch w-name="reversed" w-reverse="" />
        <wup-switch
          w-name="reversed2"
          w-reverse=""
          w-label="Very very very incredible long label to check if it has ellipsis rule and it works as expected"
        />
        <wup-switch //
          w-name="saveUrlSwitch"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey
          w-storage="url"
        />
        <section>
          <h3>Customized</h3>
          <small>
            See details in <MyLink href="/demo/src/components/controls/switch.scss">demo/src...</MyLink>
          </small>
          <div className={[stylesCom.group, styles.customGroup].join(" ")}>
            <wup-switch class={stylesCom.noBorders} w-name="No borders" />
            <wup-switch class={styles.big} w-name="anotherSize" w-initValue />
            <wup-switch class={[styles.big, styles.withIcons].join(" ")} w-name="withIcons" />
          </div>
        </section>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
