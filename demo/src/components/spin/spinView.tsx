import Page from "src/elements/page";
import { WUPSpinElement } from "web-ui-pack";
import { spinUseType1 } from "web-ui-pack/spinElement";
import WUPSpin2Element from "./spin2";
import WUPSpin3Element from "./spin3";
import WUPSpin4Element from "./spin4";
import WUPSpin5Element from "./spin5";
import WUPSpin6Element from "./spin6";
import styles from "./spinView.scss";

const sideEffect =
  WUPSpinElement && WUPSpin2Element && WUPSpin3Element && WUPSpin4Element && WUPSpin5Element && WUPSpin6Element;
!sideEffect && console.error("Missed"); // It's required otherwise import is ignored by webpack
spinUseType1(WUPSpinElement); // setup default style

export default function SpinView() {
  return (
    <Page header="Spin" link="#spinelement" className={styles.pageSpin}>
      <div>
        <h3>With position: relative</h3>
        <small>
          Spinner reduces size to fit target (option <b>overflowReduceByTarget</b>)
        </small>
        <button type="button" style={{ position: "relative" }}>
          Button with relative position
          <wup-spin />
        </button>
      </div>
      <div>
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
      </div>
      <div style={{ position: "relative" }}>
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
            }
          }}
        />
      </div>
      <div>
        <h3>Inline</h3>
        <small>
          Use attr <b>inline</b> or <b>$options.inline=true</b>
          <br />
          <strong>Attention</strong>: spinner does not reduce size to fit target in this case
          <br />
          (use css to fix this: <b>{`button>wup-spin{ --spin-size: 14px}`}</b>)
        </small>
        <button type="submit" className={styles.btnAlign}>
          <wup-spin inline />
          Pending...
        </button>
      </div>
      <div>
        <h3>Different types</h3>
        <small>Todo description here</small>
        <div className={styles.types}>
          <div>
            Default <wup-spin inline />
            <wup-spin inline class={styles.spin11} />
          </div>
          <div>
            Type 2 <wup-spin2 inline />
          </div>
          <div>
            Type 3 <wup-spin3 inline />
          </div>
          <div>
            Type 4<wup-spin4 inline />
          </div>
          <div>
            Type 5<wup-spin5 inline />
            <wup-spin5 inline class={styles.spin51} />
          </div>
          <div className={styles.types}>
            Type 6
            <div>
              <wup-spin6 inline />
              <wup-spin6 inline class={styles.spin61} />
              <wup-spin6 inline class={styles.spin62} />
              <wup-spin6 inline class={styles.spin63} />
              <wup-spin6 inline class={styles.spin64} />
              <wup-spin6 inline class={styles.spin65} />
            </div>
            <div>
              <wup-spin6 inline />
              <wup-spin6 inline class={`${styles.spin61} ${styles["spin6-2"]}`} />
              <wup-spin6 inline class={`${styles.spin62} ${styles["spin6-2"]}`} />
              <wup-spin6 inline class={`${styles.spin63} ${styles["spin6-2"]}`} />
              <wup-spin6 inline class={`${styles.spin64} ${styles["spin6-2"]}`} />
              <wup-spin6 inline class={`${styles.spin65} ${styles["spin6-2"]}`} />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.bottom} />
    </Page>
  );
}
