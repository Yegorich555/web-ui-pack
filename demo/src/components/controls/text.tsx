import Page from "src/elements/page";
import { WUPTextControl } from "web-ui-pack";

const sideEffect = WUPTextControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

(window as any).globalkey = {
  pointHere: { required: true } as WUPText.Options["validations"],
};

export default function TextControlView() {
  return (
    <Page
      header="TextControl"
      link="src/controls/text.ts"
      details={{
        tag: "wup-text",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
      features={[
        "Smart clear (reset/revert) by Esc key and button-clear (use $defaults.clearActions)",
        "Built-in validations (required,min,max,email). To extend use $defaults.validations",
        "Smart validations on the fly (use $defaults.validationCases)",
        "Powerful accessibility support",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { email: "test@google.com", required: "yes" };
            el.$onSubmit = (e) => console.warn("sumbitted model", e.$model);
          }
        }}
      >
        <wup-text
          name="email"
          label="Text control"
          initValue="test@google.com"
          autoComplete="off"
          validations="window._someObject"
        />
        <wup-text name="required" validations="globalkey.pointHere" />
        <wup-text
          ref={(el) => {
            if (el) {
              el.$options.name = "longName";
              el.$options.label =
                "With long label and custom validations (very very very incredible long label to check if it has ellipsis rule)";
              el.$options.validations = {
                required: true,
                max: 10,
                min: (v) => (!v || v.length < 2) && "This is custom error",
              };
            }
          }}
        />
        <wup-text
          name="withoutClearButton"
          label="Without clear button (options.clearButton)"
          ref={(el) => {
            if (el) {
              el.$options.clearButton = false;
              el.$options.validations = {
                required: true,
              };
            }
          }}
        />
        <wup-text
          initValue="init value here"
          ref={(el) => {
            if (el) {
              el.$options.name = "readonly";
              el.$options.readOnly = true;
              el.$options.selectOnFocus = false;
            }
          }}
        />
        <wup-text
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
