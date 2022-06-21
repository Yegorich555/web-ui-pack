/* eslint-disable no-promise-executor-return */
import Page from "src/elements/page";
import { WUPSelectControl } from "web-ui-pack";

const sideEffect = WUPSelectControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

let ir = 10;
const items = [
  { text: "Item N 1", value: ++ir },
  { text: "Item N 2", value: ++ir },
  { text: "Item N 3", value: ++ir },
  { text: "Item N 4", value: ++ir },
  { text: "Item N 5", value: ++ir },
  { text: "Donny 1", value: ++ir },
  { text: "Item N 7", value: ++ir },
  { text: "Donny 2", value: ++ir },
  { text: "Item N 9", value: ++ir },
  { text: "Item N 10", value: ++ir },
  // { text: (v, li, i) => li.append(v.toString()), value: 124 },
];

export default function SelectControlView() {
  return (
    <Page header="TextControl" link="#selectcontrol">
      <wup-form
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("sumbitted model", e.$model);
          }
        }}
      >
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "selectControl";
              el.$options.items = items;
            }
          }}
        />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "withPending";
              el.$options.label = "With pending (set promise to $options.items)";
              el.$options.items = () => new Promise((resolve) => setTimeout(() => resolve(items), 3000));
              el.$options.selectOnFocus = true;
            }
          }}
        />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "asDropdown";
              el.$options.label = "As dropdown ($options.readOnlyInput)";
              el.$options.items = items;
              el.$options.readOnlyInput = true; // todo disable ability to select text-value ???
            }
          }}
        />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "disabled";
              el.$options.items = items;
              el.$options.disabled = true;
            }
          }}
        />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "readonly";
              el.$options.items = items;
              el.$options.readOnly = true;
            }
          }}
        />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "withInitValue";
              el.$options.items = items;
              el.$initValue = ir - 2;
            }
          }}
        />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "withoutButtonClear";
              el.$options.items = items;
              el.$initValue = ir - 2;
              el.$options.hasButtonClear = false;
            }
          }}
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}

// todo way to change spinner
