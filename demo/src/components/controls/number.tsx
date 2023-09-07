import Page from "src/elements/page";
import { WUPNumberControl } from "web-ui-pack";

const sideEffect = WUPNumberControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

(window as any).myNumberValidations = {
  min: 8,
  max: 1000,
} as WUP.Number.Options["validations"];

(window as any).myRequiredValidations = { required: true } as WUP.Number.Options["validations"];

export default function NumberControlView() {
  return (
    <Page
      header="NumberControl"
      link="src/controls/number.ts"
      features={[
        "Inheritted features from TextControl",
        "Built-in validations (required,min,max)",
        "Increment/decrement via ArrowKeys, Mouse, TouchEvents(Swipe) + keys Shift/Ctrl/Alt (only when focused)",
        "Different formats (currency, etc.). Use $options.format to redefine defaults",
        "Display format depends on user-locale (see web-ui-pack/objects/localeInfo). Use $options.format or localeInfo (globally)",
      ]}
      details={{
        tag: "wup-num",
        linkDemo: "demo/src/components/controls/number.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { pwd: "somePwdHere", required: "yes" };
            el.$onSubmit = (e) => console.warn("submitted model", e.$model);
          }
        }}
      >
        <wup-num
          w-name="number"
          w-label="Number"
          w-initValue="1234"
          w-validations="window.myNumberValidations"
          w-mask=""
          w-maskholder=""
          w-prefix=""
          w-postfix=""
        />
        <wup-num
          w-name="prefixPostfix"
          w-label="With postfix prefix"
          w-prefix="$ "
          w-postfix=" USD"
          ref={(el) => {
            if (el) {
              el.$options = { ...el.$options, format: { maxDecimal: 2 } };
              el.$initValue = 120.58; // WARN: was issue here
            }
          }}
        />
        <wup-num w-name="NumberRequired" w-validations="myRequiredValidations" />
        <wup-num w-name="WithMask" w-label="With Mask (mask always ignores format)" w-mask="0000-0000" />
        <wup-num
          w-name="readonly"
          ref={(el) => {
            if (el) {
              el.$options.name = "readonly";
              el.$options.readOnly = true;
            }
          }}
        />
        <wup-num w-name="disabled" disabled />
        <wup-num //
          w-name="saveUrlNum"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey
          w-storage="url"
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
