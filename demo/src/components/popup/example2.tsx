import movable from "src/helpers/movable";
// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases } from "web-ui-pack/popupElement";
import styles from "./popupView.scss";

export default function Example2() {
  return (
    <>
      <h3>Example 2</h3>
      <small>
        Behavior for dropdown. You can change position behavior/priority with option <b>placement</b>
      </small>
      <div className={styles.fitBlock} id="fit">
        <button
          type="button"
          ref={(el) => {
            if (el) {
              const move = movable(el);
              move(293, 0);
            }
          }}
        >
          Target
          <br />
          <small>drag and move me</small>
        </button>
        <wup-popup
          ref={(el) => {
            if (el) {
              el.$options.placement = [
                // dropdown behavior
                WUPPopupElement.$placements.$bottom.$start,
                WUPPopupElement.$placements.$bottom.$end,
                WUPPopupElement.$placements.$top.$start,
                WUPPopupElement.$placements.$top.$end,
                WUPPopupElement.$placements.$bottom.$start.$resizeHeight,
                WUPPopupElement.$placements.$bottom.$end.$resizeHeight,
                WUPPopupElement.$placements.$top.$start.$resizeHeight,
                WUPPopupElement.$placements.$top.$end.$resizeHeight,
              ];
              el.$options.toFitElement = document.querySelector("#fit") as HTMLElement;
              el.$options.showCase = ShowCases.always;
            }
          }}
        >
          I must feet div with border <br />
          (option <b>toFitElement</b>)
        </wup-popup>
      </div>
    </>
  );
}
