// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases } from "web-ui-pack/popupElement";
import styles from "./popupView.scss";

export default function Example4() {
  return (
    <>
      <h3>Example 4</h3>
      <small>
        To avoid such behavior change option <b>toFitElement</b> (<b>document.body</b> by default)
      </small>
      <div
        className={styles.scrollBlock}
        ref={
          (el) => el?.scrollTo({ top: 30 }) // todo expected that element placed opposite because of target partially hidden
        }
      >
        <button type="button" className={styles.trg2}>
          Target
        </button>
        <wup-popup
          ref={(el) => {
            if (el) {
              el.$options.placement = [
                WUPPopupElement.$placements.$top.$middle,
                WUPPopupElement.$placements.$bottom.$middle,
              ];
              el.$options.showCase = ShowCases.always;
            }
          }}
        >
          I can overflow scrollbable content, modals etc.
        </wup-popup>
        <div />
      </div>
    </>
  );
}
