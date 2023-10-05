/* eslint-disable no-promise-executor-return */
import Page from "src/elements/page";
import { WUPSelectManyControl } from "web-ui-pack";
import stylesCom from "./controls.scss";
import styles from "./selectMany.scss";

const sideEffect = WUPSelectManyControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

let ir = 10;
const items = [
  { text: "Im", value: ++ir },
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

export default function SelectManyControlView() {
  return (
    <Page
      header="SelectManyControl"
      link="src/controls/selectMany.ts"
      details={{
        tag: "wup-selectmany",
        linkDemo: "demo/src/components/controls/selectMany.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
      features={[
        "Inheritted features from SelectControl", //
        "Possible to select several items",
        "Perfect keyboard support",
        "Possible to order/sort via drag&drop (use pointer) or keyboard(Arrows + Shift)",
      ]}
    >
      <wup-form
        class={styles.test}
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("sumbitted model", e.$model);
          }
        }}
        w-autoFocus
      >
        <wup-selectmany
          w-items="window.inputSelectMany.items"
          w-name="selectMany"
          w-label="Select Many"
          w-initValue="window.inputSelectMany.initValue"
          w-validations="window._someSelectValidations2"
          w-autoComplete="off"
          w-sortable={false}
          w-autoFocus={false}
        />
        <div className={stylesCom.group}>
          <wup-selectmany
            w-name="readonly"
            readonly
            w-items="window.inputSelect.items"
            w-initValue="window.inputSelectMany.initValue"
          />
          <wup-selectmany
            w-name="disabled"
            disabled
            w-items="window.inputSelect.items"
            w-initValue="window.inputSelectMany.initValue"
          />
          <wup-selectmany
            w-name="required"
            w-items="window.inputSelect.items"
            w-validations="window._someSelectValidations"
          />
        </div>
        <wup-selectmany
          w-label="With option hideSelected"
          w-items="inputSelectMany.items"
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
            }
          }}
        />
        <wup-selectmany
          w-label="Allow New Value ($options.allowNewValue)"
          w-allowNewValue
          w-name="allowNewValue"
          w-items="inputSelectMany.items"
          w-initValue="window.inputSelectMany.initValue"
        />
        <wup-selectmany
          w-label="Options sortable: true - use drag&drop OR keyboard arrows + Shift"
          w-sortable
          w-name="sorted"
          w-items="inputSelectMany.items"
          ref={(el) => {
            if (el) {
              el.$options.items = items;
              el.$initValue = [12, 15, 16, 17, 18];
            }
          }}
        />
        <wup-selectmany //
          w-name="saveUrlSmany"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey
          w-storage="url"
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
