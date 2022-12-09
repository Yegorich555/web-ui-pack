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
            link: "control-spinner",
            question: "FormElement, SelectControl. How to change spinner (appears on submit if return promise result)",
            answer: <Code code={codeChangeSpinner} />,
          },
          {
            link: "detach-controls",
            question: "Controls. How to detach from FormElement (exclude from model, validation, changes etc.)",
            answer: (
              <>
                Use $options.<b>name</b> per each control (<b>readonly</b>, <b>disabled</b> applies even to detached
                controls inside form)
                <Code code={codeControlDetach} />
              </>
            ),
          },
          {
            link: "validation-rules",
            question: "Controls. How to change default validation rules/messages and add new",
            answer: (
              <>
                Every control-type has $defaults.validationRules
                <Code code={codeVldRules} />
              </>
            ),
          },
          {
            link: "validations",
            question: "Controls & Form. How validations works and form collects model",
            answer: (
              <section>
                <ol>
                  <li>Controls have $defaults.validationCase where you can change default behavior</li>
                  <li>
                    When user clicks on submit button OR press Enter key then form
                    <br />- validates all attached & enabled controls (controls with name!=null and $isDisabled==false)
                    <br />- if above is valid: gathers value into submit-model (according to control names)
                    <br />- dispatches onSubmit, $submit, submit events
                    <br />- if dispatched returns promise: blocks form and show spinner until promise resolved
                  </li>
                  <li>
                    If some control was invalid but switched to disabled then
                    <br /> - error message hidden but control.$isValid still returns false
                    <br /> - such control is completely ignored from submit-model and validation (but re-validation
                    triggered anyway)
                    <br /> - form.$isValid returns true despite on invalid & disabled controls
                    <br /> - form.$model returns gathered model including invalid & disabled controls
                    <br /> - submit-model returns gathered model without disabled controls
                    <br /> - rules aboves works only for disabled control; for readonly control it works usually
                  </li>
                </ol>
              </section>
            ),
          },
          {
            link: "asterisk-for-required",
            question:
              "Controls. How to remove asterisk at the end of label for controls with validationRule [required]",
            answer: (
              <>
                Apply styles below
                <Code code={codeRemoveRequired} />
              </>
            ),
          },
          {
            link: "parse-init-value",
            question: "Controls. How to change parsing attribute [initvalue]",
            answer: (
              <>
                When applied attribute [initvalue] controls use method parseValue(). By default it&apos;s search by
                string-type. But you can override behavior
                <Code code={codeParseInitValue} />
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

const codeControlDetach = `js
const form = document.body.appendChild(document.createElement("wup-form"));
const el = form.appendChild(document.createElement("wup-text"));
el.$options.name = undefined; // To completely detach from FormElement skip option name
// OR
el.$options.name = ""; // To partially detach (exlcude from model, isChanged, but included in validations, submit)
/* WARNING: event $change bubbles from control.
 * To subscribe for only attached controls changes you need filter it yourself */
form.addEventListener("$change", (e) => {
  if ((e.target as IBaseControl).$options.name) {
    console.warn("this control is attached and changed", e);
  }
});`;

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

const codeParseInitValue = `js
WUPRadioControl.prototype.parse = function parse(stringValue: string) {
  // let's imagine that attrValue is pointer to global key
  return (window as any)[stringValue];
};`;
