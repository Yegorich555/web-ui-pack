import "web-ui-pack/popupElement";
import styles from "./popupView.scss";

function PopupContent() {
  return (
    <wup-popup
      class={styles.popupContent}
      ref={(el) => {
        if (el) {
          // eslint-disable-next-line no-param-reassign
          el.options.placementFitElement = () => el.parentElement as HTMLElement;
          el.updatePosition(true);
        }
      }}
    >
      Some popup text can be here
    </wup-popup>
  );
}

export default function PopupView() {
  return (
    <div className={styles.popupViewExtraScroll}>
      <button type="button" className={styles.bodyOverlowRight}>
        clickMe
      </button>
      <PopupContent />
      <div className={styles.popupView}>
        <div>
          <button type="button" className={styles.leftTop}>
            clickMe
          </button>
          {/* <PopupContent /> */}
          <button type="button" className={styles.rightTop}>
            clickMe
          </button>
          {/* <PopupContent /> */}
        </div>
        <div className={styles.middle}>Some ordinary content</div>
        <div>
          <button type="button" className={styles.leftTop}>
            clickMe
          </button>
          {/* <PopupContent /> */}
          <button type="button" className={styles.rightTop}>
            clickMe
          </button>
          {/* <PopupContent /> */}
        </div>
      </div>
    </div>
  );
}
