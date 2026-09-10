import Code from "src/elements/code";
import Example from "src/elements/example";
import WUPSpin2Element from "./spin2";
import WUPSpin3Element from "./spin3";
import WUPSpin4Element from "./spin4";
import WUPSpin5Element from "./spin5";
import WUPSpin6Element from "./spin6";
import WUPSpin7Element from "./spin7";
import WUPSpin8Element from "./spin8";
import styles from "./spinView.scss";

WUPSpin2Element.$use();
WUPSpin3Element.$use();
WUPSpin4Element.$use();
WUPSpin5Element.$use();
WUPSpin6Element.$use();
WUPSpin7Element.$use();
WUPSpin8Element.$use();

export default function Example5() {
  return (
    <Example header="Different types" link="demo/src/components/spin/example5.tsx">
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
    </Example>
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
// for TS intellisense
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpin2Element;
  }
}

declare module "react" {
  // add element to tsx/jsx intellisense
  namespace JSX { // skip it if you don't use JSX/TSX files
    interface IntrinsicElements {
      [tagName]: JSX.IntrinsicElements["wup-spin"];
    }
  }
}`;
