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
          autoComplete="off"
          autoFocus={false}
          validations="window.myNumberValidations"
          mask=""
          maskholder=""
        />
        <wup-num
          name="decimal"
          label="Decimal (see $options.format)"
          initValue="99.2"
          ref={(el) => {
            if (el) {
              el.$options.format = { maxDecimal: 2, minDecimal: 0 };
            }
          }}
        />
        <wup-num
          name="prefixPostfix"
          label="With postfix prefix"
          initValue="120.20"
          prefix="$ "
          postfix=" USD"
          ref={(el) => {
            if (el) {
              el.$options.format = { maxDecimal: 2, minDecimal: 2 };
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
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
