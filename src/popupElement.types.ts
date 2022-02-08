import { WUP } from "./baseElement";
import { IPlacementFunction } from "./popupPlacements";

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
  }

  export interface PopupEventMap extends HTMLElementEventMap {
    /** Fires before show is happened; can be prevented via e.preventDefault() */
    $willShow: Event;
    /** Fires after popup is shown */
    $show: Event;
    /** Fires before hide is happened; can be prevented via e.preventDefault() */
    $willHide: Event;
    /** Fires after popup is hidden */
    $hide: Event;
  }

  export interface Element<T extends PopupEventMap & Record<keyof T, Event> = PopupEventMap>
    extends WUP.IBaseElement<T> {
    $options: Options;
    /** Show popup; it disables option.showCase and enables by $hide() */
    $show: () => void;
    /** Hide popup */
    $hide: () => void;
    /** Current state */
    readonly $isOpened: boolean;
  }
}
