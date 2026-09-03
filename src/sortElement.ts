import WUPBaseElement from "./baseElement";
import onEvent from "./helpers/onEvent";
import isOverlap from "./helpers/isOverlap";
import animate from "./helpers/animate";
import { parseMsTime } from "./helpers/styleHelpers";

const tagName = "wup-sort";

declare global {
  namespace WUP.Sort {
    interface EventMap extends WUP.Base.EventMap {
      /** Called on value change */
      $change: CustomEvent<{
        reason: "move";
        /** New ordered indexes; for example was [0,1,2,3] and changed to [2,1,3,0] */
        value: number[];
        /** All rendered items */
        items: HTMLElement[];
      }>;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPSortElement; // add element to document.createElement
  }
}

declare module "react" {
  // WARN: React declares HTMLAttributes in the React-namespace itself (not in the JSX-namespace) so augmentation must be here
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLAttributes<T> {
    /** Attribute used for sorting with {@link WUPSortElement}  */
    item?: "false" | "";
  }

  namespace JSX {
    interface IntrinsicElements {
      /** Element with sort logic
       *  @see {@link WUPSortElement} */
      [tagName]: WUP.Base.ReactHTML<WUPSortElement>; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // WARN: in opposite to React preact declares HTMLAttributes inside the JSX-namespace
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {
      /** Attribute used for sorting with {@link WUPSortElement}  */
      item?: "false" | "";
    }
    interface IntrinsicElements {
      /** Element with sort logic
       *  @see {@link WUPSortElement} */
      [tagName]: HTMLAttributes<WUPSortElement>; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Wrapper to make items/children sortable
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/sortable}
 * @example
 * JS/TS
 * ```js
 * WUPSortElement.$use();
 *
 * const el = document.createElement('wup-sort');
 * // WARN: only children with attribute [item=''] are sortable
 * el.innerHTML = `
 *   <div item>Item 1</div>
 *   <div item>Item 2</div>
 *   <div item>Item 3</div>`;
 * document.body.append(el);
 * el.$onChange = (e) => console.warn({ reason: e.detail.reason, newOrderedIndexes: e.detail.value, htmlItems: e.detail.items })
 *```
 * HTML
 * ```html
 * <wup-sort>
 *  <div item>Item 1</div>
 *  <div item>Item 2</div>
 *  <div item="false">Item 3 - not sortable</div>
 * </wup-sort>
 * ``` */
export default class WUPSortElement extends WUPBaseElement<any, WUP.Sort.EventMap> {
  static get $styleRoot(): string {
    return `:root {
        --sort-active-color: #25a1b6;
        --sort-active-shadow: #25a1b6;
      }`;
  }

  static get $style(): string {
    return `:host {
        display: block;
      }
      :host [item][drag],
      :host [item][drop] {
        color: var(--sort-active-color);
        box-shadow: inset 0 0 3px 0 var(--sort-active-shadow);
        opacity: 0.7;
      }
      :host [item][drag] {
        z-index: 9999;
        position: fixed;
        left:0; top:0;
        cursor: grabbing;
        text-decoration: none;
        opacity: 0.8;
      }
      :host[hovered] {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
         user-select: none;
      }`;
  }

  /** Called on value change */
  $onChange?: (e: WUP.Sort.EventMap["$change"]) => void;

  protected override gotRender(): void {
    super.gotRender();
    this.applyDragdrop();
  }

  /** It prevents menu opening if user tries sorting and focus got after mouseUp */
  // _wasSortAfterClick?: boolean;

  /** Call it to remove dragdrop logic */
  _disposeDragdrop?: () => void;

  /** Called to apply dragdrop logic */
  protected applyDragdrop(): void {
    this._disposeDragdrop = onEvent(this, "pointerdown", (e) => {
      if (e.button) {
        return; // ignore right-click
      }
      const activeEl = e.target as HTMLElement & { _wasDraggable: boolean };
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.getAttribute("contenteditable") === "true")) {
        return; // prevent sort during the editing when user clicks on control and selects text
      }

      if (activeEl) {
        activeEl._wasDraggable = activeEl.draggable;
        activeEl.draggable = false; // prevent dragging on image & video: WARN we don't restore this
      }

      // this._wasSortAfterClick = false;
      // if (this.$isReadOnly || this.$isDisabled) {
      //   return;
      // }

      const $items = (
        Array.prototype.slice.call(this.querySelectorAll("[item='']")) as Array<
          HTMLElement & { _prevIndex: number; __isDragItem?: boolean }
        >
      ).filter((x) => !x.__isDragItem); // possible when user moves item + mouseUp + during the animation gets it again
      $items.forEach((x, i) => (x._prevIndex = i));

      const t = e.target;
      // WARN: $items is always an array (result of Array.prototype.slice) - so optional chaining & non-null assertion aren't required here
      let eli = $items.findIndex((item) => t === item || this.includes.call(item, t));
      if (eli === -1) {
        return;
      }

      const el = $items![eli];
      let dr: HTMLElement & { __isDragItem?: boolean };

      let isWaitTouch = false; // wait for touch to detect if possible to prevent scrollByTouch (browser can cancel pointer events if swipe)
      // WARN: keep removers separate - otherwise touchstart-listener stays forever and every touchstart leaks a non-passive touchmove-listener
      let rTouchMove: (() => void) | undefined;
      const r0 = onEvent(
        document,
        "touchstart",
        () => {
          isWaitTouch = true;
          rTouchMove?.(); // touchstart can be fired several times (multi-touch, next finger) - don't stack listeners
          rTouchMove = onEvent(
            document,
            "touchmove",
            (ev) => {
              if (ev.cancelable) {
                ev.preventDefault(); // prevent scrolling by touch if possible
                isWaitTouch = false;
              }
            },
            { passive: false, capture: true }
          );
        },
        { capture: true }
      );

      let isInside = true;
      let isThrottle = false;
      const totalMove = { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const firstCoord = { x: e.clientX - rect.x, y: e.clientY - rect.y };
      const r1 = onEvent(
        document,
        "pointermove",
        (ev) => {
          if (isWaitTouch) {
            return;
          }

          window.getSelection()?.removeAllRanges(); // possible 1..2 chars text-selection
          const clickMoveThrottle = 8; // to fix throttle issue when user clicked with small mouse move
          if (totalMove.x < clickMoveThrottle && totalMove.y < clickMoveThrottle) {
            totalMove.x += Math.abs(ev.movementX);
            totalMove.y += Math.abs(ev.movementY);
            return;
          }

          ev.preventDefault(); // prevent text selection - WARN: it doesn't work anymore

          // init
          if (!dr) {
            // this._wasSortAfterClick = true;
            // clone draggable element
            dr = el.cloneNode(true) as HTMLElement & { __isDragItem?: boolean };
            dr.setAttribute("drag", "");
            dr.style.width = `${el.offsetWidth}px`;
            dr.style.height = `${el.offsetHeight}px`;
            el.parentElement!.prepend(dr);
            el.setAttribute("drop", ""); // mark current element
            this.setAttribute("hovered", ""); // if pick item and move cursor fast control-focus-frame is blinking because because cursor much faster than js events
            dr.style.top = "0";
            dr.style.left = "0";
            dr.style.position = "fixed";
            dr.style.zIndex = "9999";
            dr.__isDragItem = true;
          }
          // set position
          const x = ev.clientX - firstCoord.x; // el.offsetWidth / 2;
          const y = ev.clientY - firstCoord.y; // el.offsetHeight / 2;
          dr.style.transform = `translate(${x}px, ${y}px)`;

          // define if element inside control (if outside - remove logic)
          isInside = true || isOverlap(this.getBoundingClientRect(), dr.getBoundingClientRect()); // WARN we don't support remove
          this.setAttr.call(dr, "remove", !isInside, true);
          if (!isInside) {
            return; // skip new place detection when item outside control
          }
          if (isThrottle) {
            return;
          }
          // find nearest line
          let nearest = eli; // index of nearest item
          let nearestEnd = eli; // index of last item in the nearest line
          let dist = Number.MAX_SAFE_INTEGER; // distance between centers
          const rects = $items!.map((item) => item.getBoundingClientRect());
          let lineY = 0;
          rects.some((r, i) => {
            const nextLineY = r.y + r.height / 2;
            if (Math.abs(nextLineY - lineY) > 3) {
              // compare with 3px because centers can be not aligned properly
              lineY = nextLineY; // it's next line
              const c = Math.abs(ev.clientY - lineY);
              if (c < dist) {
                dist = c;
                nearest = i; // index of 1st item in the nearest line
                nearestEnd = i;
              } else {
                return true; // break search because next line is further then previous
              }
            } else {
              nearestEnd += 1;
            }
            return false;
          });
          // find nearest item in the nearest line
          dist = Number.MAX_SAFE_INTEGER;
          for (let i = nearest; i <= nearestEnd; ++i) {
            const r = rects[i];
            const dx = ev.clientX - (r.x + r.width / 2);
            const dy = ev.clientY - (r.y + r.height / 2);
            const c = Math.sqrt(dx * dx + dy * dy);
            if (c < dist) {
              dist = c;
              nearest = i;
            }
          }
          // define left/right side
          if (eli !== nearest) {
            const trg = $items![nearest];
            const isLeftOrTop = eli > nearest;

            let nextEli = eli;
            if (nearest < eli) {
              nextEli = isLeftOrTop ? nearest : nearest + 1; // shift from right to left
            } else {
              // if (nearest > eli) {
              nextEli = isLeftOrTop ? nearest - 1 : nearest; // shift from left to right
            }
            nextEli = nearest;
            if (nextEli !== eli) {
              trg.parentElement!.insertBefore(el, isLeftOrTop ? trg : trg.nextElementSibling); // insert before OR after
              $items!.splice(nextEli, 0, $items!.splice(eli, 1)[0]);
              eli = nextEli;
              isThrottle = true;
              setTimeout(() => (isThrottle = false), 100); // to prevent fast changing position
            }
          }
        },
        { passive: false }
      );

      const cancel = (): void => {
        if (activeEl) {
          activeEl.draggable = activeEl._wasDraggable;
        }

        if (dr) {
          // setTimeout(() => (this._wasSortAfterClick = false), 1);
          this.removeAttribute("hovered");
          isInside = true; // remove by outside isn't supported here
          if (!isInside) {
            el.removeAttribute("drop");
            dr.remove();
            // this.removeValue(eli);
          } else {
            const animTime = parseMsTime(window.getComputedStyle(el).getPropertyValue("--anim-t"));
            const from = dr.getBoundingClientRect();
            const to = el.getBoundingClientRect();
            const diff = { x: to.x - from.x, y: to.y - from.y };
            // return element back
            dr.style.pointerEvents = "none";
            dr.style.touchAction = "none";
            dr.style.userSelect = "none";
            animate(0, 1, animTime, (v) => {
              dr.style.transform = `translate(${from.x + diff.x * v}px, ${from.y + diff.y * v}px)`;
            }).finally(() => {
              el.removeAttribute("drop");
              dr.remove();
            });

            el._prevIndex !== $items.indexOf(el) &&
              this.setValue(
                $items.map((x) => x._prevIndex),
                $items,
                "move"
              );
          }
        }
        r0();
        rTouchMove?.();
        r1();
        r2();
        r3();
      };

      const r2 = onEvent(document, "pointerup", cancel, { capture: true });
      const r3 = onEvent(document, "pointercancel", cancel, { capture: true }); // pointerup not called if touchmove can't be cancelled and browser scrolls
    });
  }

  protected setValue(value: number[], items: HTMLElement[], reason: "move"): void {
    setTimeout(() => this.fireEvent("$change", { cancelable: false, bubbles: true, detail: { reason, value, items } }));
  }
}

customElements.define(tagName, WUPSortElement);
