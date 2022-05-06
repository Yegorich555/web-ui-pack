/* eslint-disable no-use-before-define */
import focusFirst from "../helpers/focusFirst";
import onEvent, { onEventType } from "../helpers/onEvent";
import onFocusGot from "../helpers/onFocusGot";
import onFocusLost from "../helpers/onFocusLost";
import onSpy from "../helpers/onSpy";
import { WUPPopup } from "./popupElement.types";

/**
 * listen for target according to showCase and return onRemoveCallback (listeners that need to remove when popup removed)
 * If target removed then listeners removed
 * */
export default function popupListenTarget(
  options: {
    target: HTMLElement;
    showCase?: WUPPopup.ShowCases;
    hoverShowTimeout?: number;
    hoverHideTimeout?: number;
    focusDebounceMs?: number;
  },
  /** If succesfull callback must return HTMLElement */
  onShow: (showCase: WUPPopup.ShowCases) => HTMLElement | null | Promise<HTMLElement | null>,
  onHide: (hideCase: WUPPopup.HideCases) => boolean | Promise<boolean>
): {
  /** Fire it when element is removed manually (to remove all added related eventListeners) */
  onRemoveRef: () => void;
  /** Fire it when element is hidden manually */
  onHideRef: () => void;
} {
  const opts = { ...popupListenTarget.$defaults, ...options };
  const t = opts.target;
  if (!(t instanceof HTMLElement)) {
    throw new Error("WUP-Popup. Target is required");
  }
  if (!t.isConnected) {
    throw new Error("WUP-Popup. Target must be appended to layout");
  }

  let openedEl: HTMLElement | null = null;
  const onShowCallbacks: Array<() => () => void> = [];
  const onHideCallbacks: Array<() => void> = [];
  const onRemoveCallbacks: Array<() => void> = [];

  function onHideRef() {
    onHideCallbacks.forEach((f) => f());
    onHideCallbacks.length = 0;
  }
  function onRemoveRef() {
    rstSpy();
    rstSpy2();

    onRemoveCallbacks.forEach((f) => f());
    onRemoveCallbacks.length = 0;
    onHideRef();
    onShowCallbacks.length = 0;
  }

  async function show(showCase: WUPPopup.ShowCases): Promise<boolean> {
    openedEl = await onShow(showCase);
    if (openedEl) {
      onShowCallbacks.forEach((f) => onHideCallbacks.push(f()));
      return true;
    }

    return false;
  }

  function hide(hideCase: WUPPopup.HideCases): boolean {
    if (onHide(hideCase)) {
      openedEl = null;
      onHideRef();
      return true;
    }
    return false;
  }

  // try to detect if target removed
  function hideByRemove() {
    openedEl && hide(WUPPopup.HideCases.onTargetRemove);
    onRemoveRef();
  }
  const rstSpy = onSpy(t, "remove", hideByRemove);
  const rstSpy2 = onSpy(t.parentElement as HTMLElement, "removeChild", (child) => child === t && hideByRemove());

  function appendEvent<K extends keyof HTMLElementEventMap>(
    ...args: Parameters<onEventType<K, HTMLElement | Document>>
  ) {
    const r = onEvent(...args);
    onRemoveCallbacks.push(r);
    return r;
  }

  // add event by popup.onShow and remove by onHide
  function onShowEvent<K extends keyof HTMLElementEventMap>(...args: Parameters<onEventType<K, Document>>) {
    onShowCallbacks.push(() => onEvent(...args));
  }

  function includes(el: unknown): boolean {
    return el instanceof Node && (openedEl as HTMLElement).contains(el);
  }

  // apply showCase
  let preventClickAfterFocus = false;
  let openedByHover = false;
  // onClick
  if (opts.showCase & WUPPopup.ShowCases.onClick) {
    // fix when labelOnClick > inputOnClick
    let wasOutsideClick = false;
    let lastActive: HTMLElement | null = null;
    onShowEvent(document, "focusin", ({ target }) => {
      const isMe = openedEl === target || includes(target);
      if (!isMe) {
        lastActive = target as HTMLElement;
      }
    });

    onShowEvent(document, "click", ({ target }) => {
      preventClickAfterFocus = false; // mostly it doesn't make sense but maybe it's possible
      // filter click from target because we have target event for this
      if (t !== target && !(target instanceof Node && t.contains(target))) {
        const isMeClick = openedEl === target || includes(target);
        if (isMeClick) {
          focusFirst(lastActive || t);
          hide(WUPPopup.HideCases.onPopupClick);
        } else {
          hide(WUPPopup.HideCases.onOutsideClick);
          wasOutsideClick = true;
          setTimeout(() => (wasOutsideClick = false), 50);
        }
      }
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    appendEvent(t, "click", (e) => {
      if (!(e as MouseEvent).pageX) {
        // pageX is null if it was fired programmatically
        preventClickAfterFocus = false; // test-case: focus without click > show....click programatically on target > it should hide
      }

      if (timeoutId || wasOutsideClick || openedByHover) {
        return;
      }

      if (!openedEl) {
        lastActive = document.activeElement as HTMLElement;
        show(WUPPopup.ShowCases.onClick);
      } else if (!preventClickAfterFocus) {
        hide(WUPPopup.HideCases.onTargetClick);
      }
      // fix when labelOnClick > inputOnClick
      timeoutId = setTimeout(() => (timeoutId = undefined), 50);
    });
  }

  // onHover
  if (opts.showCase & WUPPopup.ShowCases.onHover) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const ev = (ms: number, isMouseIn: boolean) => {
      timeoutId && clearTimeout(timeoutId);
      openedByHover = isMouseIn;
      if ((isMouseIn && !openedEl) || (!isMouseIn && openedEl))
        timeoutId = setTimeout(
          () =>
            t.isConnected && // possible when target removed via innerHTML
            (isMouseIn
              ? show(WUPPopup.ShowCases.onHover) //
              : hide(WUPPopup.HideCases.onMouseLeave)),
          ms
        );
      else timeoutId = undefined;
    };
    appendEvent(t, "mouseenter", () => ev(opts.hoverShowTimeout, true));
    // use only appendEvent; with onShowEvent it doesn't work properly (because filtered by timeout)
    appendEvent(t, "mouseleave", () => ev(opts.hoverHideTimeout, false));
  }

  // onFocus
  if (opts.showCase & WUPPopup.ShowCases.onFocus) {
    const onFocused = () => {
      if (!openedEl && show(WUPPopup.ShowCases.onFocus)) {
        if (opts.showCase & WUPPopup.ShowCases.onClick) {
          preventClickAfterFocus = true;
          const r1 = appendEvent(document, "touchstart", () => rst());
          const r2 = appendEvent(document, "mousedown", () => rst());
          const rst = () => {
            preventClickAfterFocus = false;
            r1();
            r2();
          };
        }
      }
    };
    onRemoveCallbacks.push(onFocusGot(t, onFocused, { debounceMs: opts.focusDebounceMs }));

    const blur = ({ relatedTarget }: FocusEvent) => {
      if (openedEl) {
        const isToMe = openedEl === document.activeElement || openedEl === relatedTarget;
        const isToMeInside = !isToMe && includes(document.activeElement || relatedTarget);
        !isToMe && !isToMeInside && hide(WUPPopup.HideCases.onFocusOut);
        if (!openedEl) {
          openedByHover = false;
        }
      }
    };

    onShowCallbacks.push(() => onFocusLost(t, blur, { debounceMs: opts.focusDebounceMs }));
    const a = document.activeElement;
    if (a === t || (a instanceof HTMLElement && t.contains(a))) {
      // isAlreadyFocused
      onFocused();
      preventClickAfterFocus = false;
    }
  }

  return { onRemoveRef, onHideRef };
}

popupListenTarget.$defaults = {
  showCase: WUPPopup.ShowCases.onClick,
  hoverShowTimeout: 200,
  hoverHideTimeout: 500,
};
