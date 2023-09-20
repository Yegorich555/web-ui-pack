import Page from "src/elements/page";
import { WUPPasswordControl } from "web-ui-pack";

const sideEffect = WUPPasswordControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

(window as any)._somePasswordValidations = {
  min: 8,
  minNumber: 1,
  minUpper: 1,
  minLower: 1,
  special: { min: 1, chars: "#!-_?,.@:;'" },
} as WUP.Password.Options["validations"];

export default function PasswordControlView() {
  return (
    <Page
      header="PasswordControl"
      link="src/controls/password.ts"
      features={[
        "Inheritted features from TextControl",
        "Built-in validations (required,min,max,email, minNumber,minUpper,minLower,special,confirm)",
        "Possible to show all validation rules in list (use $options.validationShowAll). Use css to style error-list/min-size on focusOut",
        "Possible to reverse eye-button (use $options.reverse)",
      ]}
      details={{
        tag: "wup-pwd",
        linkDemo: "demo/src/components/controls/password.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { pwd: "somePwdHere", required: "yes" };
            el.$onSubmit = (e) => console.warn("submitted model", e.$model);
          }
        }}
        w-autoFocus
      >
        <wup-pwd
          w-name="pwd"
          w-label="Password"
          w-initValue="someValue"
          w-validations="window._somePasswordValidations"
          ref={(el) => {
            if (el) {
              el.$options.validationShowAll = true;
              el.$options.autoFocus = true;
            }
          }}
        />
        <wup-pwd
          w-name="required"
          ref={(el) => {
            if (el) {
              el.$options.validationShowAll = true;
              el.$options.validations = {
                required: true,
              };
            }
          }}
        />
        <wup-pwd
          w-name="withoutClearButton"
          ref={(el) => {
            if (el) {
              el.$options.clearButton = false;
            }
          }}
        />
        <wup-pwd w-name="disabled" disabled />
        <wup-pwd w-label="Reversed button eye" w-name="reversed" w-reverse w-initValue="someValue-ForReversed" />
        <wup-pwd
          w-label="Confirm password"
          w-name="confirm"
          ref={(el) => {
            if (el) {
              el.$options.validations = { confirm: true };
            }
          }}
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
