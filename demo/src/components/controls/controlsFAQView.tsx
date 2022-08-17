import Code from "src/elements/code";
import FAQ from "src/elements/faq";
import Page from "src/elements/page";
import styles from "./controlsFAQView.scss";

export default function ControlsFAQView() {
  return (
    <Page header="FormElement & Controls. FAQ" link="" features={null} className={styles.FAQPage}>
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
            link: "form-spinner",
            question: "How to change spinner for FormElement (appears on submit if returned promise result)'",
            answer: <>Comming soon</>,
          },
          {
            link: "validation-rules",
            question: "How to change default validation rules/messages and add new",
            answer: (
              <>
                Every control-type has own $defaults.validationRules
                <Code code={codeVldRules} />
              </>
            ),
          },
          {
            link: "asterisk-for-required",
            question: "How to remove asterisk at the end of label for controls with validationRule 'required'",
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
