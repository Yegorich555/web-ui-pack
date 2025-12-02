import Code from "src/elements/code";
import { WUPRadioControl } from "web-ui-pack";

WUPRadioControl.$use();

const items = [
  { value: true, text: "" },
  { value: false, text: "" },
];

document.getElementById("1");

declare module "react" {
  interface HTMLAttributes<T> {
    icon?: string;
  }
}

export default function RadioCustomHtml() {
  return (
    <>
      <wup-radio
        ref={(el) => {
          if (el) {
            el.$options.name = "customViewHtml";
            el.$options.items = items;
          }
        }}
      >
        <fieldset>
          <legend>
            <strong>This is your label</strong>
          </legend>
          <label htmlFor="id_1">
            Option 1
            <input type="radio" name="customViewHtml" id="id_1" />
            <span icon="" />
          </label>
          <label htmlFor="id_2">
            Option 2
            <input type="radio" name="customViewHtml" id="id_2" />
            <span icon="" />
          </label>
        </fieldset>
      </wup-radio>
      <Code code={codeHtml} />
      <Code code={code} />
    </>
  );
}

const codeHtml = `html
<!-- html -->
<wup-radio name="customViewHtml">
  <fieldset>
    <legend> <strong>This is your label</strong> </legend>
    <label for="id_1">
      Option 1
      <input type="radio" name="customViewHtml" id="id_1" />
       <span icon />
    </label>
    <label for="id_2">
      Option 2
      <input type="radio" name="customViewHtml" id="id_2" />
      <span icon />
    </label>
  </fieldset>
</wup-radio>`;

const code = `js
// js
import WUPRadioControl from "web-ui-pack";
WUPRadioControl.$use(); // register control
const el = document.querySelector("wup-radio");
el.$options.items = [
  { value: 1, text: "" },
  { value: 2, text: "" },
]
// WARN: it's important to update .$options.items with html-changes`;
