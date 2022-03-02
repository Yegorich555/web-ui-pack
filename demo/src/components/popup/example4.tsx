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
      <div className={styles.scrollBlock} ref={(el) => el?.scrollTo({ top: 24 })}>
        <button type="button" className={styles.trg2}>
          Target
        </button>
        <wup-popup
          ref={(el) => {
            if (el) {
              el.$options.placement = [
                WUPPopupElement.$placements.$left.$middle,
                WUPPopupElement.$placements.$top.$middle,
                // uncoment after tests
                // WUPPopupElement.$placements.$top.$middle,
                // WUPPopupElement.$placements.$bottom.$middle,
              ];
              el.$options.showCase = ShowCases.always;
            }
          }}
        >
          I can overflow scrollbable content, modals etc.
          <br /> But to be consistent I hide myself <br />
          if target is invisible in scrollable parent
        </wup-popup>
        <div />
      </div>
    </>
  );
}
