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

(window as any).inputSelectMany = {
  items,
  initValue: [items[0].value, items[1].value],
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
        tag: "wup-selectmany",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
      features={[
        "Inheritted features from SelectControl", //
        "Possible to select several items",
        "Perfect keyboard support",
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
        <wup-selectmany
          items="window.inputSelectMany.items"
          name="selectMany"
          label="Select Many"
          initValue="window.inputSelectMany.initValue"
          validations="window._someSelectValidations"
          autoComplete="off"
          autoFocus={false}
          ref={(el) => {
            if (el) {
              // setTimeout(() => (el.$initValue = [11, 13, 14]));
              // setTimeout(() => (el.$value = [11, 12]), 1000);
            }
          }}
        />
        <wup-selectmany
          label="With option hideSelected"
          items="inputSelectMany.items"
          ref={(el) => {
            if (el) {
              el.$options.hideSelected = true;
            }
          }}
        />
        <wup-selectmany
          class={styles.withDelIcon}
          ref={(el) => {
            if (el) {
              el.$options.name = "withRemoveIcon";
              el.$options.label = "With remove icon (use css-var --ctrl-select-item-del-display)";
              el.$options.items = items;
              el.$initValue = items.map((it) => it.value);
              // setTimeout(() => (el.$value = items.map((it) => it.value)));
            }
          }}
        />

        <wup-selectmany
          ref={(el) => {
            if (el) {
              el.$options.name = "disabled";
              el.$options.items = items;
              el.$options.disabled = true;
              el.$initValue = [12];
            }
          }}
        />
        <wup-selectmany
          ref={(el) => {
            if (el) {
              el.$options.name = "readonly";
              el.$options.items = items;
              el.$options.readOnly = true;
              el.$initValue = [11];
            }
          }}
        />
        <wup-selectmany
          ref={(el) => {
            if (el) {
              el.$options.name = "allowsNewValue";
              el.$options.label = "Allow New Value ($options.allowNewValue)";
              el.$options.items = items;
              el.$options.allowNewValue = true;
              // todo allowNewValue doesn't allow >1 value & closes popup after 'Enter'
            }
          }}
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
