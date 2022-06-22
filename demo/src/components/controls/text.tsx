import Page from "src/elements/page";
import { WUPTextControl } from "web-ui-pack";

const sideEffect = WUPTextControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

export default function TextControlView() {
  return (
    <Page header="TextControl" link="#textcontrol">
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { email: "test-me@google.com", required: "yes" };
            el.$onSubmit = (e) => console.warn("sumbitted model", e.$model);
          }
        }}
      >
        <wup-text name="email" label="Text" />
        <wup-text
          ref={(el) => {
            if (el) {
              el.$options.name = "required";
              el.$options.validations = { required: true };
            }
          }}
        />
        <wup-text
          ref={(el) => {
            if (el) {
              el.$options.name = "longName";
              el.$options.label =
                "With long label and custom validations (very very very incredible long label to check if it has ellipsis rule)";
              el.$options.validations = {
                required: true,
                max: 10,
                min: (v) => v.length < 2 && "This is custom error",
              };
            }
          }}
        />
        <wup-text
          name="withoutButtonClear"
          ref={(el) => {
            if (el) {
              el.$options.clearButton = false;
            }
          }}
        />
        <wup-text
          ref={(el) => {
            if (el) {
              el.$options.name = "readonly";
              el.$options.readOnly = true;
              el.$options.selectOnFocus = false;
              el.$initValue = "init value here";
            }
          }}
        />
        <wup-text
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
