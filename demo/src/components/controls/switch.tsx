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
          name="switch"
          label="Switch"
          initValue={false}
          reverse={false}
        />
        <wup-switch
          ref={(el) => {
            if (el) {
              el.$options.name = "required";
              el.$options.validations = { required: true };
            }
          }}
        />
        <wup-switch label="Very very very incredible long label to check if it has ellipsis rule and it works as expected" />
        <wup-switch name="reversed" reverse="" />
        <wup-switch
          name="reversed2"
          reverse=""
          label="Very very very incredible long label to check if it has ellipsis rule and it works as expected"
        />
        {/* otherwise in React inline [defaultChecked] doesn't work */}
        <wup-switch name="defaultChecked" ref={(el) => el?.setAttribute("defaultChecked", "")} />
        <wup-switch name="disabled" disabled />
        <wup-switch name="readonly" readOnly initValue />
        <wup-switch //
          name="saveUrlSwitch"
          label="With saving to URL (see $options.skey & storage)"
          skey
          storage="url"
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
