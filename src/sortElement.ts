import WUPBaseElement from "./baseElement";
import onEvent from "./helpers/onEvent";
import animate from "./helpers/animate";
import isOverlap from "./helpers/isOverlap";
import { parseMsTime } from "./helpers/styleHelpers";

const tagName = "wup-sort";
/** Selector of the sortable items - WARN: the single owner of the string: the pointerdown-gate & the gathering must not drift */
const itemSel = "[item='']";
/** Vertical tolerance of the "same line" detection: centers of items can be not aligned properly */
const lineTolerance = 3;

/** Returns whether centers of the rects are on the same line (see {@link lineTolerance}) */
function isSameLine(a: DOMRect, b: DOMRect): boolean {
  return Math.abs(a.y + a.height / 2 - (b.y + b.height / 2)) <= lineTolerance;
}

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

/** Returns the 1st non-sortable child ([item=false]) of the pointed element: it's the place for the 1st item of an empty target -
 * so items are always before such a footer (see the WARN in the dragging logic)
 * WARN: only children (not descendants) - the result is used as `next` of `insertBefore` on the element itself */
function firstFalseOf(el: HTMLElement): Element | null {
  const { children } = el;
  for (let i = 0; i < children.length; ++i) {
    if (children[i].getAttribute("item") === "false") {
      return children[i];
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
 * @see {@link WUPSortElement.$attach} - to sort children of an ordinary element (when the extra wrapper breaks the layout)
 * @see attr `wup-sort="false"` on a parent - to accept dropped items without ordering them (see {@link WUPSortElement.$attach}) */
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
   * @see attr `wup-sort="false"` on a parent - to disable selecting the exact place there: an item dragged into such a parent
   * is appended to the end & items already placed there aren't re-ordered (dragging them into another parent is still allowed)
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
    parents: HTMLElement[],
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

      // WARN: the pointed item is searched by `closest` (not among the gathered items) - otherwise every pointerdown
      // on a non-item descendant pays for the whole gathering below and throws it away
      const el = activeEl.closest(itemSel) as SortItem | null;
      // `__isDragItem` & `__isReturning` are possible when user moves item + mouseUp + during the animation gets it again
      // WARN: `__isReturning` must be checked before `activeEl.draggable` below - the item can't be grabbed again until its
      // return-animation ends (otherwise the animation removes fresh [drop] & clone)
      if (!el || el.__isDragItem || el.__isReturning) {
        return;
      }
      // WARN: `ownerOf` (not `targets.some(a => a.contains(el))`) - an item of a nested container (a nested <wup-sort> or
      // another attached element) mustn't be stolen here
      const trgFrom = ownerOf(el); // target which holds the item before the dragging
      if (!trgFrom || !targets.includes(trgFrom)) {
        return; // the pointed item belongs to another container
      }

      // WARN: items of all the targets are gathered into the single array (in the order of the targets) - so indexes of onChange
      // are related to it & the reorder-logic below doesn't care whether the new place is in the same target or in another one
      const $items = targets
        .reduce((arr, t) => {
          const lst = (Array.prototype.slice.call(t.querySelectorAll(itemSel)) as SortItem[]) //
            .filter((x) => ownerOf(x) === t); // skip items of a nested container (a nested <wup-sort> or another attached element)
          lst.forEach((x) => (x._prevTarget = t)); // to report the previous place of every item (see $attach with several parents)
          return arr.concat(lst);
        }, [] as SortItem[])
        .filter((x) => !x.__isDragItem); // possible when user moves item + mouseUp + during the animation gets it again
      $items.forEach((x, i) => (x._prevIndex = i));
      let eli = el._prevIndex; // WARN: `_prevIndex` is assigned by the loop above - so an extra scan isn't required
      // WARN: the item can be moved into another target without changing its index in the whole set - so the index isn't enough to detect the change
      const elParent = el.parentElement;
      // WARN: the whole place is stored (not only the parent) - it's restored when the item returns into its own end-only target (see `isEndOnly` below)
      const elNext = el.nextElementSibling; // the sibling before the dragging: only the dragged item changes its place - so it's never outdated
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
      let trgActive = trgFrom;
      /** Returns the target which holds the dragged item now (it's changed when the item is dragged into another target) */
      const trgTo = (): HTMLElement => ownerOf(el)!; // WARN: always found - the item isn't removed from the DOM here

      // WARN: must be after the returns above (a non-item target) - otherwise draggability of such an element is destroyed forever (`cancel` isn't registered yet)
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
      // WARN: the cache is sparse (filled per index by `rectOf`) - only items of the active target are really read
      const rects: Array<DOMRect | undefined> = [];
      let trgRects: DOMRect[] | null = null; // rects of the targets: to detect over which one the cursor is
      let isRowLayout = false; // true when items are rendered horizontally (or multiline) - see rects below
      let iFrom = 0; // index in $items of the 1st item of trgActive
      let iTo = $items.length - 1; // index in $items of the last item of trgActive (`iFrom - 1` when the target has no items at all)
      let rangeOf: HTMLElement | undefined; // target which iFrom, iTo & isRowLayout are defined for (see updateRange)
      const resetRects = (): void => {
        // WARN: `length = 0` (not a new array) - the resetter is called on every scroll-tick during the dragging
        rects.length = 0;
        trgRects = null;
        // WARN: `rangeOf` is NOT reset here - a scroll shifts all the rects by the same delta, so the DOM-order & the
        // orientation are scroll-invariant: only the reorder in `moveItem` invalidates the range
      };
      const rScroll = onEvent(document, "scroll", resetRects, { capture: true, passive: true }); // scroll shifts viewport-based rects

      /** Returns the rect of the pointed item (cached - see the WARN above) */
      const rectOf = (i: number): DOMRect => (rects[i] ??= $items[i].getBoundingClientRect());

      /** Returns rects of the targets (cached - see the WARN above) */
      const getTrgRects = (): DOMRect[] => {
        if (!trgRects) {
          trgRects = targets.map((a) => a.getBoundingClientRect());
        }
        return trgRects;
      };

      /** Returns whether items are rendered horizontally in `trgActive`: it's used ONLY when the target holds less than 2 items -
       * so there are no neighbors to compare rects with (a single item or an empty target that gets its 1st item).
       * WARN: best-effort by design - it covers flex & grid-auto-flow only, so `grid-template-columns`, `column-count` &
       * `writing-mode` are reported as a column. A wrong answer costs the orientation of the 1px line-indicator, not the drop-place */
      const isRowByStyle = (): boolean => {
        const st = window.getComputedStyle(trgActive);
        if (st.display.endsWith("flex")) {
          return !st.flexDirection.startsWith("column"); // WARN: `inline-flex` is a row-layout too
        }
        if (st.display.endsWith("grid")) {
          return st.gridAutoFlow.startsWith("column"); // WARN: in opposite to flex a grid-column means items in a row
        }
        // WARN: `el` (not the target) - an ordinary parent has no own direction, so the item's own flow decides
        return window.getComputedStyle(el).display.startsWith("inline"); // inline-items flow in a row
      };

      /** Defines iFrom, iTo & isRowLayout: the range in $items that belongs to trgActive */
      const updateRange = (): void => {
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
        isRowLayout = false;
        if (!isLine) {
          return; // the orientation is read only by the line-indicator
        }
        if (iTo - iFrom < 1) {
          // WARN: without neighbors the rects can't be compared at all - so the layout of the target itself is inspected
          // (otherwise such a target is always treated as a column & the line-indicator is painted with the wrong orientation)
          isRowLayout = isRowByStyle();
          return;
        }
        // items are rendered in a row when at least 2 of them are on the same line (a multiline grid is a row-layout too)
        for (let i = iFrom + 1; !isRowLayout && i <= iTo; ++i) {
          isRowLayout = isSameLine(rectOf(i), rectOf(i - 1));
        }
      };

      /** Moves the dragged item into the pointed DOM-place & to the pointed index of $items */
      const moveItem = (index: number, parent: HTMLElement, next: Node | null): void => {
        parent.insertBefore(el, next); // WARN: the parent can be another target - so the item is moved between the lists
        $items.splice(index, 0, $items.splice(eli, 1)[0]);
        eli = index;
        resetRects(); // the reorder re-layouts items (& the targets themselves) - so cached rects are outdated
        rangeOf = undefined; // the reorder can move the item into another target - so the range is outdated too
        isThrottle = true;
        setTimeout(() => (isThrottle = false), 100); // to prevent fast changing position
      };

      /** Paints the line-indicator across the pointed rect at `pos` on the main axis (only for dropIndicator: 'line') */
      const paintLine = (pos: number, r: DOMRect): void => {
        if (!dropLine) {
          dropLine = document.createElement("div");
          dropLine.setAttribute("drop-line", "");
          el.parentElement!.prepend(dropLine); // WARN: position:fixed - so the parent doesn't affect the layout
        }
        dropLine.style.display = "";
        // WARN: for a row the line is vertical (before/after the item), for a column - horizontal (above/below the item)
        dropLine.style.width = `${isRowLayout ? lineW : r.width}px`;
        dropLine.style.height = `${isRowLayout ? r.height : lineW}px`;
        dropLine.style.transform = isRowLayout ? `translate(${pos}px, ${r.y}px)` : `translate(${r.x}px, ${pos}px)`;
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
            const rDrag = { left: x, top: y, right: x + rect.width, bottom: y + rect.height };
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
          if (rangeOf !== trgActive) {
            updateRange();
          }
          // the active target doesn't allow to select the exact place (see attr `wup-sort='false'`) - so the item is appended to the end
          const isEndOnly = trgActive.getAttribute(tagName) === "false";
          // WARN: `trgFrom` (not `trgActive.contains(el)`) - the default dropIndicator really moves the item out of the target,
          // so on the return such an item is appended to the end (re-ordered) instead of keeping its place
          if (isEndOnly && trgActive === trgFrom) {
            // the item belongs to the target & there is nothing to select - so it must keep its initial place
            dropTo = undefined; // WARN: the previous place (of another target) must be forgotten - otherwise it's applied on drop
            dropLine && (dropLine.style.display = "none");
            if (eli !== el._prevIndex || el.parentElement !== elParent) {
              moveItem(el._prevIndex, elParent!, elNext); // the item was moved into another target before - so it's returned back
            }
            return;
          }
          const isEmpty = iTo < iFrom; // the active target has no items at all - so the dragged one becomes the 1st there
          if (isEmpty || isEndOnly) {
            // WARN: `iTo + 1` of an empty target is the place BETWEEN items of the neighbor targets - so it's shifted
            // when the item is taken from the left
            const at = iTo + 1; // the new place is the end of the target
            // WARN: `nextElementSibling` & `firstFalseOf` (not `null`) - otherwise the item is appended after non-sortable
            // items ([item=false]): the 1st item of an empty target jumps over such a footer & the next ones don't
            const parent = isEmpty ? trgActive : $items[iTo].parentElement!;
            const next = isEmpty ? firstFalseOf(trgActive) : $items[iTo].nextElementSibling;
            if (isLine) {
              dropTo = { at, parent, next };
              if (isEmpty) {
                const r = getTrgRects()[targets.indexOf(trgActive)];
                paintLine(isRowLayout ? r.x : r.y, r); // WARN: on the edge of the target - there is no gap between items to point
              } else {
                const r = rectOf(iTo);
                paintLine((isRowLayout ? r.right : r.bottom) - lineW / 2, r); // on the far edge of the last item
              }
            } else {
              const iNew = at > eli ? at - 1 : at; // index after removing the item from the previous place
              // WARN: the place can be the same one (the item was appended to the end-only target before) - so an extra
              // move (with the re-layout & the throttle on every 100ms of the dragging) must be skipped
              if (iNew !== eli || parent !== el.parentElement) {
                moveItem(iNew, parent, next);
              }
            }
            return;
          }
          // find nearest line
          let nearest = eli; // index of nearest item
          let nearestEnd = eli; // index of last item in the nearest line
          let dist = Number.MAX_SAFE_INTEGER; // distance between centers
          // WARN: undefined (not 0) - otherwise the 1st item is treated as a part of the line y=0 (possible when page is scrolled)
          // and nearestEnd goes out of rects-range
          let lineY: number | undefined;
          for (let i = iFrom; i <= iTo; ++i) {
            const rl = rectOf(i);
            const nextLineY = rl.y + rl.height / 2;
            if (lineY === undefined || Math.abs(nextLineY - lineY) > lineTolerance) {
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
          // WARN: distances are squared (without Math.sqrt) - they are used only for the comparison below and sqrt keeps the order
          dist = Number.MAX_SAFE_INTEGER;
          for (let i = nearest; i <= nearestEnd; ++i) {
            const r = rectOf(i);
            const dx = ev.clientX - (r.x + r.width / 2);
            const dy = ev.clientY - (r.y + r.height / 2);
            const c = dx * dx + dy * dy;
            if (c < dist) {
              dist = c;
              nearest = i;
            }
          }
          // paint the line-indicator instead of moving the item (the layout isn't shifted at all)
          if (isLine) {
            const r = rectOf(nearest);
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
              // for a row the neighbor must be on the same line - otherwise the gap is between lines
              !!a && (!isRowLayout || isSameLine(a, r));
            // WARN: items of other targets aren't neighbors at all - otherwise the gap is measured between different lists
            const at = (i: number): DOMRect | undefined => (i >= iFrom && i <= iTo ? rectOf(i) : undefined);
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
            paintLine(pos, r);
            return;
          }
          // move to the new place
          if (eli !== nearest) {
            const rEl = rectOf(eli);
            const rTrg = rectOf(nearest);
            const isOneLine = isSameLine(rTrg, rEl);
            const half = rTrg.x + rTrg.width / 2;
            // WARN: inside the line the cursor must cross the middle of the target - otherwise items of different sizes are swapped back & forth:
            // after the swap the center of the target is shifted by the width of the dragged item, so the opposite condition can't be true anymore
            // WARN: for another line there is no such check - the nearest line is detected by the closest center already
            // (otherwise the item is moved only when the cursor reaches the middle of the another line)
            // WARN: DOM order === visual order - so `nearest > eli` always means the item to the right or below
            // WARN: when the cursor is over another target the item is moved immediately - the intention is unambiguous there
            // (the middle-crossing rule is about neighbors of the same list)
            const isCross = !trgActive.contains(el);
            if (isCross || !isOneLine || (nearest > eli ? ev.clientX >= half : ev.clientX < half)) {
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

            // WARN: `eli` is the index of the item in $items (kept in sync by moveItem) - so an extra scan isn't required
            (el._prevIndex !== eli || el.parentElement !== elParent) &&
              onChange(
                $items.map((x) => x._prevIndex),
                $items,
                -1,
                trgFrom,
                trgTo()
              );
          }
        }
        resetRects(); // WARN: the return-animation above retains this scope - so cached rects must be released here
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
