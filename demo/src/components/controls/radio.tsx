/* eslint-disable no-promise-executor-return */
import Page from "src/elements/page";
import { WUPRadioControl } from "web-ui-pack";
import MyLink from "src/elements/myLink";
import RadioCustomStyles from "./radio.customStyles";
import stylesCom from "./controls.scss";
import RadioCustomJS from "./radio.customJS";

WUPRadioControl.$use();

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
        "Possible to reverse labels (icon-label OR label-icon)",
        "Possible to customize items rendering (via $options.items; see examples below...)",
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
            el.$onSubmit = (e) => console.warn("submitted model", e.detail.model);
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
          <wup-radio w-name="required" w-items="storedRadioItems.small" w-validations="window._someRadioValidations2" />
        </div>
        <wup-radio
          w-name="reversed"
          w-reverse
          ref={(el) => {
            if (el) {
              el.$options.items = items.slice(0, 4);
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
          <h3>Customized via CSS only</h3>
          <small>
            See details in{" "}
            <MyLink href="/demo/src/components/controls/radio.customCss.scss">radio.customStyles.scss</MyLink>
          </small>
          <RadioCustomStyles />
        </section>

        <section>
          <h3>Customized via JS dynamically</h3>
          <RadioCustomJS />
        </section>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
