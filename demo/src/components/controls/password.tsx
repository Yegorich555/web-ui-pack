import Page from "src/elements/page";
import { WUPPasswordControl } from "web-ui-pack";

const sideEffect = WUPPasswordControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

(window as any).globalkey = {
  pointHere: { required: true, min: 4 } as WUPPassword.Options["validations"],
};

export default function PasswordControlView() {
  return (
    <Page header="PasswordControl" link="#passwordcontrol">
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
          ref={(el) => {
            if (el) {
              el.$options.validations = {
                required: true,
                min: 8,
                minNumber: 1,
                minUpper: 1,
                minLower: 1,
                special: { min: 1, chars: "#!-_?,.@:;'" },
              };
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
        <wup-pwd
          name="disabled"
          ref={(el) => {
            if (el) {
              el.$options.name = "disabled";
              el.$options.disabled = true;
            }
          }}
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
