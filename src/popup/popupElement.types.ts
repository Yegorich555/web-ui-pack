import { WUP } from "../baseElement";
import { WUPPopupPlace } from "./popupPlacements";

export namespace WUPPopup {
  export const enum ShowCases {
    /** Show when it's added to document; to hide just remove popup from document (outsideClick event can be helpful) */
    always = 0,
    /** On mouseEnter event of target; hide by mouseLeave; if popup shown by mouseEnter it can'be closed by click (onHover partially suppress onClick case)  */
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
    onManuallCall,
    onMouseLeave,
    onFocusOut,
    onOutsideClick,
    onPopupClick,
    onTargetClick,
    /** When target removed from document */
    onTargetRemove,
    /** When options or attributes changes */
    onOptionChange,
  }

  export const enum Animations {
    /** Via opacity */
    default = 0,
    /** Dropdown/drawer animation. It's implemented via JS */
    drawer,
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
    /** Virtual margin of targetElement (relative to popup)
     *  [top, right, bottom, left] or [top/bottom, right/left] in px */
    offset: [number, number, number, number] | [number, number];
    /** Inside edges of fitElement popup is positioned and can't overflow fitElement; {body} by default */
    toFitElement?: HTMLElement | null;
    /** Sets minWidth 100% of targetWidth */
    minWidthByTarget: boolean;
    /** Sets maxWidth 100% of targetWidth */
    maxWidthByTarget: boolean;
    /** Sets minHeight 100% of targetWidth */
    minHeightByTarget: boolean;
    /** Case when popup need to show;
     * @defaultValue onClick
     * @example
     * showCase=WUPPopup.ShowCases.onFocus | WUPPopup.ShowCases.onClick // to join cases
     * */
    showCase: ShowCases;
    /** Timeout in ms before popup shows on hover of target (for ShowCases.onHover);
     * @defaultValue 200ms */
    hoverShowTimeout: number;
    /** Timeout in ms before popup hides on mouse-leave of target (for ShowCases.onHover);
     * @defaultValue 500ms  */
    hoverHideTimeout: number;
    /** Debounce option for onFocustLost event (for ShowCases.onFocus); More details @see onFocusLostOptions.debounceMs in helpers/onFocusLost;
     * @defaultValue 100ms */
    focusDebounceMs?: number;
    /** Set true to show arrow with popup; @false by default;
     *  Arrow is placed after popup so it's easy to access (via style @see arrowClass or popupElement.$arrowElement)
     */
    arrowEnable: boolean;
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
     * }
     *  */
    arrowClass?: string;
    /** Virtual margin for targetElement related to arrow
     *  [top, right, bottom, left] or [top/bottom, right/left] in px */
    arrowOffset: [number, number, number, number] | [number, number];
    /** Animation that applied to popup
     * @defaultValue Animations.default */
    animation?: Animations;
  }

  export type AttachOptions = Partial<Omit<Options, "target">> & {
    target: HTMLElement;
    text: string | undefined | null;
    tagName?: string;
  };

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
}
