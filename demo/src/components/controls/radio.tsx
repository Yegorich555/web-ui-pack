/* eslint-disable no-promise-executor-return */
import Page from "src/elements/page";
import { WUPRadioControl } from "web-ui-pack";

const sideEffect = WUPRadioControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

let ir = 10;
const items = [
  { text: "Item N 1", value: ++ir },
  { text: "Item N 2", value: ++ir },
  { text: "Item N 3", value: ++ir },
  { text: "Item N 4", value: ++ir },
  { text: "Item N 5", value: ++ir },
  { text: "Don 1", value: ++ir },
  { text: "Item N 7", value: ++ir },
  { text: "Angel", value: ++ir },
  { text: "Item N 9", value: ++ir },
  { text: "Item N 10", value: ++ir },
  // { text: (v, li, i) => li.append(v.toString()), value: 124 },
];

(window as any).inputRadio = {
  items,
};

export default function RadioControlView() {
  return (
    <Page header="RadioControl" link="#radiocontrol">
      <wup-form
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("sumbitted model", e.$model);
          }
        }}
      >
        <wup-radio
          ref={(el) => {
            if (el) {
              el.$options.name = "radio";
              el.$options.items = items.slice(0, 4);
              el.$options.validations = { required: true };
            }
          }}
        />
        <wup-radio
          items="inputRadio.items"
          ref={(el) => {
            if (el) {
              el.$options.name = "disabled";
              el.$options.disabled = true;
            }
          }}
        />
        <wup-radio
          ref={(el) => {
            if (el) {
              el.$options.name = "readonly";
              el.$options.items = items;
              el.$options.readOnly = true;
            }
          }}
        />
        <wup-radio
          ref={(el) => {
            if (el) {
              el.$options.name = "withInitValue";
              el.$options.items = items;
              el.$initValue = ir - 2;
            }
          }}
        />
        <wup-radio
          initValue="13"
          ref={(el) => {
            if (el) {
              el.$options.name = "reversed";
              el.$options.items = items;
              el.$options.reverse = true;
            }
          }}
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
