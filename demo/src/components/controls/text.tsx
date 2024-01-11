/* eslint-disable react/no-unescaped-entities */
import Page from "src/elements/page";
import { WUPTextControl } from "web-ui-pack";
import Anchor from "src/elements/anchor";
import FAQ from "src/elements/faq";
import Code from "src/elements/code";
import stylesCom from "./controls.scss";
import styles from "./text.scss";

WUPTextControl.$use();

(window as any).myTextValidations = { min: 4 } as WUP.Text.Options["validations"];
(window as any).myTextValidations2 = { required: true } as WUP.Text.Options["validations"];

export default function TextControlView() {
  return (
    <Page
      header="TextControl"
      link="src/controls/text.ts"
      details={{
        tag: "wup-text",
        linkDemo: "demo/src/components/controls/text.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
      }}
      features={[
        "Smart clear (reset/revert) by Esc key and button-clear (use $defaults.clearActions)",
        "Built-in validations (required,min,max,email). To extend use $defaults.validations",
        "Smart validations on the fly (use $defaults.validationCases)",
        "Powerful accessibility support (keyboard, announcement)",
        "Easy to append icons",
        "Mask/maskholder support (options mask & maskholder)",
        "Prefix/postfix support (options prefix & postfix)",
        "Ability to save value to localStorage, sessionStorage, URL (options storageKey & storage)",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { email: "test@google.com" };
            el.$onSubmit = (e) => console.warn("submitted model", e.detail.model);
          }
        }}
        w-autoFocus
      >
        <wup-text
          w-name="email"
          w-label="Text control"
          w-initValue="test@google.com"
          w-validations="window.myTextValidations"
          w-mask=""
          w-maskholder=""
          w-prefix=""
          w-postfix=""
        />
        <div className={stylesCom.group}>
          <wup-text
            w-initValue="init value here"
            w-name="readonly"
            ref={(el) => {
              if (el) {
                el.$options.readOnly = true;
              }
            }}
          />
          <wup-text
            w-name="disabled"
            w-initValue="init value here"
            ref={(el) => {
              if (el) {
                el.$options.disabled = true;
              }
            }}
          />
          <wup-text w-name="required" w-validations="myTextValidations2" />
        </div>
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
          w-name="withoutClearButton"
          w-label="Without clear button"
          w-initValue="Use $options.clearButton"
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
          w-name="icons"
          w-label="With custom icon as text (css wup-text>label:before & :after)"
          // initValue="Use css wup-text>label:before & :after"
        />
        <wup-text w-name="icons2" w-label="With custom icon as image" class={styles.customIcon2} />
        <wup-text
          w-name="prefixPostfix"
          w-label="With prefix & postfix ($options.prefix & .postfix)"
          w-prefix="$ "
          w-postfix=" USD"
          w-initValue="1234"
        />
        <wup-text //
          w-name="saveUrl"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey
          w-storage="url"
        />
        <section>
          <h3>
            <Anchor hash="mask">Masked inputs</Anchor>
          </h3>
          <wup-text
            w-name="phone"
            w-label="Phone number"
            w-mask="+0 (000) 000-0000"
            // initValue="+1 (234) 567-8901"
            ref={(el) => {
              if (el) {
                el.$options.validations = { required: true };
              }
            }}
          />
          <wup-text
            w-name="ipaddr"
            w-label="IPaddress"
            w-mask="##0.##0.##0.##0"
            w-maskholder="xxx.xxx.xxx.xxx"
            // initValue="123.4.5.67"
            ref={(el) => {
              if (el) {
                el.$options.autoFocus = false;
              }
            }}
          />
          <wup-text
            w-name="num"
            w-label="With prefix/postfix & mask"
            w-mask="##0"
            w-maskholder="000"
            w-prefix="$ "
            w-postfix=" USD"
            w-initValue="12"
          />
          Features:
          <ul>
            <li>
              Formats example:
              <br /> $options.mask=<b className={styles.text2}>"+0 (000) 000-0000"</b> - for phone number
              <br /> $options.mask=<b className={styles.text2}>"##0.##0.##0.##0"</b> - for IP address
              <br /> $options.mask=<b className={styles.text2}>"*{"{1,5}"}"</b> - any 1..5 chars
              <br /> $options.mask=<b className={styles.text2}>"//[a-zA-Z]//{"{1,5}"}"</b> - regex /[a-zA-Z]/: 1..5
              letters
              <br /> where <b className={styles.text2}>#</b> - optional digit, <b className={styles.text2}>0</b> -
              required digit, <b className={styles.text2}>*</b> - any char
            </li>
            <li>prediction: all static chars append automatically</li>
            <li>lazy: type next separator on press Space to fill rest required digits with zeros</li>
            <li>history undo/redo (use Ctrl+Z / Ctrl+Shift+Z, Ctrl+Y)</li>
            <li>shows typed declined chars (so user can see that keyboard works) and rollback after 100ms</li>
            <li>possible to delete/append chars in the middle of text</li>
            <li>
              enables <b className={styles.text2}>validations.mask</b> by default with message{" "}
              <b style={{ color: "#ff5f5f", opacity: 0.8 }}>Incomplete value</b>
            </li>
            <li>usage details see during the coding (via jsdoc)</li>
          </ul>
        </section>

        <FAQ
          items={[
            {
              link: "troubleshooting",
              question: "Troubleshooting. Controls resized on hover/focus",
              answer: (
                <>
                  <div className={styles.inlineGroup}>
                    <wup-text w-label="Input 1" w-prefix="prefix " />
                    <wup-text w-label="Input 2" w-postfix=" postfix" />
                    <wup-text w-label="Input 3" />
                  </div>
                  <i>
                    <b>Reason:</b> css rule `flex: 1` was changed. <br />
                    Rollback it or change display-style for button[clear]/prefix/postfix (it has display:none for
                    performance reason, and showed on hover/focus)
                  </i>
                  <Code code={codeCssHoverRes} />
                </>
              ),
            },
          ]}
        />

        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}

const codeCssHoverRes = `css
  .someInlineGroup {
    button[clear],
    [prefix],
    [postfix] {
      display: inline-block; /* it's enough to fix */
    }
  }`;
