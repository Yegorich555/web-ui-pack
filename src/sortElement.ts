import WUPBaseElement from "./baseElement";
import onEvent from "./helpers/onEvent";
import animate from "./helpers/animate";
import isOverlap from "./helpers/isOverlap";
import { parseMsTime } from "./helpers/styleHelpers";

const tagName = "wup-sort";
/** Detach-functions of {@link WUPSortElement.$attach} - to prevent double attaching on the same element */
const attachLst = new WeakMap<HTMLElement, () => void>();
/** Class-names of {@link WUPSortElement.$attach} with already appended styles */
let addedStyles: Set<string> | undefined;
/** Elements which items are handled by {@link WUPSortElement.applyDragdrop} - to detect the owner of an item (see `ownerOf`) */
const dragOwners = new WeakSet<HTMLElement>();

/** Returns the nearest element that owns the pointed item: items are searched among all the descendants (not only children -
 * {@link WUPSelectManyControl} keeps them in `label > span`) - so an item of a nested container must not be stolen by the outer one */
function ownerOf(item: HTMLElement): HTMLElement | null {
  for (let p = item.parentElement; p; p = p.parentElement) {
    if (dragOwners.has(p)) {
      return p;
    }
  }
  return null;
}

/** Sortable item with the internal service-properties assigned on the dragging start */
type SortItem = HTMLElement & {
  /** Index of the item (among items of all the pointed parents) before the dragging */
  _prevIndex: number;
  /** Parent (one of the pointed elements) which held the item before the dragging */
  _prevTarget: HTMLElement;
  /** True for the clone that follows the cursor */
  __isDragItem?: boolean;
  /** True while the return-animation isn't finished */
  __isReturning?: boolean;
};

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
    interface Options {
      /** Style of the indicator that shows the new place of the dragged item:
       * * `ghost` - the item itself is moved between other items (so the layout is shifted during the dragging)
       * * `line` - a line is painted over the layout between items (the layout isn't shifted; the order is applied on drop)
       * @defaultValue 'ghost' */
      dropIndicator: "ghost" | "line";
    }
    interface JSXProps extends WUP.Base.OnlyNames<Options> {
      /** Style of the indicator that shows the new place of the dragged item:
       * * `ghost` - the item itself is moved between other items (so the layout is shifted during the dragging)
       * * `line` - a line is painted over the layout between items (the layout isn't shifted; the order is applied on drop)
       * @defaultValue 'ghost' */
      "w-dropIndicator"?: Options["dropIndicator"];
    }
    /** Options of {@link WUPSortElement.$attach} */
    interface AttachOptions {
      /** Css-class-name applied to the pointed element(s) for the built-in styles;
       * point `null` if styles are defined by yourself @defaultValue "wup-sort" */
      className?: string | null;
      /** Enables removing an item when it's dropped outside the pointed element(s): `onChange` is called with `removedIndex`
       * (removing the item from the DOM is the responsibility of the callback);
       * otherwise dragging outside does nothing and the item is returned back @defaultValue false */
      canRemove?: boolean;
      /** Style of the indicator that shows the new place of the dragged item:
       * `ghost` - the item itself is moved between other items; `line` - a line is painted over the layout between items
       * @defaultValue "ghost" */
      dropIndicator?: "ghost" | "line";
    }
    /** New state of a single parent - see {@link WUPSortElement.$attach} pointed with several parents */
    interface AttachChange {
      /** Parent which items are described here (one of the pointed elements) */
      parent: HTMLElement;
      /** New ordered indexes of the items of this parent; for example was [0,1,2] and changed to [2,1,0].
       * WARN: `-1` marks the item that came from another parent (it has no previous index here) */
      newOrderedIndexes: number[];
      /** Items of this parent in the new order */
      items: HTMLElement[];
      /** Index in `items` of the item dropped outside all the parents (requires `options.canRemove`);
       * `-1` when nothing is removed. WARN: removing the item from the DOM is the responsibility of the callback */
      removedIndex: number;
    }
    /** Callback of {@link WUPSortElement.$attach} pointed with the single parent */
    type AttachOnChange = (newOrderedIndexes: number[], items: HTMLElement[], removedIndex: number) => void;
    /** Callback of {@link WUPSortElement.$attach} pointed with several parents */
    type AttachOnChangeMulti = (from: AttachChange, to: AttachChange) => void;
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
      [tagName]: WUP.Base.ReactHTML<WUPSortElement> & WUP.Sort.JSXProps; // add element to tsx/jsx intellisense (react)
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
      [tagName]: HTMLAttributes<WUPSortElement> & WUP.Sort.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Wrapper to make items/children sortable
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/sort}
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
export default class WUPSortElement extends WUPBaseElement<WUP.Sort.Options, WUP.Sort.EventMap> {
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
      :host [item][drag][remove] {
        text-decoration: line-through;
        opacity: 0.5;
      }
      :host [drop-line] {
        z-index: 9998;
        position: fixed;
        left:0; top:0;
        pointer-events: none;
        border-radius: 2px;
        background: var(--sort-active-color);
        box-shadow: 0 0 2px 0 var(--sort-active-shadow);
      }
      :host[hovered] {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
         user-select: none;
      }`;
  }

  static $defaults: WUP.Sort.Options = {
    dropIndicator: "ghost",
  };

  /** Apply sorting on children with attr [item] except attr [item=false] of the pointed element.
   * @param el parent which children must be sortable
   * @param onChange called when the order of children is changed or an item is removed (instead of the `$change` event of the custom element);
   * `newOrderedIndexes[newIndex]` is the previous index of the item; `removedIndex` is the index of the item
   * dropped outside the element (`-1` when nothing is removed)
   * @param options see {@link WUP.Sort.AttachOptions}
   * @returns detach-function (removing eventListeners & applied styles)
   * @example
   * ```js
   * const el = document.querySelector("ul");
   * const detach = WUPSortElement.$attach(el, (newOrderedIndexes, items, removedIndex) => console.warn({ newOrderedIndexes, items, removedIndex }));
   * ``` */
  static $attach(el: HTMLElement, onChange: WUP.Sort.AttachOnChange, options?: WUP.Sort.AttachOptions): () => void;

  /** Apply sorting on children with attr [item] except attr [item=false] of the pointed elements;
   * an item can be dragged from one parent into another.
   * @param parents parents which children must be sortable (an item can be moved between them)
   * @param onChange called when the order of children is changed, an item is moved into another parent or removed;
   * `from` describes the parent which held the dragged item, `to` - the parent which holds it now
   * (see {@link WUP.Sort.AttachChange}). WARN: `from === to` (the same object) when the item didn't change the parent
   * @param options see {@link WUP.Sort.AttachOptions}
   * @returns detach-function (removing eventListeners & applied styles)
   * @example
   * ```js
   * const detach = WUPSortElement.$attach(
   *   [document.getElementById("todo"), document.getElementById("done")],
   *   (from, to) => {
   *     setTodo(from.newOrderedIndexes.map((i) => ...)); // -1 means the item came from another parent
   *     from !== to && setDone(to.newOrderedIndexes.map((i) => ...));
   *   }
   * );
   * ``` */
  static $attach(
    parents: HTMLElement[], // todo add support for [wup-sort]='false' on parent. So in this case drag&drop to parent with wup-sort is allowed but without allowing to select exact position (by default inserted at the end)
    onChange: WUP.Sort.AttachOnChangeMulti,
    options?: WUP.Sort.AttachOptions
  ): () => void;

  static $attach(
    el: HTMLElement | HTMLElement[],
    onChange: WUP.Sort.AttachOnChange | WUP.Sort.AttachOnChangeMulti,
    options?: WUP.Sort.AttachOptions
  ): () => void {
    const isMulti = Array.isArray(el);
    const targets = isMulti ? el : [el];
    targets.forEach((t) => {
      const savedDetach = attachLst.get(t);
      if (savedDetach) {
        console.warn(
          `${tagName.toUpperCase()}. $attach is called again on the same element. Possible memory leak. Use detach() before new attach`
        );
        savedDetach(); // WARN: it removes every element of the previous attach from attachLst - so the next elements aren't warned twice
      }
    });

    const className = options?.className !== undefined ? options.className : tagName; // WARN: `null` disables styles at all - so `??` isn't suitable here
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let rClass = (): void => {};
    if (className) {
      if (!addedStyles) {
        this.$refStyle!.append(this.$styleRoot);
        addedStyles = new Set();
      }

      if (!addedStyles.has(className)) {
        addedStyles.add(className);
        this.$refStyle!.append(this.$style.replace(/:host/g, `.${className}`)); // :host matches only the custom element itself - so it's replaced with the class-selector
      }
      targets.forEach((t) => t.classList.add(className));
      rClass = (): void => targets.forEach((t) => t.classList.remove(className));
    }

    const dropIndicator = options?.dropIndicator ?? this.$defaults.dropIndicator;
    // WARN: async (as the $change event of the custom element) - to be called when the return-animation is started & listeners are removed
    const rDragdrop = this.applyDragdrop(
      targets,
      (value, items, removedIndex, trgFrom, trgTo) =>
        setTimeout(() => {
          if (!isMulti) {
            (onChange as WUP.Sort.AttachOnChange).call(el, value, items, removedIndex);
            return;
          }
          // WARN: internally items of all the parents are handled as the single list - so it's split back per parent
          const prevItems: HTMLElement[] = [];
          items.forEach((a, i) => (prevItems[value[i]] = a));
          const removed = removedIndex === -1 ? null : items[removedIndex];
          const changeOf = (parent: HTMLElement): WUP.Sort.AttachChange => {
            const wasAt = new Map<HTMLElement, number>(); // previous index (in this parent) of every item that was here
            prevItems.forEach((a) => (a as SortItem)._prevTarget === parent && wasAt.set(a, wasAt.size));
            const now = items.filter((a) => parent.contains(a));
            return {
              parent,
              items: now,
              newOrderedIndexes: now.map((a) => wasAt.get(a) ?? -1), // WARN: `-1` when the item came from another parent
              removedIndex: removed && parent.contains(removed) ? now.indexOf(removed) : -1,
            };
          };
          const from = changeOf(trgFrom);
          // WARN: the same object when the parent isn't changed - so `from === to` is the marker of it for the developer
          (onChange as WUP.Sort.AttachOnChangeMulti).call(el, from, trgTo === trgFrom ? from : changeOf(trgTo));
        }),
      { canRemove: options?.canRemove, getDropIndicator: () => dropIndicator }
    );

    const detach = (): void => {
      rDragdrop();
      rClass();
      targets.forEach((t) => {
        t.removeAttribute("hovered");
        attachLst.delete(t);
      });
    };
    targets.forEach((t) => attachLst.set(t, detach));

    return detach;
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
    this.disposeLst.push(
      this.#ctr.applyDragdrop(this, (value, items) => this.setValue(value, items, "move"), {
        getDropIndicator: () => this._opts.dropIndicator, // WARN: getter - because options can be changed after the init
      })
    );
  }

  /** Called to apply dragdrop logic on the pointed element(s)
   * @param target element which children (with attr [item]) must be sortable; point an array to drag an item
   * from one target into another (items of all the targets are handled as the single list - so indexes of `onChange` are related to it)
   * @param onChange called when the order of items is changed or an item is removed (by the end of dragging);
   * `removedIndex` is the index of the item dropped outside the targets (`-1` when nothing is removed);
   * `trgFrom` & `trgTo` are the targets which held the dragged item before & after the dragging (the same one when it isn't changed)
   * @param opts.canRemove enables removing an item when it's dropped outside the target: `onChange` is called with `removedIndex`
   * (removing the item from the DOM is the responsibility of the callback);
   * otherwise dragging outside does nothing and the item is returned back
   * @param opts.getDropIndicator returns the style of the drop-indicator; it's a getter because options can be changed
   * after the init (called once per dragging - so the style isn't changed in the middle of it) @defaultValue "ghost"
   * @returns remover of eventListeners */
  protected static applyDragdrop(
    target: HTMLElement | HTMLElement[],
    onChange: (
      value: number[],
      items: HTMLElement[],
      removedIndex: number,
      trgFrom: HTMLElement,
      trgTo: HTMLElement
    ) => void,
    opts?: { canRemove?: boolean; getDropIndicator?: () => WUP.Sort.Options["dropIndicator"] }
  ): () => void {
    const canRemove = opts?.canRemove;
    const targets = Array.isArray(target) ? target : [target];
    const onDown = (e: PointerEvent & { target: EventTarget }): void => {
      if (e.button || e.isPrimary === false) {
        // WARN: `=== false` because the property is missing on synthetic events
        return; // ignore right-click & non-primary pointers (2nd+ finger of the multi-touch)
      }
      const activeEl = e.target as HTMLElement & { _wasDraggable: boolean };
      // WARN: `closest` is required - the target can be nested inside the editable element (and [contenteditable] can be empty)
      if (activeEl && activeEl.closest("input,textarea,select,[contenteditable]:not([contenteditable='false'])")) {
        return; // prevent sort during the editing when user clicks on control and selects text
      }

      // WARN: items of all the targets are gathered into the single array (in the order of the targets) - so indexes of onChange
      // are related to it & the reorder-logic below doesn't care whether the new place is in the same target or in another one
      const $items = targets
        .reduce((arr, t) => {
          const lst = (Array.prototype.slice.call(t.querySelectorAll("[item='']")) as SortItem[]) //
            .filter((x) => ownerOf(x) === t); // skip items of a nested container (a nested <wup-sort> or another attached element)
          lst.forEach((x) => (x._prevTarget = t)); // to report the previous place of every item (see $attach with several parents)
          return arr.concat(lst);
        }, [] as SortItem[])
        .filter((x) => !x.__isDragItem); // possible when user moves item + mouseUp + during the animation gets it again
      $items.forEach((x, i) => (x._prevIndex = i));

      const t = e.target;
      // WARN: $items is always an array - so optional chaining & non-null assertion aren't required here
      let eli = $items.findIndex((item) => t === item || (t instanceof Node && item.contains(t)));
      if (eli === -1) {
        return;
      }

      const el = $items[eli];
      if (el.__isReturning) {
        return; // WARN: must be before `activeEl.draggable` - the item can't be grabbed again until its return-animation ends (otherwise the animation removes fresh [drop] & clone)
      }
      // WARN: the item can be moved into another target without changing its index in the whole set - so the index isn't enough to detect the change
      const elParent = el.parentElement;
      let dr: HTMLElement & { __isDragItem?: boolean };
      let isInside = true; // false when the item is dragged outside the target (to remove it - see canRemove)
      let isEnded = false; // to prevent double-handling: pointerup & pointercancel can be fired both
      // WARN: the style is defined once per dragging - otherwise changing options in the middle breaks the started logic
      const isLine = opts?.getDropIndicator?.() === "line";
      let dropLine: HTMLElement | undefined; // indicator of the new place (only for dropIndicator: 'line')
      // WARN: the DOM-place is stored (not only the index) - the new place can be in another target where the index-math isn't
      // applicable, and `next` can be a non-item element ([item=false]) - so the index isn't derivable from it
      let dropTo: { at: number; parent: HTMLElement; next: Node | null } | undefined; // new place (only for dropIndicator: 'line')
      const lineW = 1; // thickness of the line-indicator
      // WARN: the new place is searched only among items of the pointed target - otherwise the nearest item is searched over all
      // the targets where the DOM-order isn't the visual order (2 lists side by side) and lines are detected wrongly
      const trgFrom = targets.find((a) => a.contains(el))!; // WARN: always found - el is taken from the targets themselves
      let trgActive = trgFrom;
      /** Returns the target which holds the dragged item now (it's changed when the item is dragged into another target) */
      const trgTo = (): HTMLElement => targets.find((a) => a.contains(el))!; // WARN: always found - the item isn't removed from the DOM here

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
      let trgRects: DOMRect[] | null = null; // rects of the targets: to detect over which one the cursor is
      let isRowLayout = false; // true when items are rendered horizontally (or multiline) - see rects below
      let iFrom = 0; // index in $items of the 1st item of trgActive
      let iTo = $items.length - 1; // index in $items of the last item of trgActive (`iFrom - 1` when the target has no items at all)
      let rangeOf: HTMLElement | undefined; // target which iFrom, iTo & isRowLayout are defined for (see updateRange)
      const resetRects = (): void => {
        rects = null;
        trgRects = null;
      };
      const rScroll = onEvent(document, "scroll", resetRects, { capture: true, passive: true }); // scroll shifts viewport-based rects

      /** Returns rects of the targets (cached - see the WARN above) */
      const getTrgRects = (): DOMRect[] => {
        if (!trgRects) {
          trgRects = targets.map((a) => a.getBoundingClientRect());
        }
        return trgRects;
      };

      /** Defines iFrom, iTo & isRowLayout: the range in $items that belongs to trgActive */
      const updateRange = (arr: DOMRect[]): void => {
        rangeOf = trgActive;
        iFrom = $items.findIndex((item) => trgActive.contains(item));
        if (iFrom === -1) {
          // the target has no items at all (all of them are moved to another target) - so the new one must be placed
          // between items of the previous & the next targets: WARN: items of a target are always a continuous range in $items
          const ti = targets.indexOf(trgActive);
          const iNext = $items.findIndex((item) => targets.some((a, i) => i > ti && a.contains(item)));
          iFrom = iNext === -1 ? $items.length : iNext;
          iTo = iFrom - 1; // empty range
        } else {
          iTo = iFrom;
          while (iTo + 1 < $items.length && trgActive.contains($items[iTo + 1])) {
            ++iTo;
          }
        }
        // items are rendered in a row when at least 2 of them are on the same line (a multiline grid is a row-layout too)
        isRowLayout = false;
        for (let i = iFrom + 1; isLine && !isRowLayout && i <= iTo; ++i) {
          const prev = arr[i - 1];
          isRowLayout = Math.abs(arr[i].y + arr[i].height / 2 - (prev.y + prev.height / 2)) <= 3; // 3px because centers can be not aligned properly
        }
      };

      /** Moves the dragged item into the pointed DOM-place & to the pointed index of $items */
      const moveItem = (index: number, parent: HTMLElement, next: Node | null): void => {
        parent.insertBefore(el, next); // WARN: the parent can be another target - so the item is moved between the lists
        $items.splice(index, 0, $items.splice(eli, 1)[0]);
        eli = index;
        resetRects(); // the reorder re-layouts items (& the targets themselves) - so cached rects are outdated
        isThrottle = true;
        setTimeout(() => (isThrottle = false), 100); // to prevent fast changing position
      };

      /** Paints the line-indicator at the pointed place (only for dropIndicator: 'line') */
      const paintLine = (x: number, y: number, w: number, h: number): void => {
        if (!dropLine) {
          dropLine = document.createElement("div");
          dropLine.setAttribute("drop-line", "");
          el.parentElement!.prepend(dropLine); // WARN: position:fixed - so the parent doesn't affect the layout
        }
        dropLine.style.display = "";
        dropLine.style.width = `${w}px`;
        dropLine.style.height = `${h}px`;
        dropLine.style.transform = `translate(${x}px, ${y}px)`;
      };

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
            // WARN: border-box & rect (not offsetWidth/Height) - otherwise the clone of an item with the default content-box
            // is rendered wider & higher by its padding + border (and such a clone inflates the isInside-detection below)
            dr.style.boxSizing = "border-box";
            dr.style.width = `${rect.width}px`;
            dr.style.height = `${rect.height}px`;
            el.parentElement!.prepend(dr);
            el.setAttribute("drop", ""); // mark current element
            // if pick item and move cursor fast control-focus-frame is blinking because because cursor much faster than js events
            targets.forEach((a) => a.setAttribute("hovered", "")); // WARN: on every target - the item can be dropped into any of them
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
          if (canRemove) {
            // define if the item is inside the targets (if outside - it must be removed)
            // WARN: the rect is derived from the translate & the size assigned above (position:fixed + left/top:0) - otherwise
            // getBoundingClientRect right after the style-write forces a synchronous layout on every pointermove
            const rDrag = { left: x, top: y, right: x + rect.width, bottom: y + rect.height } as DOMRect;
            isInside = getTrgRects().some((r) => isOverlap(r, rDrag));
            isInside ? dr.removeAttribute("remove") : dr.setAttribute("remove", "");
            if (!isInside) {
              dropLine && (dropLine.style.display = "none"); // the item is going to be removed - so the new place is meaningless
              return; // skip the new-place detection when the item is outside
            }
          }

          if (isThrottle) {
            return;
          }
          // find the target under the cursor: the item is dragged from one target into another
          const iTrg = getTrgRects().findIndex(
            (r) => ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom
          );
          // WARN: when the cursor is outside all the targets the previous one is kept - otherwise the item jumps back & forth
          if (iTrg !== -1) {
            trgActive = targets[iTrg]; // WARN: rects are kept - crossing the cursor doesn't re-layout items (only the range is re-defined below)
          }
          // find nearest line
          let nearest = eli; // index of nearest item
          let nearestEnd = eli; // index of last item in the nearest line
          let dist = Number.MAX_SAFE_INTEGER; // distance between centers
          if (!rects) {
            rects = $items.map((item) => item.getBoundingClientRect());
            rangeOf = undefined; // the reorder can move an item into another target - so the range is outdated too
          }
          if (rangeOf !== trgActive) {
            updateRange(rects);
          }
          if (iTo < iFrom) {
            // the active target has no items at all - so the dragged one becomes the 1st there
            const r = getTrgRects()[targets.indexOf(trgActive)];
            if (isLine) {
              dropTo = { at: iFrom, parent: trgActive, next: null };
              paintLine(r.x, r.y, r.width, lineW); // WARN: on the top edge - there is no gap between items to point
            } else {
              // WARN: iFrom is the place BETWEEN items of the neighbor targets - so it's shifted when the item is taken from the left
              moveItem(iFrom > eli ? iFrom - 1 : iFrom, trgActive, null);
            }
            return;
          }
          // WARN: undefined (not 0) - otherwise the 1st item is treated as a part of the line y=0 (possible when page is scrolled)
          // and nearestEnd goes out of rects-range
          let lineY: number | undefined;
          for (let i = iFrom; i <= iTo; ++i) {
            const nextLineY = rects[i].y + rects[i].height / 2;
            if (lineY === undefined || Math.abs(nextLineY - lineY) > 3) {
              // compare with 3px because centers can be not aligned properly
              lineY = nextLineY; // it's next line
              const c = Math.abs(ev.clientY - lineY);
              if (c >= dist) {
                break; // break search because next line is further then previous
              }
              dist = c;
              nearest = i; // index of 1st item in the nearest line
              nearestEnd = i;
            } else {
              nearestEnd += 1;
            }
          }
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
          // WARN: items of other targets aren't neighbors at all - otherwise the gap is measured between different lists
          const at = (i: number): DOMRect | undefined => (i >= iFrom && i <= iTo ? rects![i] : undefined);
          // paint the line-indicator instead of moving the item (the layout isn't shifted at all)
          if (isLine) {
            const r = rects[nearest];
            // WARN: for a row the line is vertical (before/after the item), for a column - horizontal (above/below the item)
            const isBefore = isRowLayout ? ev.clientX < r.x + r.width / 2 : ev.clientY < r.y + r.height / 2;
            const nEl = $items[nearest];
            // WARN: `nEl.nextElementSibling` (not `null`) - otherwise the item is appended after non-sortable items ([item=false])
            dropTo = {
              at: isBefore ? nearest : nearest + 1,
              parent: nEl.parentElement!,
              next: isBefore ? nEl : nEl.nextElementSibling,
            };
            // WARN: the line must be painted in the middle of the gap between 2 items (not on the edge of the nearest one)
            // because user drops the item exactly between them
            const isNear = (a: DOMRect | undefined): a is DOMRect =>
              // for a row the neighbor must be on the same line - otherwise the gap is between lines (3px because centers can be not aligned properly)
              !!a && (!isRowLayout || Math.abs(a.y + a.height / 2 - (r.y + r.height / 2)) <= 3);
            const other = at(isBefore ? nearest - 1 : nearest + 1); // item on the other side of the gap
            const mirror = at(isBefore ? nearest + 1 : nearest - 1); // item on the opposite side of the nearest (see below)
            const start = isRowLayout ? "x" : "y"; // axis of the gap: horizontal for a row, vertical for a column
            const end = isRowLayout ? "right" : "bottom";
            let gap = 0; // 0 when the nearest item has no neighbors at all - so the line is centered on its edge
            if (isNear(other)) {
              gap = isBefore ? r[start] - other[end] : other[start] - r[end];
            } else if (isNear(mirror)) {
              // the gap is outside the range of items (before the 1st or after the last one) - so mirror the gap of the opposite side
              gap = isBefore ? mirror[start] - r[end] : r[start] - mirror[end];
            }
            const pos = (isBefore ? r[start] - Math.max(gap, 0) / 2 : r[end] + Math.max(gap, 0) / 2) - lineW / 2;
            // WARN: for a row the line is vertical (the height of the item), for a column - horizontal (the width of the item)
            isRowLayout ? paintLine(pos, r.y, lineW, r.height) : paintLine(r.x, pos, r.width, lineW);
            return;
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
            // WARN: when the cursor is over another target the item is moved immediately - the intention is unambiguous there
            // (the middle-crossing rule is about neighbors of the same list)
            const isCross = !trgActive.contains(el);
            if (isCross || !isSameLine || (nearest > eli ? ev.clientX >= half : ev.clientX < half)) {
              const trg = $items[nearest];
              const isLeftOrTop = eli > nearest; // the nearest item is before the dragged one - so it must be replaced by it
              moveItem(nearest, trg.parentElement!, isLeftOrTop ? trg : trg.nextElementSibling); // insert before OR after
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
          targets.forEach((a) => a.removeAttribute("hovered"));
          dropLine?.remove();
          if (!isInside) {
            el.removeAttribute("drop");
            dr.remove(); // no return-animation: the item is dropped outside & must be removed
            // WARN: removing the item from the DOM is the responsibility of the callback
            onChange(
              $items.map((x) => x._prevIndex),
              $items,
              eli,
              trgFrom,
              trgTo() // WARN: the item can be moved into another target and only after that dragged outside
            );
          } else {
            if (dropTo) {
              // WARN: only for dropIndicator:'line' - the item isn't moved during the dragging, so the new order is applied here
              const newIndex = dropTo.at > eli ? dropTo.at - 1 : dropTo.at; // index after removing the item from the previous place
              // WARN: the index can be the same when the item is moved into another target (the neighbor one) - so the parent is checked also
              if (newIndex !== eli || dropTo.parent !== el.parentElement) {
                moveItem(newIndex, dropTo.parent, dropTo.next);
              }
            }
            const animTime = parseMsTime(window.getComputedStyle(el).getPropertyValue("--anim-t"));
            const from = dr.getBoundingClientRect();
            const to = el.getBoundingClientRect(); // WARN: after the possible re-ordering above - to animate to the real new place
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

            (el._prevIndex !== $items.indexOf(el) || el.parentElement !== elParent) &&
              onChange(
                $items.map((x) => x._prevIndex),
                $items,
                -1,
                trgFrom,
                trgTo()
              );
          }
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
    };

    // WARN: the listener is registered on every target - but the logic inside is always about all of them (see $items)
    targets.forEach((t) => dragOwners.add(t));
    const removers = targets.map((t) => onEvent(t, "pointerdown", onDown));
    return () => {
      targets.forEach((t) => dragOwners.delete(t));
      removers.forEach((rm) => rm());
    };
  }

  protected setValue(value: number[], items: HTMLElement[], reason: "move"): void {
    setTimeout(() => this.fireEvent("$change", { cancelable: false, bubbles: true, detail: { reason, value, items } }));
  }
}

customElements.define(tagName, WUPSortElement);

/** TODO
 * 11 findings, most severe first:

src/sortElement.ts:600 — the rect cache is filled for items of all targets, but only [iFrom..iTo] plus rects[eli] are read; 3x100 items means 300 getBoundingClientRect() per post-swap move instead of ~101. Fill lazily per index.
src/sortElement.ts:388 — the full $items gather (deep query per target + ownerOf walk per item + 2 forEach passes) runs before the eli === -1 early-out, so every tap on a non-item descendant pays for it and throws it away.
src/sortElement.ts:643 — Math.sqrt per candidate in the per-move nearest-item loop; the value is only used in a < comparison, so squared distances are order-equivalent.
src/sortElement.ts:400 — t === item || is redundant with item.contains(t) (contains is true for the node itself), and t instanceof Node is dead for real pointer events.
src/sortElement.ts:755 — $items.indexOf(el) is an O(n) scan for a value eli provably already holds (moveItem keeps them in sync).
src/sortElement.ts:423 — trgFrom re-derives el._prevTarget (assigned at :392) and trgTo() re-derives ownerOf(el); three ways to answer the same question.
src/sortElement.ts:464 — resetRects() doesn't clear rangeOf; the range invalidation is bolted onto the fill site at :601, so the cache has two half-invalidators and any future early-return above :599 silently reads a stale range.
src/sortElement.ts:272 — $attach gates the $styleRoot append on its own addedStyles flag, unaware of baseElement's appendedRootStyles; using both a <wup-sort> element and $attach emits :root{--sort-active-color…} twice.
src/sortElement.ts:169 — $style omits ${super.$style} while baseElement appends only the most-derived getter, so any future base rule is silently dropped (open item #14; every other component follows the convention, e.g. controls/baseControl.ts:287).
src/sortElement.ts:496 — isRowLayout needs ≥2 items in the active target's range, so in line mode a target holding one item (or receiving its first item) is always treated as a column and the drop-line is drawn with the wrong orientation. (PLAUSIBLE)
src/sortElement.ts:650 — at() is allocated on every un-throttled pointermove but used only inside the if (isLine) branch; move it in next to isNear/other/mirror.
 *
 */
