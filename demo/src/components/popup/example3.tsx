import movable from "src/helpers/movable";
// eslint-disable-next-line import/named
import { ShowCases } from "web-ui-pack/popupElement";
import styles from "./popupView.scss";

export default function Example3() {
  return (
    <>
      <h3>Example 3</h3>
      <small>
        Default behavior. You can change position behavior/priority with option <b>placement</b>
      </small>
      <div className={styles.fitBlock} id="fit2">
        <button
          type="button"
          ref={(el) => {
            if (el) {
              const move = movable(el);
              move(140, 73);
            }
          }}
        >
          Target
          <br />
          <small>drag and move me</small>
        </button>
        <wup-popup
          class={styles.scrollPopup}
          ref={(el) => {
            if (el) {
              el.$options.toFitElement = document.querySelector("#fit2") as HTMLElement;
              el.$options.showCase = ShowCases.always;
            }
          }}
        >
          I must feet div with border
          <br /> <br /> <br /> <br /> <br />
          (option <b>toFitElement</b>)
        </wup-popup>
      </div>
    </>
  );
}
