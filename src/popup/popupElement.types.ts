export const enum PopupOpenCases {
  /** When $open() is called programmatically */
  onManualCall = 0,
  /** On init (when appended to layout) */
  onInit = 1,
  /** On `mouseenter` event of target; hide by `mouseleave` */
  onHover = 1 << 1,
  /** On `focusIn` event of target; hide by `focusout` (also on click if PopupOpenCases.onClick included) */
  onFocus = 1 << 2,
  /** On `click` event of target; hide by click anywhere */
  onClick = 1 << 3,
}

export const enum PopupCloseCases {
  /** When $close() is called programmatically */
  onManualCall,
  /** When mouse left target & popup */
  onMouseLeave,
  /** When focus left target & popup */
  onFocusOut,
  /** When was click outside target & popup */
  onOutsideClick,
  /** When was click on popup */
  onPopupClick,
  /** When was click on target & popup was opened */
  onTargetClick,
  /** When target removed from document */
  onTargetRemove,
  /** When options or attributes changes */
  onOptionChange,
  /** When user pressed Escape button */
  onPressEsc,
}

export const enum PopupAnimations {
  /** Via opacity/css-style */
  default = 0,
  /** Dropdown/drawer animation. It's implemented via JS */
  drawer,
  /** Animate (show/hide) element as dropdown via moving every item to position step by step
   * @tutorial expected structure
   * * use attr [items] `<div items><button>item 1</button>...</div>`
   * * use <li/> `<ul><li><button>item 1</button></li>...</ul>`
   * * use nested structure <div><button>item 1</button>...</div>
   * * or use without wrapper <button>item 1</button>... */
  stack,
}

declare global {
  namespace WUP.Popup {
    interface Options {
      /** Placement rules relative to target;
       * @defaultValue `[
       *   WUPPopupElement.$placements.$top.$middle.$adjust, //
       *   WUPPopupElement.$placements.$bottom.$middle.$adjust ]`
       * @example // to place around center of target use option offset
       * popup.$options.offset = (r) => [-r.height / 2, -r.width / 2]; */
      placement: Array<WUP.Popup.Place.PlaceFunc>;
      /** Inside edges of fitElement popup is positioned and can't overflow fitElement;
       * @defaultValue `document.body` */
      toFitElement: HTMLElement;
      /** Case when popup need to show;
       * @defaultValue `PopupOpenCases.onClick`
       * @example
       * // use `|` to to join cases
       * openCase=PopupOpenCases.onFocus | PopupOpenCases.onClick;  */
      openCase: PopupOpenCases;
      /** Timeout in ms before popup shows on hover of target (for PopupOpenCases.onHover);
       * @defaultValue 200ms */
      hoverOpenTimeout: number;
      /** Timeout in ms before popup hides on mouse-leave of target (for PopupOpenCases.onHover);
       * @defaultValue 500ms  */
      hoverCloseTimeout: number;
      /** Animation applied to popup
       * @defaultValue `PopupAnimations.default (opacity)` */
      animation: PopupAnimations;
      /** Anchor that popup uses for placement
       * @defaultValue previousSibling */
      target?: HTMLElement | SVGElement | null;
      /** Virtual margin of targetElement (relative to popup)
       *  [top, right, bottom, left] or [top/bottom, right/left] in px */
      offset?:
        | [number, number, number, number]
        | [number, number]
        | ((targetRect: DOMRect) => [number, number, number, number] | [number, number]);
      /** Virtual padding of fitElement
       *  [top, right, bottom, left] or [top/bottom, right/left] in px */
      offsetFitElement?: [number, number, number, number] | [number, number];
      /** Sets minWidth 100% of targetWidth; it can't be more than css-style min-width */
      minWidthByTarget?: boolean;
      /** Sets maxWidth 100% of targetWidth; it can't be more than css-style max-width */
      maxWidthByTarget?: boolean;
      /** Sets minHeight 100% of targetWidth; it can't be more than css-style min-height */
      minHeightByTarget?: boolean;
      /** Set true to show arrow with popup; @false by default;
       *  Arrow is placed after popup so it's easy to access (via style @see {@link arrowClass} or @see {@link WUPPopupElement.$refArrow) */
      arrowEnable?: boolean;
      /** Setup arrow class and use :before to add background-image or content;
       * Limitation: arrow developed with ratio 2:1(w:h). You can't change it directly. Use only :before, :after to reach you goal
       *
       * To customize arrow style you can use also the following scss logic
       * @example
       * wup-popup + wup-popup-arrow {
       *   opacity: 0.5
       *   &:before {
       *      background: no-repeat url("someImageHere.png");
       *   }
       * } */
      arrowClass?: string;
      /** Virtual margin for targetElement related to arrow
       *  [top, right, bottom, left] or [top/bottom, right/left] in px */
      arrowOffset?: [number, number, number, number] | [number, number];
    }

    interface Attributes {
      "w-placement"?:
        | "top-start"
        | "top-middle"
        | "top-end"
        | "bottom-start"
        | "bottom-middle"
        | "bottom-end"
        | "left-start"
        | "left-middle"
        | "left-end"
        | "right-start"
        | "right-middle"
        | "right-end";
      /** QuerySelector to find target - anchor that popup uses for placement.
       * If attr.target and $options.target are empty previousSibling will be attached.
       * Popup defines target on show()
       *
       * attr `target` has hire priority than ref.options.target */
      "w-target"?: string;
      /** @readonly Result position; use this to restyle animation etc. */
      readonly position?: "top" | "left" | "bottom" | "right";
      /** @readonly Hide state; use this to hide-animation */
      readonly hide?: "";
      /** Animation applied to popup */
      "w-animation"?: "" | "default" | "drawer" | "stack";
      /* Custom attribute used for internal behavior */
      menu?: "";
      /* Custom attribute used for styling */
      tooltip?: "";
    }

    interface AttachOptions extends Partial<Omit<Options, "target">> {
      target: HTMLElement | SVGElement;
      text: string | undefined | null;
      tagName?: string;
    }

    interface EventMap extends WUP.BaseModal.EventMap<PopupOpenCases, PopupCloseCases> {}
  }
}

// export {}; // https://www.typescriptlang.org/docs/handbook/declaration-files/templates/global-modifying-module-d-ts.html
