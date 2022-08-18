import Code from "src/elements/code";
import FAQ from "src/elements/faq";
import Page from "src/elements/page";
import styles from "./FAQView.scss";

export default function FAQView() {
  return (
    <Page header="FAQ" link="" features={null} className={styles.FAQPage}>
      <FAQ
        items={[
          {
            link: "redefine-styles",
            question: "How to redefine styles",
            answer: (
              <>
                Redefine css variables
                <Code code={codeCssVars} />
              </>
            ),
          },
          {
            link: "support-attributes",
            question: "What attributes possible to use instead of $options",
            answer: (
              <>
                See details on demo for each element. Section <b>HTML</b> contains example with all supported
                attributes.
                <br />
                Every attribute has reflected option. So changing attribute affects on $options (but changing $options
                clears attribute to make HTML clearer)
                <Code code={codeAttrs} />
              </>
            ),
          },
          {
            link: "form-spinner",
            question: "FormElement. How to change spinner (appears on submit if return promise result)'",
            answer: <Code code={codeChangeSpinner} />,
          },
          {
            link: "validation-rules",
            question: "Controls. How to change default validation rules/messages and add new",
            answer: (
              <>
                Every control-type has own $defaults.validationRules
                <Code code={codeVldRules} />
              </>
            ),
          },
          {
            link: "asterisk-for-required",
            question:
              "Controls. How to remove asterisk at the end of label for controls with validationRule 'required'",
            answer: (
              <>
                Apply styles below
                <Code code={codeRemoveRequired} />
              </>
            ),
          },
        ]}
      />
    </Page>
  );
}

const codeCssVars = `css
body { /* Redefine css variables */
  --base-btn-bg: #009fbc;
  --border-radius: 0;
  --ctrl-label: blue; /* etc. */
}`;

const codeAttrs = `js
// HTML code
<wup-text name="email"></wup-text>
// equal to
const el = document.querySelector("wup-text");
el.$options.name = "email";`;

const codeChangeSpinner = `js
// const formEl = document.body.appendChild(document.createElement("wup-form"));
// formEl.$isPending = true; // use this to debug spinner-style

// it's way to redefine global spinner style
// so every web-ui-pack element will use it (SpinElement, FormElement, SelectControl etc.)
import WUPSpinElement, { spinUseDualRing } from "web-ui-pack/spinElement";
spinUseDualRing(WUPSpinElement);

// OR you can redefine spinner only for FormElement directly
import WUPSpinElement, { spinUseDualRing } from "web-ui-pack/spinElement";
class WUPSpin2Element extends WUPSpinElement {}
spinUseDualRing(WUPSpin2Element);
const tagName = "wup-spin-form";
customElements.define(tagName, WUPSpin2Element);

WUPFormElement.prototype.renderSpin = function renderSpin(target: HTMLElement): WUPSpinElement {
  const spin = document.createElement("wup-spin-form");
  spin.$options.fit = true;
  spin.$options.overflowFade = false;
  spin.$options.overflowTarget = target as HTMLButtonElement;
  return spin;
};`;

const codeVldRules = `js
// to define new rule add new property to validationRules
WUPTextControl.$defaults.validationRules.isNumber = (v) =>
    (!v || !/^[0-9]*$/.test(v)) && "Please enter a valid number";
const el = document.createElement("wup-text");
el.$options.validations = { isNumber: true };
// or add function to validations of element directly
const el = document.createElement("wup-text");
el.$options.validations = {
  isNumber: (v) => (!v || !/^[0-9]*$/.test(v)) && "Please enter a valid number",
};

// to redefine default error message need to redefine the whole rule
const origMin = WUPTextControl.$defaults.validationRules.min!;
WUPTextControl.$defaults.validationRules.min = (v, setV) =>
   origMin(v, setV) && 'Your custom error message';

// you must redefine it per each control
WUPPasswordControl.$defaults.validationRules.min = WUPTextControl.$defaults.validationRules.min;

/* ATTENTION
All rules must return error-message for [undefined] value.
It's required to show errorMessages as whole list
via $options.validationShowAll (mostly used for PasswordControl) */
`;

const codeRemoveRequired = `css
body input:required + *:after,
body input[aria-required="true"] + *:after,
body fieldset[aria-required="true"] > legend:after {
  content: none;
}`;
