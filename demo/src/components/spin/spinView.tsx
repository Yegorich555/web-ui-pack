/* eslint-disable react/no-unescaped-entities */
import Code from "src/elements/code";
import Page from "src/elements/page";
import { WUPSpinElement } from "web-ui-pack";
import WUPSpin2Element from "./spin2";
import WUPSpin3Element from "./spin3";
import WUPSpin4Element from "./spin4";
import WUPSpin5Element from "./spin5";
import WUPSpin6Element from "./spin6";
import WUPSpin7Element from "./spin7";
import WUPSpin8Element from "./spin8";
import styles from "./spinView.scss";

WUPSpinElement.$use();
WUPSpin2Element.$use();
WUPSpin3Element.$use();
WUPSpin4Element.$use();
WUPSpin5Element.$use();
WUPSpin6Element.$use();
WUPSpin7Element.$use();
WUPSpin8Element.$use();

export default function SpinView() {
  return (
    <Page //
      header="SpinElement"
      link="src/spinElement.ts"
      className={styles.pageSpin}
      details={{
        tag: "wup-spin",
        linkDemo: "demo/src/components/spin/spinView.tsx",
        cssVarAlt: new Map([["--spin-step", "Used for specific types"]]),
      }}
      features={[
        "Highly configurable (via css-vars, presets, attrs)",
        "Ability to fit parent without affecting on parent-height",
      ]}
    >
      <section>
        <h3>With position: relative</h3>
        <small>
          Spinner reduces size to fit target via option <b>fit</b>(true when <b>inline: false </b>- by default)
          <br />
          By default parent is overlayed by shadowBox (option <b>overflowShadow</b>) <b />
        </small>
        <button className="btn" type="button" style={{ position: "relative" }}>
          Button with relative position
          <wup-spin //
            w-fit=""
            w-inline={false}
            w-overflowFade=""
            w-overflowTarget="auto"
            w-overflowOffset=""
          />
        </button>
      </section>
      <section>
        <h3>Without position: relative</h3>
        <small>
          <strong>Try to scroll</strong> - spinner overflows header because there is no any parent with{" "}
          <b>position:relative</b>
          <br />
          To fix this set:
          <ul>
            <li>
              <b>position: relative</b> to any parent <b>OR</b>
            </li>
            <li>
              <b>z-index 100+ </b> for the header
            </li>
          </ul>
        </small>
        <button className="btn" type="button">
          Button without relative position
          <wup-spin />
        </button>
      </section>
      <section style={{ position: "relative" }}>
        <h3>Outside target</h3>
        <small>
          Spinner placed outside button (option <b>overflowTarget</b>) and parent has <b>position: relative</b>
        </small>
        <button className="btn" type="button" id="spinTarget">
          Button without relative position
        </button>
        <wup-spin
          w-overflowTarget="#spinTarget"
          ref={(el) => {
            if (el) {
              // el.$options.overflowTarget = el.previousElementSibling as HTMLElement;
              el.$options.overflowFade = false;
            }
          }}
        />
      </section>
      <section>
        <h3>Inline</h3>
        <small>
          Use attr <b>inline</b> or <b>$options.inline=true</b>
          <br />
          <strong>Attention</strong>: spinner does not reduce size to fit target in this case (by default)
          <br />
          (use option <b>fit</b> OR css to fix: <b>{`button>wup-spin{ --spin-size: 14px; -spin-item-size: 6px}`}</b>)
        </small>
        <button type="submit" className={[styles.btnAlign, "btn"].join(" ")}>
          <wup-spin w-inline />
          Pending...
        </button>
        <br />
        <button type="submit" className={[styles.btnAlign, "btn"].join(" ")}>
          <wup-spin w-inline="" w-fit="" />
          With option 'fit'
        </button>
      </section>
      <section>
        <h3>Different types</h3>
        <small>
          To setup style use css-vars and special functions <b>spinUseDotRoller, spinUseDualRing</b> etc.
        </small>
        <Code code={codeTypes} />
        <div className={styles.types}>
          <div>
            Ring <wup-spin w-inline />
            <wup-spin w-inline class={styles.spin11} />
          </div>
          <div>
            DualRing <wup-spin2 w-inline class={styles.spin20} />
            <wup-spin2 w-inline class={styles.spin21} />
            <wup-spin2 w-inline class={styles.spin22} />
          </div>
          <div>
            TwinDualRing
            <wup-spin7 w-inline class={styles.spin71} />
          </div>
          <div>
            Roller <wup-spin3 w-inline />
          </div>
          <div>
            DotRoller
            <wup-spin4 w-inline />
          </div>
          <div>
            DotRing
            <wup-spin5 w-inline class={styles.spin51} />
            <wup-spin5 w-inline class={styles.spin52} />
          </div>

          <div className={styles.types}>
            SliceRing
            <div>
              <wup-spin6 w-inline />
              <wup-spin6 w-inline class={styles.spin61} />
              <wup-spin6 w-inline class={styles.spin62} />
              <wup-spin6 w-inline class={styles.spin63} />
              <wup-spin6 w-inline class={styles.spin64} />
              <wup-spin6 w-inline class={styles.spin65} />
            </div>
            <div>
              <wup-spin6 w-inline class={styles["spin6-2"]} />
              <wup-spin6 w-inline class={`${styles.spin61} ${styles["spin6-2"]}`} />
              <wup-spin6 w-inline class={`${styles.spin62} ${styles["spin6-2"]}`} />
              <wup-spin6 w-inline class={`${styles.spin63} ${styles["spin6-2"]}`} />
              <wup-spin6 w-inline class={`${styles.spin64} ${styles["spin6-2"]}`} />
              <wup-spin6 w-inline class={`${styles.spin65} ${styles["spin6-2"]}`} />
            </div>
          </div>

          <div>
            Hash
            <wup-spin8 w-inline class={styles.spin82} />
          </div>
        </div>
      </section>
      <div className={styles.bottom} />
    </Page>
  );
}

const codeTypes = `js
import WUPSpinElement, {spinUseDualRing} from "web-ui-pack/spinElement";
spinUseDualRing(WUPSpinElement); // you can redefine default style

// OR define new class to use several diffrent styled spinners
class WUPSpin2Element extends WUPSpinElement {}
spinUseDualRing(WUPSpin2Element);
const tagName = "wup-spin2";
customElements.define(tagName, WUPSpin2Element);
declare global { // for TS intellisense
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin2Element;
  }

  // add element to tsx/jsx intellisense
  namespace JSX { // skip it if you don't use JSX/TSX (react/vue)
    interface IntrinsicElements {
      [tagName]: JSX.IntrinsicElements["wup-spin"];
    }
  }
}`;
