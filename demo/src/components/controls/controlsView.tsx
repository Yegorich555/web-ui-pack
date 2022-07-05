/* eslint-disable no-promise-executor-return */
import Page from "src/elements/page";
import {
  WUPSelectControl,
  WUPTextControl,
  WUPSpinElement,
  WUPSwitchControl,
  WUPCheckControl,
  WUPRadioControl,
  WUPPasswordControl,
  WUPSelectManyControl,
} from "web-ui-pack";
import styles from "./controlsView.scss";

const sideEffect =
  WUPTextControl &&
  WUPPasswordControl &&
  WUPSelectControl &&
  WUPSelectManyControl &&
  WUPSpinElement &&
  WUPSwitchControl &&
  WUPCheckControl &&
  WUPRadioControl;
!sideEffect && console.error("!"); // It's required otherwise import is ignored by webpack

let ir = 10;
const items = [
  { text: "Item N 1", value: ++ir },
  { text: "Item N 2", value: ++ir },
  { text: "Wizard", value: ++ir },
  { text: "Item N 4", value: ++ir },
  { text: "Item N 5", value: ++ir },
  { text: "Don", value: ++ir },
  { text: "Item N 7", value: ++ir },
  { text: "Angel", value: ++ir },
  { text: "Item N 9", value: ++ir },
  { text: "Item N 10", value: ++ir },
  // { text: (v, li, i) => li.append(v.toString()), value: 124 },
];

export default function ControlsView() {
  return (
    <Page header="Controls" link="#textControl">
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { text: "test-me@google.com" };
            el.$isPending = false;
            el.$options.disabled = false;
            el.$options.readOnly = false;
            el.$onSubmit = (e) => {
              console.warn("sumbitted model", e.$model);
              // eslint-disable-next-line no-promise-executor-return
              return new Promise((resolve) => setTimeout(resolve, 1000));
            };
          }
        }}
      >
        <wup-text name="text" />
        <wup-pwd name="password" />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.label = "Select (combobox/dropdown)";
              el.$options.items = items;
              el.$options.validations = {
                required: true,
              };
              el.$options.name = "select";
            }
          }}
        />
        <wup-select-many
          class={styles.multiCustom}
          ref={(el) => {
            if (el) {
              el.$options.items = items;
              el.$options.name = "selectMany";
              el.$options.label = "Select Many (development...)";
              el.$initValue = [items[0].value, items[2].value];
            }
          }}
        />

        <wup-switch name="switch" />
        <wup-check name="checkbox" />
        <wup-radio
          ref={(el) => {
            if (el) {
              el.$options.name = "radioGroup";
              el.$options.items = items.slice(0, 4);
            }
          }}
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
