import "web-ui-pack/popupElement";
import styles from "./popupView.scss";

function PopupContent() {
  return (
    <wup-popup
      class={styles.popupContent}
      ref={(el) => {
        if (el) {
          el.$options.toFitElement = document.querySelector("#toFitMe") as HTMLElement;
          // el.options.minWidthByTarget = true;
          el.$show();
        }
      }}
    >
      Some popup text can be here
    </wup-popup>
  );
}

export default function PopupView() {
  return (
    <div className={styles.popupViewExtraScroll} id="toFitMe">
      {/* <button id="trg" type="button" className={styles.trg}>
        target
        <br />
        <small>inside scrollable parent</small>
      </button> */}
      <div>
        <label id="trg">
          <span>This is label with input inside</span>
          <input />
          <button>Click me</button>
        </label>
      </div>
      <wup-popup class={styles.popupContent} target="#trg" placement="top-start">
        top.start
      </wup-popup>

      <div>
        <label htmlFor="trg2">This is label with input outside</label>
        <input id="trg2" />
      </div>
      <wup-popup class={styles.popupContent} target="#trg2" placement="top-start">
        top.start
      </wup-popup>
      {/* <wup-popup class={styles.popupContent} target="#trg" placement="top-middle">
        top.middle
      </wup-popup>
      <wup-popup class={styles.popupContent} target="#trg" placement="top-end">
        top.end
      </wup-popup>

      <wup-popup class={styles.popupContent} target="#trg" placement="right-start">
        right.start
      </wup-popup>
      <wup-popup class={styles.popupContent} target="#trg" placement="right-middle">
        right.middle
      </wup-popup>
      <wup-popup class={styles.popupContent} target="#trg" placement="right-end">
        right.end
      </wup-popup>

      <wup-popup class={styles.popupContent} target="#trg" placement="bottom-start">
        bottom.start
      </wup-popup>
      <wup-popup class={styles.popupContent} target="#trg" placement="bottom-middle">
        bottom.middle
      </wup-popup>
      <wup-popup class={styles.popupContent} target="#trg" placement="bottom-end">
        bottom.end
      </wup-popup>

      <wup-popup class={styles.popupContent} target="#trg" placement="left-start">
        left.start
      </wup-popup>
      <wup-popup class={styles.popupContent} target="#trg" placement="left-middle">
        left.middle
      </wup-popup>
      <wup-popup class={styles.popupContent} target="#trg" placement="left-end">
        left.end
      </wup-popup> */}
    </div>
  );
}
