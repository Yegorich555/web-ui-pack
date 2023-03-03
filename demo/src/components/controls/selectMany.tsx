/* eslint-disable no-promise-executor-return */
import Page from "src/elements/page";
import { WUPSelectManyControl, WUPSpinElement } from "web-ui-pack";
import { spinUseDualRing } from "web-ui-pack/spinElement";
import styles from "./selectMany.scss";

const sideEffect = WUPSelectManyControl;
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

(window as any).inputSelect = {
  items,
};

class WUPSpinSel2Element extends WUPSpinElement {}
spinUseDualRing(WUPSpinSel2Element);
const tagName = "wup-spin-sel2";
customElements.define(tagName, WUPSpinSel2Element);
declare global {
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpinSel2Element;
  }
}

export default function SelectManyControlView() {
  return (
    <Page
      header="SelectManyControl"
      link="src/controls/selectMany.ts"
      details={{
        tag: "wup-select-many",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
      features={[
        "Inheritted features from SelectControl", //
        "Possible to select several items",
        // "Possible to order via Drag&Drop",
      ]}
    >
      <wup-form
        class={styles.test}
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("sumbitted model", e.$model);
          }
        }}
      >
        <wup-select-many
          items="inputSelect.items"
          name="selectMany"
          label="Select Many"
          // initValue={items[8].value.toString()} // todo implement
          validations="window._someSelectValidations"
          autoComplete="off"
          autoFocus={false}
          ref={(el) => {
            if (el) {
              setTimeout(() => (el.$initValue = [11, 13, 14]));
              // setTimeout(() => (el.$value = [11, 12]), 1000);
            }
          }}
        />
        <wup-select-many label="Empty" items="inputSelect.items" />
        <wup-select-many
          class={styles.withDelIcon}
          ref={(el) => {
            if (el) {
              el.$options.name = "withRemoveIcon";
              el.$options.label = "With remove icon (use css-var --ctrl-select-item-del-display)";
              el.$options.items = items;
              el.$initValue = items.map((it) => it.value).splice(0, 8); // todo it doesn't work
              setTimeout(() => (el.$value = items.map((it) => it.value)));
            }
          }}
        />
        {/* <wup-select-many
          ref={(el) => {
            if (el) {
              el.$options.name = "withPending";
              el.$options.label = "With pending (set promise to $options.items)";
              el.$options.items = () => new Promise((resolve) => setTimeout(() => resolve(items), 3000));
            }
          }}
        />
        <wup-select-many
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
              el.$initValue = 13;
            }
          }}
        />
        <wup-select-many
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
        <wup-select-many
          ref={(el) => {
            if (el) {
              el.$options.name = "disabled";
              el.$options.items = items;
              el.$options.disabled = true;
            }
          }}
        />
        <wup-select-many
          ref={(el) => {
            if (el) {
              el.$options.name = "readonly";
              el.$options.items = items;
              el.$options.readOnly = true;
            }
          }}
        />
        <wup-select-many
          initValue="13"
          ref={(el) => {
            if (el) {
              el.$options.name = "withoutClearButton";
              el.$options.items = items;
              el.$options.clearButton = false;
            }
          }}
        />
        <wup-select-many
          initValue="14"
          ref={(el) => {
            if (el) {
              el.$options.name = "allowsNewValue";
              el.$options.label = "Allows New Value ($options.allowNewValue)";
              el.$options.items = items;
              el.$options.allowNewValue = true;
            }
          }}
        /> */}
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
