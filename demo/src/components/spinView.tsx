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
      <div className={styles.bottom} />
    </Page>
  );
}
