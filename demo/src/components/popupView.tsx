import canMove from "src/helpers/canMove";
import WUPPopupElement, { ShowCases } from "web-ui-pack/popupElement";
import styles from "./popupView.scss";

export default function PopupView() {
  return (
    <>
      <h2>
        <a href="https://github.com/Yegorich555/web-ui-pack#features" target="_blank" rel="noreferrer">
          PopupElement
        </a>
      </h2>
      <h3>Example 1</h3>
      <div className={styles.popupEx1}>
        <button id="trg" type="button" className={styles.trg}>
          Target
          <br />
          <small>
            and popups with different positions
            <br /> click me
          </small>
        </button>
        <wup-popup target="#trg" placement="top-start">
          top.start
        </wup-popup>
        <wup-popup target="#trg" placement="top-middle">
          top.middle
        </wup-popup>
        <wup-popup target="#trg" placement="top-end">
          top.end
        </wup-popup>
        <wup-popup target="#trg" placement="right-start">
          right.start
        </wup-popup>
        <wup-popup target="#trg" placement="right-middle">
          right.middle
        </wup-popup>
        <wup-popup target="#trg" placement="right-end">
          right.end
        </wup-popup>
        <wup-popup target="#trg" placement="bottom-start">
          bottom.start
        </wup-popup>
        <wup-popup target="#trg" placement="bottom-middle">
          bottom.middle
        </wup-popup>
        <wup-popup target="#trg" placement="bottom-end">
          bottom.end
        </wup-popup>
        <wup-popup target="#trg" placement="left-start">
          left.start
        </wup-popup>
        <wup-popup target="#trg" placement="left-middle">
          left.middle
        </wup-popup>
        <wup-popup target="#trg" placement="left-end">
          left.end
        </wup-popup>

        <h3>Example 2</h3>
        <small>
          You can change position behavior/priority with options <b>placement</b>, <b>placementAlt</b>
        </small>
        <div className={styles.fitBlock} id="fit">
          <button
            type="button"
            className={styles.trg2}
            ref={(refEl) => {
              if (refEl) {
                let isDown = false;
                const el = refEl as unknown as HTMLElement & { posX: number; posY: number };
                el.posX = 0;
                el.posY = 0;
                el.addEventListener("mousedown", () => (isDown = true));
                document.addEventListener("mouseup", () => (isDown = false));
                document.addEventListener("mousemove", (e) => {
                  const can = canMove(el, e.movementX, e.movementY, 1);
                  if (isDown && can) {
                    el.posX += can.dx;
                    el.posY += can.dy;
                    el.style.transform = `translate(${el.posX}px, ${el.posY}px)`;
                  }
                });
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
                el.$options.placement = WUPPopupElement.$placements.$top.$middle;
                el.$options.placementAlt = [
                  // WUPPopupElement.$placements.$top.$middle,
                  // WUPPopupElement.$placements.$right.$middle,
                  WUPPopupElement.$placements.$bottom.$middle,
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
      </div>
      <h3>Example 3</h3>
      <small>
        To avoid such behavior change option <b>toFitElement</b> (<b>document.body</b> by default)
      </small>
      <div className={styles.scrollBlock}>
        <button type="button" className={styles.trg2}>
          Target
        </button>
        <wup-popup
          ref={(el) => {
            if (el) {
              el.$options.placement = WUPPopupElement.$placements.$top.$middle;
              el.$options.placementAlt = [WUPPopupElement.$placements.$bottom.$middle];
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
