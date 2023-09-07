import Page from "src/elements/page";
import { WUPCheckControl } from "web-ui-pack";

const sideEffect = WUPCheckControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

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
            el.$onSubmit = (e) => console.warn("submitted model", e.$model);
          }
        }}
      >
        <wup-check w-name="check" w-label="Check" w-initValue={false} w-reverse={false} />
        <wup-check
          ref={(el) => {
            if (el) {
              el.$options.name = "required";
              el.$options.validations = { required: true };
            }
          }}
        />
        <wup-check w-label="Very very very incredible long label to check if it has ellipsis rule and it works as expected" />
        <wup-check w-name="reversed" w-reverse="" />
        <wup-check
          w-name="reversed2"
          w-reverse=""
          w-label="Very very very incredible long label to check if it has ellipsis rule and it works as expected"
        />
        {/* otherwise in React inline [defaultChecked] doesn't work */}
        <wup-check w-name="checked" ref={(el) => el?.setAttribute("defaultChecked", "")} />
        <wup-check w-name="disabled" disabled w-initValue />
        <wup-check w-name="readonly" readonly w-initValue />
        <wup-switch //
          w-name="saveUrlCheck"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey
          w-storage="url"
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
