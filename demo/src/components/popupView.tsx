import "web-ui-pack/popupElement";
import styles from "./popupView.scss";

export default function PopupView() {
  return (
    <>
      <h2>
        <a href="https://github.com/Yegorich555/web-ui-pack#features" target="_blank" rel="noreferrer">
          PopupElement
        </a>
      </h2>
      <div className={styles.popupEx1}>
        <button id="trg" type="button" className={styles.trg}>
          target
          <br />
          <small>and popups with different positions</small>
          <br />
          <small>(try to resize window)</small>
        </button>
        <wup-popup class={styles.popup} target="#trg" placement="top-start">
          top.start
        </wup-popup>
        <wup-popup class={styles.popup} target="#trg" placement="top-middle">
          top.middle
        </wup-popup>
        <wup-popup class={styles.popup} target="#trg" placement="top-end">
          top.end
        </wup-popup>

        <wup-popup class={styles.popup} target="#trg" placement="right-start">
          right.start
        </wup-popup>
        <wup-popup class={styles.popup} target="#trg" placement="right-middle">
          right.middle
        </wup-popup>
        <wup-popup class={styles.popup} target="#trg" placement="right-end">
          right.end
        </wup-popup>

        <wup-popup class={styles.popup} target="#trg" placement="bottom-start">
          bottom.start
        </wup-popup>
        <wup-popup class={styles.popup} target="#trg" placement="bottom-middle">
          bottom.middle
        </wup-popup>
        <wup-popup class={styles.popup} target="#trg" placement="bottom-end">
          bottom.end
        </wup-popup>

        <wup-popup class={styles.popup} target="#trg" placement="left-start">
          left.start
        </wup-popup>
        <wup-popup class={styles.popup} target="#trg" placement="left-middle">
          left.middle
        </wup-popup>
        <wup-popup class={styles.popup} target="#trg" placement="left-end">
          left.end
        </wup-popup>
      </div>
    </>
  );
}
