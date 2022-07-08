/* eslint-disable no-promise-executor-return */
import Page from "src/elements/page";
import { WUPSelectManyControl, WUPSpinElement } from "web-ui-pack";
import { spinUseDualRing } from "web-ui-pack/spinElement";

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
    <Page header="SelectManyControl" link="#selectmanycontrol">
      <wup-form
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("sumbitted model", e.$model);
          }
        }}
      >
        <wup-select
          items="inputSelect.items"
          ref={(el) => {
            if (el) {
              el.$options.name = "selectManyControl";
            }
          }}
        />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "withPending";
              el.$options.label = "With pending (set promise to $options.items)";
              el.$options.items = () => new Promise((resolve) => setTimeout(() => resolve(items), 3000));
            }
          }}
        />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.name = "customSpin";
              el.$options.label = "CustomSpin: see WUPSpinElement types or override renderSpin() method";
              el.$options.items = () => new Promise((resolve) => setTimeout(() => resolve(items), 3000));
              el.renderSpin = function renderCustomSpin(this: WUPSelectManyControl) {
                const spin = document.createElement("wup-spin-sel");
                spin.$options.fit = true;
                spin.$options.overflowFade = true;
                spin.$options.overflowTarget = this;
                // eslint-disable-next-line react/no-this-in-sfc
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
              el.$initValue = ir - 3;
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
          ref={(el) => {
            if (el) {
              el.$options.name = "withInitValue";
              el.$options.items = items;
              el.$initValue = ir - 2;
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
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}