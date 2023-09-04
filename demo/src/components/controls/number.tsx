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
          name="number"
          label="Number"
          initValue="1234"
          validations="window.myNumberValidations"
          mask=""
          maskholder=""
          prefix=""
          postfix=""
        />
        <wup-num
          name="prefixPostfix"
          label="With postfix prefix"
          prefix="$ "
          postfix=" USD"
          ref={(el) => {
            if (el) {
              el.$options = { ...el.$options, format: { maxDecimal: 2 } };
              el.$initValue = 120.58; // WARN: was issue here
            }
          }}
        />
        <wup-num name="NumberRequired" validations="myRequiredValidations" />
        <wup-num name="WithMask" label="With Mask (mask always ignores format)" mask="0000-0000" />
        <wup-num
          name="readonly"
          ref={(el) => {
            if (el) {
              el.$options.name = "readonly";
              el.$options.readOnly = true;
            }
          }}
        />
        <wup-num name="disabled" disabled />
        <wup-num //
          name="saveUrlNum"
          label="With saving to URL (see $options.storageKey & storage)"
          storageKey
          storage="url"
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
