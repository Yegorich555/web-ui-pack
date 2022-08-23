import Page from "src/elements/page";
import { WUPPasswordControl } from "web-ui-pack";

const sideEffect = WUPPasswordControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

(window as any)._somePasswordValidations = {
  required: true,
  min: 8,
  minNumber: 1,
  minUpper: 1,
  minLower: 1,
  special: { min: 1, chars: "#!-_?,.@:;'" },
} as WUPPassword.Options["validations"];

(window as any).globalkey = {
  pointHere: { required: true, min: 4 } as WUPPassword.Options["validations"],
};

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
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { pwd: "somePwdHere", required: "yes" };
            el.$onSubmit = (e) => console.warn("sumbitted model", e.$model);
          }
        }}
      >
        <wup-pwd
          name="pwd"
          label="Password"
          initValue="someValue"
          autoComplete="off"
          validations="window._somePasswordValidations"
          reverse={false}
          ref={(el) => {
            if (el) {
              el.$options.validationShowAll = true;
              el.$options.autoFocus = true;
            }
          }}
        />
        <wup-pwd name="required" validations="globalkey.pointHere" />
        <wup-pwd
          name="withoutClearButton"
          ref={(el) => {
            if (el) {
              el.$options.clearButton = false;
            }
          }}
        />
        <wup-pwd name="disabled" disabled />
        <wup-pwd label="Reversed button eye" name="reversed" reverse initValue="someValue-ForReversed" />
        <wup-pwd
          label="Confirm password"
          name="confirm"
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
