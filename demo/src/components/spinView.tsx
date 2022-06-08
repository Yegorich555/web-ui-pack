import Page from "src/elements/page";
import { WUPSpinElement } from "web-ui-pack";
import styles from "./spinView.scss";

const sideEffect = WUPSpinElement;
!sideEffect && console.error("Missed"); // It's required otherwise import is ignored by webpack

export default function SpinView() {
  return (
    <Page header="Spin" link="#spinelement" className={styles.pageSpin}>
      <div>
        <h3>With position: relative</h3>
        <small>Attention: spinner reduces size to fit target (option overflowReduceByTarget)</small>
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
          <strong>Attention</strong>: spinner does not reduce size to fit target
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
            Default
            <wup-spin inline />
          </div>
          <div>
            Type 2
            <wup-spin inline class={styles.spin2} />
          </div>
          <div>
            Type 3
            <wup-spin inline class={styles.spin3}>
              <div />
              <div />
              <div />
            </wup-spin>
          </div>
          <div>
            Type 4
            <wup-spin inline class={`${styles["lds-roller"]} lds-roller`}>
              <div />
              <div />
              <div />
              <div />
              <div />
              <div />
              {/* <div /> */}
            </wup-spin>
          </div>
        </div>
      </div>
      <div className={styles.bottom} />
    </Page>
  );
}

const s = document.head.appendChild(document.createElement("style"));
let txt = "";
const cnt = 8;

for (let i = 1; i <= cnt; ++i) {
  txt += `
     .lds-roller div:nth-child(${i}) {
       animation-delay: -${0.036 * i}s;
     }
    .lds-roller div:nth-child(${i}):after {
      transform: rotate(calc(45deg + var(--spin-step) * ${i - 1}));
    }`;
}

s.textContent = txt;
