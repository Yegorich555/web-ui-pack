/* eslint-disable react/no-unescaped-entities */
import Page from "src/elements/page";
import { WUPSpinElement } from "web-ui-pack";
import { spinUseRing } from "web-ui-pack/spinElement";
import WUPSpin2Element from "./spin2";
import WUPSpin3Element from "./spin3";
import WUPSpin4Element from "./spin4";
import WUPSpin5Element from "./spin5";
import WUPSpin6Element from "./spin6";
import WUPSpin7Element from "./spin7";
import styles from "./spinView.scss";

const sideEffect =
  WUPSpinElement &&
  WUPSpin2Element &&
  WUPSpin3Element &&
  WUPSpin4Element &&
  WUPSpin5Element &&
  WUPSpin6Element &&
  WUPSpin7Element;
!sideEffect && console.error("Missed"); // It's required otherwise import is ignored by webpack
spinUseRing(WUPSpinElement); // setup default style

export default function SpinView() {
  return (
    <Page //
      header="SpinElement"
      link="src/spinElement.ts"
      className={styles.pageSpin}
      details={{ tag: "wup-spin" }}
    >
      <section>
        <h3>With position: relative</h3>
        <small>
          Spinner reduces size to fit target via option <b>fit</b>(true when <b>inline: false </b>- by default)
          <br />
          By default parent is overlayed by shadowBox (option <b>overflowShadow</b>) <b />
        </small>
        <button type="button" style={{ position: "relative" }}>
          Button with relative position
          <wup-spin overflowFade="" fit="" inline={false} />
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
        <button type="button">
          Button without relative position
          <wup-spin />
        </button>
      </section>
      <section style={{ position: "relative" }}>
        <h3>Outside target</h3>
        <small>
          Spinner placed outside button (option <b>overflowTarget</b>) and parent has <b>position: relative</b>
        </small>
        <button type="button" id="spinTarget">
          Button without relative position
        </button>
        <wup-spin
          ref={(el) => {
            if (el) {
              el.$options.overflowTarget = el.previousElementSibling as HTMLElement;
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
        <button type="submit" className={styles.btnAlign}>
          <wup-spin inline />
          Pending...
        </button>
        <br />
        <button type="submit" className={styles.btnAlign}>
          <wup-spin inline="" fit="" />
          With option 'fit'
        </button>
      </section>
      <section>
        <h3>Different types</h3>
        <small>
          To setup style use css-vars and special functions <b>spinUseDotRoller, spinUseDualRing</b> etc.
        </small>
        <div className={styles.types}>
          <div>
            Ring <wup-spin inline />
            <wup-spin inline class={styles.spin11} />
          </div>
          <div>
            DualRing <wup-spin2 inline />
            <wup-spin2 inline class={styles.spin21} />
            <wup-spin2 inline class={styles.spin22} />
          </div>
          <div>
            TwinDualRing
            <wup-spin7 inline />
          </div>
          <div>
            Roller <wup-spin3 inline />
          </div>
          <div>
            DotRoller
            <wup-spin4 inline />
          </div>
          <div>
            DotRing
            <wup-spin5 inline />
            <wup-spin5 inline class={styles.spin51} />
          </div>
          <div className={styles.types}>
            SliceRing
            <div>
              <wup-spin6 inline />
              <wup-spin6 inline class={styles.spin61} />
              <wup-spin6 inline class={styles.spin62} />
              <wup-spin6 inline class={styles.spin63} />
              <wup-spin6 inline class={styles.spin64} />
              <wup-spin6 inline class={styles.spin65} />
            </div>
            <div>
              <wup-spin6 inline class={styles["spin6-2"]} />
              <wup-spin6 inline class={`${styles.spin61} ${styles["spin6-2"]}`} />
              <wup-spin6 inline class={`${styles.spin62} ${styles["spin6-2"]}`} />
              <wup-spin6 inline class={`${styles.spin63} ${styles["spin6-2"]}`} />
              <wup-spin6 inline class={`${styles.spin64} ${styles["spin6-2"]}`} />
              <wup-spin6 inline class={`${styles.spin65} ${styles["spin6-2"]}`} />
            </div>
          </div>
        </div>
      </section>
      <div className={styles.bottom} />
    </Page>
  );
}
