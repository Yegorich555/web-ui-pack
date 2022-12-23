/* eslint-disable react/no-unescaped-entities */
import Page from "src/elements/page";
import { WUPTextareaControl } from "web-ui-pack";

const sideEffect = WUPTextareaControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

(window as any).myTextareaValidations = { min: 4 } as WUPTextarea.Options["validations"];

export default function TextControlView() {
  return (
    <Page
      header="TextareaControl"
      link="src/controls/textarea.ts"
      // details={{
      //   tag: "wup-textarea",
      //   cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      // }}
      features={[
        "Inheritted features from TextControl", //
        // todo implement "Autoheight (use $options.autoheight)",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { email: "test@google.com", required: "yes" };
            el.$onSubmit = (e) => console.warn("submitted model", e.$model);
          }
        }}
      >
        <wup-textarea
          name="email"
          label="Text control"
          initValue="test@google.com"
          autoComplete="off"
          autoFocus={false}
          validations="window.myTextareaValidations"
          mask=""
          maskholder=""
          prefix=""
          postfix=""
          // autoheight={false}
        />
        <wup-textarea name="required" validations="myTextareaValidations" />
        <wup-textarea
          ref={(el) => {
            if (el) {
              el.$options.name = "longName";
              el.$options.label =
                "With long label and custom validations (very very very incredible long label to check if it has ellipsis rule)";
              el.$options.validations = {
                required: true,
                max: 250,
                min: (v) => (!v || v.length < 2) && "This is custom error",
              };
              el.$value = "hello\na\nb\na\nb\na\nb";
            }
          }}
        />
        <wup-textarea
          name="withoutClearButton"
          label="Without clear button"
          initValue="Use $options.clearButton"
          ref={(el) => {
            if (el) {
              el.$options.clearButton = false;
              el.$options.validations = {
                required: true,
              };
            }
          }}
        />

        <wup-textarea
          initValue="init value here"
          name="readonly"
          ref={(el) => {
            if (el) {
              el.$options.readOnly = true;
            }
          }}
        />
        <wup-textarea name="disabled" disabled />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
