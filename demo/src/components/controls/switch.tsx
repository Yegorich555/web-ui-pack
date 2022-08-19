import Page from "src/elements/page";
import { WUPSwitchControl } from "web-ui-pack";

const sideEffect = WUPSwitchControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

export default function SwitchControlView() {
  return (
    <Page
      header="SwitchControl"
      link="switchcontrol"
      features={[
        "Easy to change size of items via css-variables (ctrl-switch-size...)", //
        "Possible to reverse label",
        "Powerful accessibility support",
      ]}
      details={{
        tag: "wup-switch",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("sumbitted model", e.$model);
          }
        }}
      >
        <wup-switch label="Switch" />
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
        <wup-switch name="disabled" initValue="" disabled />
        <wup-switch
          name="readonly"
          readOnly
          ref={(el) => {
            if (el) {
              el.$initValue = true;
            }
          }}
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
