import { useCallback, useEffect } from "react";
import movable from "src/helpers/movable";
import WUPPopupElement from "web-ui-pack/popup/popupElement";
import { PopupOpenCases, PopupAnimations } from "web-ui-pack/popup/popupElement.types";
import styles from "./popupView.scss";

// example of attach - use this to avoid overhelmed layout by closed popups
function attach(el: HTMLElement, opts: { text?: string; innerHTML?: string }) {
  const detach = WUPPopupElement.$attach(
    { target: el, text: opts.text, openCase: PopupOpenCases.onFocus | PopupOpenCases.onClick },
    (popup) => {
      // popup.className = styles.dropdownPopup;

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
      popup.$options.arrowEnable = false;
      popup.$options.animation = PopupAnimations.drawer;
      setTimeout(() => {
        if (popup.$refArrow) {
          popup.$refArrow.style.background = popup.style.background;
        }
      });
      if (opts.innerHTML) {
        popup.innerHTML = opts.innerHTML;
      }

      const isLock = false; // change it to show forever
      if (isLock) {
        popup.$options.openCase = PopupOpenCases.onInit;
        popup.$open(); // to override default openCase and leave show forever
      }
    }
  );
  return detach;
}

/*
  Place useTitle hook into global place and reuse accross react-app
  This hook helps to avoid useless renders for popup via attach-bind on listeners and render only when popup need to show
*/
const set = new Map<any, { el: HTMLElement; delTimeId?: ReturnType<typeof setTimeout> }>();
/** Custom hook for react. it's filter for callbacks by re-render */
function useTitle() {
  return useCallback(
    (innerHTML: string) =>
      function setTitle(el: HTMLElement | null) {
        const k = innerHTML;
        const stored = set.get(k);

        if (!el) {
          if (stored) {
            // detach doesn't required because listener detects it yourself
            // timeout required because on re-render if element isn't removed ref fired twice: null..el
            stored.delTimeId = setTimeout(() => set.delete(k));
          }
          return;
        }

        if (!stored) {
          set.set(k, { el });
          attach(el, { innerHTML });
        } else {
          stored.delTimeId && clearTimeout(stored.delTimeId);
        }
      },
    []
  );
}

export default function Example2() {
  useEffect(() => {
    const el = document.querySelector("#btnDropdownWithAttach") as HTMLButtonElement;
    // setTimeout(() => el.click(), 500);
    const move = movable(el);
    move(291, 0);
  }, []);

  const setTitle = useTitle();

  return (
    <>
      <h3>Example 2</h3>
      <small>
        <b>Dropdown behavior (with custom animation).</b> You can change position behavior/priority with option{" "}
        <b>placement</b>
      </small>
      <div className={styles.fitBlock} id="fit">
        <button
          className="btn"
          id="btnDropdownWithAttach"
          type="button"
          ref={setTitle(`<div>I must feet div with border <br/>(changed option <b>toFitElement</b>)
                <br/>I scrollable
                <br/>(you can setup minHeight to avoid squeezing)
                <br/>I have a good animation
                <br/>
                </div>`)}
        >
          Target
          <br />
          <small>drag and move me</small>
        </button>
      </div>
    </>
  );
}
