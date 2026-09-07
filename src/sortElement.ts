import WUPBaseElement from "./baseElement";
import onEvent from "./helpers/onEvent";
import animate from "./helpers/animate";
import { parseMsTime } from "./helpers/styleHelpers";

const tagName = "wup-sort";
/** Detach-functions of {@link WUPSortElement.$attach} - to prevent double attaching on the same element */
const attachLst = new WeakMap<HTMLElement, () => void>();
/** Selectors of {@link WUPSortElement.$attach} with already appended styles */
let addedStyles: Set<string> | undefined;

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
 * ```
 * @see {@link WUPSortElement.$attach} - to sort children of an ordinary element (when the extra wrapper breaks the layout) */
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

  /** Apply sorting on children with attr [item] except attr [item=false] of the pointed element.
   * @param el parent which children
   * @param onChange called when the order of children is changed (instead of the `$change` event of the custom element)
   * @param options.selectorName css-selector for applying styles @defaultValue "[wup-sort]"
   * @returns detach-function (removing eventListeners & applied styles)
   * @example
   * ```js
   * const el = document.querySelector("ul");
   * const detach = WUPSortElement.$attach(el, (newOrderedIndexes, items) => console.warn({ newOrderedIndexes, items }));
   * ``` */
  static $attach(
    el: HTMLElement,
    onChange: (value: number[], items: HTMLElement[]) => void,
    options?: { selectorName?: string /* [wup-sort] by default */ }
  ): () => void {
    const savedDetach = attachLst.get(el);
    if (savedDetach) {
      console.warn(
        `${tagName.toUpperCase()}. $attach is called again on the same element. Possible memory leak. Use detach() before new attach`
      );
      savedDetach();
    }

    const selectorName = options?.selectorName ?? `[${tagName}]`;

    if (!addedStyles) {
      const refStyle = this.$refStyle!;
      refStyle.append(this.$styleRoot);
      addedStyles = new Set();
    }

    if (!addedStyles.has(selectorName)) {
      addedStyles.add(selectorName);
      this.$refStyle!.append(this.$style.replace(/:host/g, selectorName)); // :host matches only the custom element itself - so it's replaced with the pointed selector
    }
    const rSelector = this.applySelector(el, selectorName);

    // WARN: async (as the $change event of the custom element) - to be called when the return-animation is started & listeners are removed
    const rDragdrop = this.applyDragdrop(el, (value, items) => setTimeout(() => onChange.call(el, value, items)));

    const detach = (): void => {
      rDragdrop();
      rSelector();
      el.removeAttribute("hovered");
      attachLst.delete(el);
    };
    attachLst.set(el, detach);

    return detach;
  }

  /** Applies the pointed selector to the element (otherwise styles of {@link WUPSortElement.$attach} don't match it)
   * @returns remover of the applied attribute/class-name */
  protected static applySelector(el: HTMLElement, selectorName: string): () => void {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let r = (): void => {}; // nothing to apply for a tag-selector: the element must match it already
    if (selectorName.startsWith("[")) {
      const [attr, v] = selectorName.slice(1, -1).split("="); // [wup-sort] or [wup-sort='value']
      el.setAttribute(attr, v ? v.replace(/^["']|["']$/g, "") : "");
      r = () => el.removeAttribute(attr);
    } else if (selectorName.startsWith(".")) {
      const cn = selectorName.substring(1);
      el.classList.add(cn);
      r = () => el.classList.remove(cn);
    }
    if (!el.matches(selectorName)) {
      // possible when a tag/complex selector is pointed - in this case styles are useless
      console.warn(
        `${tagName.toUpperCase()}. $attach: the element doesn't match the pointed selector '${selectorName}'`
      );
    }
    return r;
  }

  #ctr = this.constructor as typeof WUPSortElement;

  /** Called on value change */
  $onChange?: (e: WUP.Sort.EventMap["$change"]) => void;

  protected override gotReady(): void {
    super.gotReady();
    // WARN: it's here (not in gotRender) because gotRender is called only once - but the listener is removed on every disconnect
    this.applyDragdrop();
  }

  /** Called to apply dragdrop logic */
  protected applyDragdrop(): void {
    // WARN: the remover is stored in disposeLst (the same as appendEvent does) - otherwise the listener isn't removed when the element is removed from the document
    this.disposeLst.push(this.#ctr.applyDragdrop(this, (value, items) => this.setValue(value, items, "move")));
  }

  /** Called to apply dragdrop logic on the pointed element
   * @param target element which children (with attr [item]) must be sortable
   * @param onChange called when the order of items is changed (by the end of dragging)
   * @returns remover of eventListeners */
  protected static applyDragdrop(
    target: HTMLElement,
    onChange: (value: number[], items: HTMLElement[]) => void
  ): () => void {
    return onEvent(target, "pointerdown", (e) => {
      if (e.button || e.isPrimary === false) {
        // WARN: `=== false` because the property is missing on synthetic events
        return; // ignore right-click & non-primary pointers (2nd+ finger of the multi-touch)
      }
      const activeEl = e.target as HTMLElement & { _wasDraggable: boolean };
      // WARN: `closest` is required - the target can be nested inside the editable element (and [contenteditable] can be empty)
      if (activeEl && activeEl.closest("input,textarea,select,[contenteditable]:not([contenteditable='false'])")) {
        return; // prevent sort during the editing when user clicks on control and selects text
      }

      const $items = (
        Array.prototype.slice.call(target.querySelectorAll("[item='']")) as Array<
          HTMLElement & { _prevIndex: number; __isDragItem?: boolean; __isReturning?: boolean }
        >
      ).filter((x) => !x.__isDragItem); // possible when user moves item + mouseUp + during the animation gets it again
      $items.forEach((x, i) => (x._prevIndex = i));

      const t = e.target;
      // WARN: $items is always an array (result of Array.prototype.slice) - so optional chaining & non-null assertion aren't required here
      let eli = $items.findIndex((item) => t === item || (t instanceof Node && item.contains(t)));
      if (eli === -1) {
        return;
      }

      const el = $items![eli];
      if (el.__isReturning) {
        return; // WARN: must be before `activeEl.draggable` - the item can't be grabbed again until its return-animation ends (otherwise the animation removes fresh [drop] & clone)
      }
      let dr: HTMLElement & { __isDragItem?: boolean };
      let isEnded = false; // to prevent double-handling: pointerup & pointercancel can be fired both

      // WARN: must be after the `eli === -1` return - otherwise draggability of non-item targets is destroyed forever (`cancel` isn't registered yet)
      activeEl._wasDraggable = activeEl.draggable;
      activeEl.draggable = false; // prevent dragging on image & video: restored in `cancel`

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

      let isThrottle = false;
      // WARN: getBoundingClientRect forces layout (N calls per pointermove) - so rects are cached and reset only when they really change
      let rects: DOMRect[] | null = null;
      const rScroll = onEvent(document, "scroll", () => (rects = null), { capture: true, passive: true }); // scroll shifts viewport-based rects
      const rect = el.getBoundingClientRect();
      const firstCoord = { x: e.clientX - rect.x, y: e.clientY - rect.y };
      const downCoord = { x: e.clientX, y: e.clientY }; // to detect if user moved enough to start dragging (not just clicked)
      const { pointerId } = e; // WARN: events of other pointers must be ignored - otherwise another finger moves & drops the item of this one
      const r1 = onEvent(
        document,
        "pointermove",
        (ev) => {
          if (ev.pointerId !== pointerId || isWaitTouch) {
            return;
          }

          window.getSelection()?.removeAllRanges(); // possible 1..2 chars text-selection
          const clickMoveThrottle = 8; // to fix throttle issue when user clicked with small mouse move
          // WARN: don't use ev.movementX/Y here - it's undefined on old WebKit (NaN bypasses the threshold: ordinary click reorders items)
          // and always 0 for touch-pointers in some engines (dragging never starts on mobile)
          if (
            !dr && // WARN: threshold gates only the start - otherwise moving back to the initial point stops the started dragging
            Math.abs(ev.clientX - downCoord.x) < clickMoveThrottle &&
            Math.abs(ev.clientY - downCoord.y) < clickMoveThrottle
          ) {
            return;
          }

          ev.preventDefault(); // prevent text selection - WARN: it doesn't work anymore

          // init
          if (!dr) {
            // clone draggable element
            dr = el.cloneNode(true) as HTMLElement & { __isDragItem?: boolean };
            dr.setAttribute("drag", "");
            dr.style.width = `${el.offsetWidth}px`;
            dr.style.height = `${el.offsetHeight}px`;
            el.parentElement!.prepend(dr);
            el.setAttribute("drop", ""); // mark current element
            target.setAttribute("hovered", ""); // if pick item and move cursor fast control-focus-frame is blinking because because cursor much faster than js events
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
          // WARN: removing the item by dragging outside the control isn't supported - so there is no isOverlap-check here

          if (isThrottle) {
            return;
          }
          // find nearest line
          let nearest = eli; // index of nearest item
          let nearestEnd = eli; // index of last item in the nearest line
          let dist = Number.MAX_SAFE_INTEGER; // distance between centers
          rects ??= $items!.map((item) => item.getBoundingClientRect());
          // WARN: undefined (not 0) - otherwise the 1st item is treated as a part of the line y=0 (possible when page is scrolled)
          // and nearestEnd goes out of rects-range
          let lineY: number | undefined;
          rects.some((r, i) => {
            const nextLineY = r.y + r.height / 2;
            if (lineY === undefined || Math.abs(nextLineY - lineY) > 3) {
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
          // move to the new place
          if (eli !== nearest) {
            const rEl = rects[eli];
            const rTrg = rects[nearest];
            const isSameLine = Math.abs(rTrg.y + rTrg.height / 2 - (rEl.y + rEl.height / 2)) <= 3; // 3px because centers can be not aligned properly
            const half = rTrg.x + rTrg.width / 2;
            // WARN: inside the line the cursor must cross the middle of the target - otherwise items of different sizes are swapped back & forth:
            // after the swap the center of the target is shifted by the width of the dragged item, so the opposite condition can't be true anymore
            // WARN: for another line there is no such check - the nearest line is detected by the closest center already
            // (otherwise the item is moved only when the cursor reaches the middle of the another line)
            // WARN: DOM order === visual order - so `nearest > eli` always means the item to the right or below
            if (!isSameLine || (nearest > eli ? ev.clientX >= half : ev.clientX < half)) {
              const trg = $items![nearest];
              const isLeftOrTop = eli > nearest; // the nearest item is before the dragged one - so it must be replaced by it
              trg.parentElement!.insertBefore(el, isLeftOrTop ? trg : trg.nextElementSibling); // insert before OR after
              $items!.splice(nearest, 0, $items!.splice(eli, 1)[0]);
              eli = nearest;
              rects = null; // the reorder re-layouts items - so cached rects are outdated
              isThrottle = true;
              setTimeout(() => (isThrottle = false), 100); // to prevent fast changing position
            }
          }
        },
        { passive: false }
      );

      const cancel = (ev: PointerEvent): void => {
        if (ev.pointerId !== pointerId || isEnded) {
          return; // pointerup/pointercancel of another pointer mustn't drop the item dragged by this one
        }
        isEnded = true; // otherwise the 2nd call fires the duplicate $change
        activeEl.draggable = activeEl._wasDraggable;

        if (dr) {
          target.removeAttribute("hovered");
          const animTime = parseMsTime(window.getComputedStyle(el).getPropertyValue("--anim-t"));
          const from = dr.getBoundingClientRect();
          const to = el.getBoundingClientRect();
          const diff = { x: to.x - from.x, y: to.y - from.y };
          // return element back
          dr.style.pointerEvents = "none";
          dr.style.touchAction = "none";
          dr.style.userSelect = "none";
          el.__isReturning = true;
          animate(0, 1, animTime, (v) => {
            dr.style.transform = `translate(${from.x + diff.x * v}px, ${from.y + diff.y * v}px)`;
          }).finally(() => {
            delete el.__isReturning;
            el.removeAttribute("drop");
            dr.remove();
          });

          el._prevIndex !== $items.indexOf(el) &&
            onChange(
              $items.map((x) => x._prevIndex),
              $items
            );
        }
        r0();
        rTouchMove?.();
        rScroll();
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
