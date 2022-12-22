/* eslint-disable react/no-unescaped-entities */
import Page from "src/elements/page";
import { WUPTextControl } from "web-ui-pack";
import styles from "./text.scss";

const sideEffect = WUPTextControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

(window as any).myTextValidations = { required: true, min: 4 } as WUPText.Options["validations"];

export default function TextControlView() {
  return (
    <Page
      header="TextControl"
      link="src/controls/text.ts"
      details={{
        tag: "wup-text",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
      features={[
        "Smart clear (reset/revert) by Esc key and button-clear (use $defaults.clearActions)",
        "Built-in validations (required,min,max,email). To extend use $defaults.validations",
        "Smart validations on the fly (use $defaults.validationCases)",
        "Powerful accessibility support (keyboard, announcenement)",
        "Easy to append icons",
        "Mask/maskholder support (options mask & maskholder)",
        "Prefix/postfix support (options prefix & postfix)",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { email: "test@google.com", required: "yes" };
            el.$onSubmit = (e) => console.warn("submitted model", e.$model);
          }
        }}
      >
        <wup-text
          name="email"
          label="Text control"
          initValue="test@google.com"
          autoComplete="off"
          autoFocus={false}
          validations="window.myTextValidations"
          mask=""
          maskholder=""
          prefix=""
          postfix=""
        />
        <wup-text name="required" validations="myTextValidations" />
        <wup-text
          ref={(el) => {
            if (el) {
              el.$options.name = "longName";
              el.$options.label =
                "With long label and custom validations (very very very incredible long label to check if it has ellipsis rule)";
              el.$options.validations = {
                required: true,
                max: 10,
                min: (v) => (!v || v.length < 2) && "This is custom error",
              };
            }
          }}
        />
        <wup-text
          name="withoutClearButton"
          label="Without clear button"
          initValue="Use $options.clearButton"
          ref={(el) => {
            if (el) {
              el.$options.clearButton = false;
              el.$options.validations = {
                required: true,
              };
            }
          }}
        />
        <wup-text
          class={styles.customIcon}
          name="icons"
          label="With custom icon as text (css wup-text>label:before & :after)"
          // initValue="Use css wup-text>label:before & :after"
        />
        <wup-text name="icons2" label="With custom icon as image" class={styles.customIcon2} />
        <wup-text
          name="prefixPostfix"
          label="With prefix & postfix ($options.prefix & .postfix)"
          prefix="$ "
          postfix=" USD"
          initValue="1234"
        />
        <wup-text
          initValue="init value here"
          ref={(el) => {
            if (el) {
              el.$options.name = "readonly";
              el.$options.readOnly = true;
              el.$options.selectOnFocus = false;
            }
          }}
        />
        <wup-text name="disabled" disabled />
        <section>
          <h3>Masked inputs</h3>
          <br />
          <wup-text
            name="phone"
            label="Phone number"
            mask="+1(000) 000-0000"
            initValue="234"
            ref={(el) => {
              if (el) {
                el.$options.validations = { required: true };
              }
            }}
          />
          <wup-text name="ipaddr" label="IPaddress" mask="##0.##0.##0.##0" maskholder="xxx.xxx.xxx.xxx" />
          {/* <wup-text name="num" label="With postfix in mask" mask="$ ##0 USD" maskholder="$ 000 USD" /> */}
          <wup-text
            name="num"
            label="With postfix/prefix & mask"
            mask="##0"
            maskholder="000"
            prefix="$ "
            postfix=" USD"
            initValue="123"
          />
          Features:
          <ul>
            <li>
              supports only numeric mask (to support alphabet-chars create an issue on Github), example:
              <br /> $options.mask=<b>"+1(000) 000-0000"</b> - for phone number
              <br /> $options.mask=<b>"##0.##0.##0.##0"</b> - for IP address
              <br /> where <b>#</b> - optional, <b>0</b> - required number
            </li>
            <li>prediction: all static chars append automatically</li>
            <li>lazy: type next separator on press Space to fill rest required digits with zeros</li>
            <li>history undo/redo (use Ctrl+Z / Ctrl+Shift+Z, Ctrl+Y)</li>
            <li>shows typed declined chars (so user can see that keyboard works) and rollback after 100ms</li>
            <li>possible to delete/append chars in the middle of text</li>
            <li>
              enables validations.mask by default with message <b>Incomplete value</b>
            </li>
            <li>usage details see in JSDoc: use intellisense to get info during the coding</li>
          </ul>
        </section>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
