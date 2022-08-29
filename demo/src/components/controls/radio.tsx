/* eslint-disable no-promise-executor-return */
import Code from "src/elements/code";
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

(window as any)._someRadioValidations = {
  required: true,
} as WUPRadio.Options["validations"];

(window as any).storedRadioItems = {
  items: items.slice(0, 4),
};

export default function RadioControlView() {
  return (
    <Page
      header="RadioControl"
      link="src/controls/radio.ts"
      features={[
        "Easy to change size of items and style via css-variables (ctrl-radio-size...)", //
        "Possible to reverse labels",
        "Possible to customize render of items (via $options.items; see below...)",
      ]}
      details={{
        tag: "wup-radio",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("sumbitted model", e.$model);
          }
        }}
      >
        <wup-radio
          name="radio"
          label="Radio"
          initValue={items[1].value.toString()}
          items="storedRadioItems.items"
          validations="window._someRadioValidations"
          reverse={false}
          autoComplete="off"
          autoFocus={false}
        />
        <wup-radio
          ref={(el) => {
            if (el) {
              el.$options.name = "disabled";
              el.$options.disabled = true;
              el.$options.items = items;
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
        <section>
          <wup-radio
            ref={(el) => {
              if (el) {
                el.$options.name = "customized";
                el.$options.items = () => {
                  const renderText: WUPSelect.MenuItemFn<number>["text"] = (value, li, i) => {
                    li.innerHTML = `<b>Value</b>: ${value}, <span style="color: red">index</span>: ${i}`;
                    return li.textContent as string;
                  };
                  return [
                    { value: 1, text: renderText },
                    { value: 2, text: renderText },
                  ];
                };
              }
            }}
          />
          <Code code={codeTypes} />
        </section>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}

const codeTypes = `js
import WUPRadioControl from "web-ui-pack";
// otherwise import is ignored by webpack
!WUPRadioControl && console.error("!");

const el = document.createElement("wup-radio");
el.$options.name = "customized";
el.$options.items = () => {
  const renderText: WUPSelect.MenuItemFn<number>["text"] =
  (value, li, i) => {
    li.innerHTML = \`<b>Value</b>: \${value},
       <span style="color: red">index</span>: \${i}\`;
    return value.toString();
  };
  return [
    { value: 1, text: renderText },
    { value: 2, text: renderText },
  ];
};
document.body.appendChild(el);`;
