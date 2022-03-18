import movable from "src/helpers/movable";
// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases } from "web-ui-pack/popup/popupElement";
import styles from "./popupView.scss";

export default function Example2() {
  return (
    <>
      <h3>Example 2</h3>
      <small>
        Dropdown behavior. You can change position behavior/priority with option <b>placement</b>
      </small>
      <div className={styles.fitBlock} id="fit">
        <button
          type="button"
          ref={(el) => {
            if (!el) return;

            WUPPopupElement.$attach(
              { target: el, text: "", showCase: ShowCases.onFocus | ShowCases.onClick },
              (popup) => {
                popup.$options.placement = [
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
                popup.$options.toFitElement = document.querySelector("#fit") as HTMLElement;
                popup.innerHTML = `I must feet div with border <br />(option <b>toFitElement</b>)`;
                popup.$options.showCase = ShowCases.always;
                popup.$show(); // to override default showCase and leave show forever
              }
            );
            setTimeout(() => el.click(), 100);
            const move = movable(el);
            move(293, 0);
          }}
        >
          Target
          <br />
          <small>drag and move me</small>
        </button>
        {/* <wup-popup
          ref={(popup) => {
            if (popup) {
              popup.$options.placement = [
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
              popup.$options.toFitElement = document.querySelector("#fit") as HTMLElement;

              // for dropdown use el.$options.showCase = ShowCases.onFocus | ShowCases.onClick;
              popup.$options.showCase = ShowCases.always;
            }
          }}
        >
          I must feet div with border <br />
          (option <b>toFitElement</b>)
        </wup-popup> */}
      </div>
    </>
  );
}
