/* eslint-disable no-promise-executor-return */
import Code from "src/elements/code";
import Page from "src/elements/page";
import { WUPRadioControl } from "web-ui-pack";
import stylesCom from "./controls.scss";

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
  required: false,
} as WUP.Radio.Options["validations"];

(window as any)._someRadioValidations2 = {
  required: true,
} as WUP.Radio.Options["validations"];

(window as any).storedRadioItems = {
  items,
  small: items.slice(0, 3),
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
        linkDemo: "demo/src/components/controls/radio.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.setAttribute("autofocus", "");
            el.$onSubmit = (e) => console.warn("submitted model", e.$model);
          }
        }}
        w-autoFocus
      >
        <wup-radio
          w-name="radio"
          w-label="Radio"
          w-initValue={items[1].value.toString()}
          w-items="storedRadioItems.items"
          w-validations="window._someRadioValidations"
          w-reverse={false}
          w-autoFocus={false}
        />
        <div className={stylesCom.group}>
          <wup-radio
            w-name="readonly"
            readonly
            w-items="storedRadioItems.small"
            w-initValue={items[2].value.toString()}
          />
          <wup-radio
            w-name="disabled"
            disabled
            w-items="storedRadioItems.small"
            w-initValue={items[2].value.toString()}
          />
          <wup-radio
            w-name="required"
            readonly
            w-items="storedRadioItems.small"
            w-validations="window._someRadioValidations2"
          />
        </div>
        <wup-radio
          ref={(el) => {
            if (el) {
              el.$options.name = "reversed";
              el.$options.items = items.slice(0, 4);
              el.$options.reverse = true;
            }
          }}
        />
        <wup-radio //
          w-name="saveUrlRadio"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey
          w-storage="url"
          ref={(el) => {
            if (el) {
              el.$options.items = items;
            }
          }}
        />
        <section>
          <wup-radio
            ref={(el) => {
              if (el) {
                el.$options.name = "customized";
                el.$options.items = () => {
                  const renderText: WUP.Select.MenuItemFn<number>["text"] = (value, li, i) => {
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
