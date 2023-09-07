import Page from "src/elements/page";
import { WUPSwitchControl } from "web-ui-pack";

const sideEffect = WUPSwitchControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

export default function SwitchControlView() {
  return (
    <Page
      header="SwitchControl"
      link="src/controls/switch.ts"
      features={[
        "Easy to change size of items via css-variables (ctrl-switch-size...)", //
        "Possible to reverse label",
        "Powerful accessibility support (keyboard, announcenement)",
        "Ability to save value to localStorage, sessionStorage, URL (options skey & storage)",
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
            el.$onSubmit = (e) => console.warn("submitted model", e.$model);
          }
        }}
      >
        <wup-switch //
          w-name="switch"
          w-label="Switch"
          w-initValue={false}
          w-reverse={false}
        />
        <wup-switch w-label="Very very very incredible long label to check if it has ellipsis rule and it works as expected" />
        <wup-switch w-name="reversed" w-reverse="" />
        <wup-switch
          w-name="reversed2"
          w-reverse=""
          w-label="Very very very incredible long label to check if it has ellipsis rule and it works as expected"
        />
        {/* otherwise in React inline [defaultChecked] doesn't work */}
        <wup-switch w-name="defaultChecked" ref={(el) => el?.setAttribute("defaultChecked", "")} />
        <wup-switch w-name="disabled" disabled />
        <wup-switch w-name="readonly" readonly w-initValue />
        <wup-switch //
          w-name="saveUrlSwitch"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey
          w-storage="url"
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
