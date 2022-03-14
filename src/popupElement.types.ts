import { WUP } from "./baseElement";
import { WUPPopupPlace } from "./popupPlacements";

export namespace WUPPopup {
  export const enum ShowCases {
    /** Show when it's added to document; to hide just remove popup from document (outsideClick event can be helpful) */
    always = 0,
    /** On mouseEnter event of target; hide by mouseLeave; if popup shown by mouseEnter it can'be closed by click (onHover partially suppress onClick case)  */
    onHover = 1, // todo check onHover on mobileDevices; maybe onTouch instead ?
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
    /** When options or attributes changes */
    onOptionChange,
  }

  export interface Options {
    /** Anchor that popup uses for placement. If attr.target and $options.target are empty previousSibling will be attached.
     * attr target="{querySelector}" has hire priority than .options.target */
    target?: HTMLElement | null;
    /**
     * Placement rules relative to target; example Placements.bottom.start or Placements.bottom.start.adjust
     * Point several to define alternate behavior (when space are not enough)
     */
    placement: Array<WUPPopupPlace.PlaceFunc>;
    /** Alternative of margin for targetElement related to popup
     *  [top, right, bottom, left] or [top/bottom, right/left] in px */
    offset: [number, number, number, number] | [number, number];
    /** Inside edges of fitElement popup is positioned and can't overflow fitElement; {body} by default */
    toFitElement?: HTMLElement | null;
    /** Sets minWidth 100% of targetWidth */
    minWidthByTarget: boolean;
    /** Sets minHeight 100% of targetWidth */
    minHeightByTarget: boolean;
    /** Case when popup need to show; default is `onClick`
     * @example
     * showCase=WUPPopup.ShowCases.onFocus | WUPPopup.ShowCases.onClick // to join cases
     * */
    showCase: ShowCases;
    /** Timeout in ms before popup shows on hover of target (for ShowCases.onHover); Default is 200ms */
    hoverShowTimeout: number;
    /** Timeout in ms before popup hides on mouse-leave of target (for ShowCases.onHover); Default is 500ms  */
    hoverHideTimeout: number;
    /** Debounce option for onFocustLost event (for ShowCases.onFocus); More details @see onFocusLostOptions.debounceMs in helpers/onFocusLost; Default is 100ms */
    focusDebounceMs?: number;
    /** Set true to show arrow with popup; @false by default */
    arrowEnable: boolean;
    /** Setup arrow class and use :before to add background-image or content;
     * Limitation: arrow developed with ratio 2:1(w:h). You can't change it directly. Use only :before, :after to reach you goal */
    arrowClass?: string;
    /** Alternative of margin for targetElement related to arrow
     *  [top, right, bottom, left] or [top/bottom, right/left] in px */
    arrowOffset: [number, number, number, number] | [number, number];
  }

  export interface EventMap extends WUP.EventMap {
    /** Fires before show is happened; can be prevented via e.preventDefault() */
    $willShow: Event;
    /** Fires after popup is shown */
    $show: Event;
    /** Fires before hide is happened; can be prevented via e.preventDefault() */
    $willHide: Event;
    /** Fires after popup is hidden */
    $hide: Event;
  }

  export interface Element {
    $options: Options;
    /** Show popup; it disables option.showCase and enables by $hide() */
    $show: () => void;
    /** Hide popup */
    $hide: () => void;
    /** Current state */
    readonly $isOpened: boolean;
  }
}
