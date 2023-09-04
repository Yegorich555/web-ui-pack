/* eslint-disable no-promise-executor-return */
import Page from "src/elements/page";
import { WUPSelectControl, WUPSpinElement } from "web-ui-pack";
import { spinUseDualRing } from "web-ui-pack/spinElement";

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

// for (let i = 20; i < 100; ++i) {
//   items.push({ text: `Item N #${i}`, value: i });
// }

// for (let i = 20; i < 1000; ++i) {
//   items.push({ text: `Test ${i}`, value: i });
// }

(window as any).inputSelect = {
  items,
  initArr: [items[0].value, items[1].value],
};

(window as any)._someSelectValidations = {
  required: true,
} as WUP.Select.Options["validations"];

class WUPSpinSelElement extends WUPSpinElement {}
spinUseDualRing(WUPSpinSelElement);
const tagName = "wup-spin-sel";
customElements.define(tagName, WUPSpinSelElement);
declare global {
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpinSelElement;
  }
}

export default function SelectControlView() {
  return (
    <Page
      header="SelectControl (Dropdown)"
      link="src/controls/select.ts"
      details={{
        tag: "wup-select",
        linkDemo: "demo/src/components/controls/select.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
      features={[
        "Inheritted features from TextControl",
        "Pending state with spinner if $options.items is a function with promise-result",
        "Possible to customize render of items (via $options.items; see below...)",
        "Possible to create any value not pointed in items (via $options.allowNewValue)",
        "Possible to select multiple items (via $options.multiple)",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("submitted model", e.$model);
            el.$initModel = { asDropdown: items[3].value };
          }
        }}
      >
        <wup-select
          items="window.inputSelect.items"
          name="select"
          label="Select"
          initValue={items[items.length - 3].value.toString()}
          multiple={false}
          validations="window._someSelectValidations"
          ref={(el) => {
            if (el) {
              // el.$options.autoFocus = true;
            }
          }}
        />
        <wup-select
          name="multiple"
          initValue="window.inputSelect.initArr"
          items="window.inputSelect.items"
          multiple
          ref={(el) => {
            if (el) {
              el.$options.allowNewValue = true;
            }
          }}
        />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "withPending";
              el.$options.label = "With pending (set Promise to $options.items)";
              el.$options.items = () => new Promise((resolve) => setTimeout(() => resolve(items), 3000));
              // el.$initValue = 13;
            }
          }}
        />
        <wup-select
          initValue={13}
          ref={(el) => {
            if (el) {
              el.$options.name = "customSpin";
              el.$options.label = "CustomSpin: see WUPSpinElement types or override renderSpin() method";
              el.$options.items = () => new Promise((resolve) => setTimeout(() => resolve(items), 3000));
              el.renderSpin = function renderCustomSpin(this: WUPSelectControl) {
                const spin = document.createElement("wup-spin-sel");
                spin.$options.fit = true;
                spin.$options.overflowFade = true;
                spin.$options.overflowTarget = this;
                this.appendChild(spin);
                return spin;
              };
            }
          }}
        />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "asDropdown";
              el.$options.label = "As dropdown ($options.readOnlyInput)";
              el.$options.items = items;
              // el.$initValue = ir - 3;
              el.$options.readOnlyInput = true;
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
          initValue="13"
          ref={(el) => {
            if (el) {
              el.$options.name = "withoutClearButton";
              el.$options.items = items;
              el.$options.clearButton = false;
            }
          }}
        />
        <wup-select
          initValue="14"
          ref={(el) => {
            if (el) {
              el.$options.name = "allowNewValue";
              el.$options.label = "Allow New Value ($options.allowNewValue)";
              el.$options.items = items;
              el.$options.allowNewValue = true;
            }
          }}
        />
        <wup-select //
          name="saveUrlSelect"
          label="With saving to URL (see $options.storageKey & storage)"
          storageKey
          storage="url"
          ref={(el) => {
            if (el) {
              el.$options.items = items;
            }
          }}
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
