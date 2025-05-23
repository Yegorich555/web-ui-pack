/* eslint-disable react/no-unescaped-entities */
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
  WUPFormElement,
} from "web-ui-pack";

WUPFormElement.$use();
WUPTextControl.$use();
WUPPasswordControl.$use();
WUPSelectControl.$use();
WUPSelectManyControl.$use();
WUPSpinElement.$use();
WUPSwitchControl.$use();
WUPCheckControl.$use();
WUPRadioControl.$use();

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
    <Page
      header="FormElement & Controls"
      link="src/formElement.ts"
      features={[
        "Powerful accessibility and keyboard support",
        "Built-in highly customizable validations rules",
        <>
          Custom <b>$submit</b> event with collected values into single model-object according to control-names
        </>,
        <>
          Custom <b>$change</b> event with collected values into single model-object according to control-names
        </>,
        <>
          Nested complex model (use dotted names for controls: <b>name="personal.firstName")</b>
        </>,
        "Validate by submit and scroll + focus into first invalid input if exists",
        <>
          Pending state with spinner if return promise for <b>$onSubmit()</b> method
        </>,
        <>
          Option <b>autoStore</b> prevents losing not-sumbitted data
        </>,
      ]}
      details={{ tag: "wup-form", linkDemo: "demo/src/components/controls/controlsView.tsx", customHTML, customJS }}
    >
      <wup-form
        w-autoComplete={false}
        w-autoStore={false}
        w-autoFocus
        disabled={false}
        readonly={false}
        ref={(el) => {
          if (el) {
            // el.$initModel = { text: "test-me@google.com" };
            el.$isPending = false;
            el.$onSubmit = (e) => {
              console.warn("submitted model", e.detail.model);
              console.warn("to convert model to FormData use helper: web-ui-pack/helpers/objectToFormData");
              // eslint-disable-next-line no-promise-executor-return
              return new Promise((resolve) => setTimeout(resolve, 1000));
            };
          }
        }}
      >
        <wup-text w-name="text" />
        <wup-pwd w-name="password" />
        <wup-select
          w-name="select"
          w-label="Select (combobox/dropdown)"
          ref={(el) => {
            if (el) {
              el.$options.items = items;
              el.$options.validations = {
                required: true,
              };
            }
          }}
        />
        <wup-selectmany
          w-name="selectMany"
          ref={(el) => {
            if (el) {
              el.$options.items = items;
              el.$initValue = [items[0].value, items[2].value];
            }
          }}
        />

        <wup-switch w-name="switch" />
        <wup-check w-name="checkbox" />
        <wup-radio
          w-name="radioGroup"
          ref={(el) => {
            if (el) {
              el.$options.items = items.slice(0, 4);
            }
          }}
        />
        <wup-date w-name="date" />
        <wup-time w-name="time" />
        <button type="submit">Submit (see result into browser console)</button>
      </wup-form>
    </Page>
  );
}

const customHTML = [
  `html
<wup-form
  w-autocomplete="false"
  w-autostore="false"
  w-autofocus="false"
  readonly="false"
  disabled="false"
>
  <wup-text w-name="firstName"/>
  <wup-text w-name="lastName" />
  <wup-text w-name="email"/>
  <wup-pwd w-name="password"/>
  ...
  <button type="submit">Submit</button>
</wup-form>`,
];

const customJS = `js
const form = document.querySelector("wup-form")!;
form.$onSubmit = (e) => {
  // post request here
  console.warn("submitted model", e.detail.model);
  // return promise to block form and show spinner
  return new Promise<boolean>((resolve) => setTimeout(resolve, 1000));
};

const iFirstName = form.$controls[0] as WUPTextControl;
iFirstName.$options.validations = { required: true };
iFirstName.$initValue = "Dan";

const iLastName = form.$controls[1] as WUPTextControl;
iLastName.$options.validations = { required: true };

const iEmail = form.$controls[2] as WUPTextControl;
iEmail.$options.validations = { required: true, email: true };

const pwd = form.$controls[3] as WUPPasswordControl;
pwd.$options.validations = {
  required: true,
  min: 8,
  minNumber: 1,
  minUpper: 1,
  minLower: 1,
  special: { min: 1, chars: "#!-_?,.@:;'" },
};
pwd.$options.validationShowAll = true;`;
