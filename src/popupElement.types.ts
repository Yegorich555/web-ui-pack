import WUPBaseElement from "./baseElement";
import { IPlacementFunction } from "./popupPlacements";

export namespace WUPPopup {
  export const enum ShowCases {
    /** Show when it's added to document; to hide just remove popup from document (outsideClick event can be helpful) */
    always = 0,
    /** On mouseHover event of target; hide by onMouseLeave */
    onHover = 1,
    /** On focusIn event of target; hide by focusOut (also on click if PopupShowCases.onClick included) */
    onFocus = 1 << 1,
    /** On click event of target; hide by click anywhere */
    onClick = 1 << 2,
  }

  export const enum HideCases {
    /** When $show() is fired again; possible by firing $show() or changing attr `placement` */
    onShowAgain = 0,
    /** When $hide() is fired programmatically */
    onFireHide,
    onMouseLeave,
    onFocusOut,
    onOutsideClick,
    onPopupClick,
    onTargetClick,
  }

  export interface Options {
    /** Anchor that popup uses for placement. If target not found previousSibling will be attached.
     *
     * attr target="{querySelector}" has hire priority than .options.target */
    target?: HTMLElement | null;
    /** Placement rule relative to target; example Placements.bottom.start or Placements.bottom.start.adjust */
    placement: IPlacementFunction;
    /** Alternate when pointed placement doesn't fit the layout */
    placementAlt: Array<IPlacementFunction>;
    /** Alternative of margin for targetElement related to popup

   *  [top, right, bottom, left] or [top/bottom, right/left] in px */
    offset: [number, number, number, number] | [number, number];
    /** Inside edges of fitElement popup is positioned and can't overflow fitElement; {body} by default */
    toFitElement: HTMLElement;
    /** Sets minWidth 100% of targetWidth */
    minWidthByTarget: boolean;
    /** Sets minHeight 100% of targetWidth */
    minHeightByTarget: boolean;

    // todo overflow behavior when target partially hidden by scrollable parent
    // possible cases: hide, placeOpposite

    /** Case when popup need to show; You can use `showCase=PopupShowCases.onFocus | PopupShowCases.onClick` to join cases
     *
     * Default is PopupShowCases.always */
    showCase: ShowCases;
    /** Timeout in ms before popup shows on hover of target; Default is 200ms */
    hoverShowTimeout: number;
    /** Timeout in ms before popup hides on mouse-leave of target; Default is 500ms  */
    hoverHideTimeout: number;
    /** Debounce option for onFocustLost event; More details @see onFocusLostOptions.debounceMs in helpers/onFocusLost; Default is 100ms */
    focusDebounceMs?: number;
  }

  export interface PopupEventMap extends HTMLElementEventMap {
    $show: Event;
    $hide: Event;
  }

  export interface Element extends WUPBaseElement {
    $options: WUPPopup.Options;
    /** Show popup */
    $show: () => void;
    /** Hide popup */
    $hide: () => void;
    /** Current state */
    readonly $isOpened: boolean;

    dispatchEvent(type: keyof PopupEventMap, eventInitDict?: EventInit): boolean;
    dispatchEvent(event: Event): boolean;

    addEventListener<K extends keyof PopupEventMap>(
      type: K,
      listener: (this: Element, ev: PopupEventMap[K]) => void,
      options?: Parameters<HTMLElement["addEventListener"]>[2]
    ): void;
    // disallow custom events to avoid mistakes
    // addEventListener(...args: Parameters<HTMLElement["addEventListener"]>): void;
  }
}
