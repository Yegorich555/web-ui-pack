import { useEffect } from "react";
// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases } from "web-ui-pack/popupElement";
import styles from "./popupView.scss";

export default function Example4() {
  useEffect(() => {
    // 15-
    document.querySelector("main")?.scrollTo({ top: 280 });
  }, []);
  return (
    <>
      <h3>Example 4</h3>
      <small>
        To avoid such behavior change option <b>toFitElement</b> (<b>document.body</b> by default)
      </small>
      <div
        className={styles.scrollBlock}
        ref={(el) => {
          el?.scrollTo({ top: 70 });
          setTimeout(() => {
            el?.scrollTo({ top: 53 });
          }, 200);
          // window.temp1 = el;
        }}
      >
        <button
          type="button"
          className={styles.trg2}
          ref={(el) => {
            // el.style.transform = "translate(-38px, 10px)";
            // el.style.margin = "20px 0";
          }}
        >
          Target
        </button>
        <wup-popup
          ref={(el) => {
            if (el) {
              el.$options.placement = [
                WUPPopupElement.$placements.$left.$middle,
                WUPPopupElement.$placements.$top.$middle,
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
