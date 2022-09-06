import focusFirst from "../helpers/focusFirst";
import onEvent, { onEventType } from "../helpers/onEvent";
import onFocusGot from "../helpers/onFocusGot";
import onFocusLost from "../helpers/onFocusLost";
import { WUPPopup } from "./popupElement.types";

/** Listen for target according to showCase. If target removed call stopListen + don't forget to remove popup yourself;
 * @tutorial Troubleshooting/rules:
 * * To allow user hide/show popup before previous action is ended provide for onShow and onHide-
 *   callbacks results as fast as it's possible without waiting for animation */
export default function popupListen(
  options: {
    target: HTMLElement;
    showCase?: WUPPopup.ShowCases;
    hoverShowTimeout?: number;
    hoverHideTimeout?: number;
    focusDebounceMs?: number;
    /** By default when listener is applied on focused element it provides immediate onShow event. You can disable this */
    skipAlreadyFocused?: boolean;
  },
  /** If succesfull callback must return HTMLElement */
  onShow: (
    showCase: WUPPopup.ShowCases,
    ev: MouseEvent | FocusEvent | null
  ) => HTMLElement | null | Promise<HTMLElement | null>,
  onHide: (hideCase: WUPPopup.HideCases, ev: MouseEvent | FocusEvent | null) => boolean | Promise<boolean>
): {
  /** Fire it when target is removed manually (to remove all added related eventListeners) */
  stopListen: () => void;
  /** Fire it before hiding (to ability to show in the feature by listened events) when you need to hide outside listener (manually) */
  hide: (hideCase: WUPPopup.HideCases) => Promise<void>;
  /** Fire it before showing (to ability to hide in the feature by listened events) when you need to show outside listener (manually) */
  show: (showCase: WUPPopup.ShowCases) => Promise<void>;
} {
  const opts = { ...popupListen.$defaults, ...options };
  const t = opts.target;
  if (!(t instanceof HTMLElement)) {
    throw new Error("WUP-Popup. Target is required");
  }
  if (!t.isConnected) {
    throw new Error("WUP-Popup. Target must be appended to layout");
  }

  let openedEl: HTMLElement | null = null;
  /** Events that must be added on show; Should return removeCallbacks/onHideCallbacks */
  const onShowCallbacks: Array<() => () => void> = [];
  const onHideCallbacks: Array<() => void> = [];
  const onRemoveCallbacks: Array<() => void> = [];

  function onHideRef(): void {
    onHideCallbacks.forEach((f) => f());
    onHideCallbacks.length = 0;
  }
  function stopListen(): void {
    openedEl = null;
    onRemoveCallbacks.forEach((f) => f());
    onRemoveCallbacks.length = 0;
    onHideRef();
    onShowCallbacks.length = 0;
  }

  async function show(showCase: WUPPopup.ShowCases, e?: MouseEvent | FocusEvent): Promise<void> {
    if (openedEl || show._isDoing) {
      return;
    }
    show._isDoing = true;
    // eslint-disable-next-line no-async-promise-executor
    show._isDoing = new Promise<void>(async (res, rej) => {
      try {
        openedEl = await onShow(showCase, e || null);
        res();
      } catch (err) {
        rej(err);
      }
    }).finally(() => (show._isDoing = false));
    await show._isDoing;
    // timeout required to avoid immediate hide by bubbling events to root
    openedEl && setTimeout(() => openedEl && onShowCallbacks.forEach((f) => onHideCallbacks.push(f())));
  }
  show._isDoing = false as Promise<void> | boolean; // required to prevent infinite-calling from parent

  async function hide(hideCase: WUPPopup.HideCases, e?: MouseEvent | FocusEvent | null): Promise<void> {
    show._isDoing && (await show._isDoing);
    if (!openedEl || hide._isDoing) {
      return;
    }
    const was = openedEl; // required when user clicks again during the hidding > we need to show in this case
    openedEl = null;
    onHideRef();
    try {
      hide._isDoing = true;
      const isOk = await onHide(hideCase, e || null);
      if (!isOk && !openedEl) {
        openedEl = was; // rollback if onHide was prevented and onShow wasn't called again during the hidding
        onShowCallbacks.forEach((f) => onHideCallbacks.push(f()));
      }
    } catch (error) {
      Promise.reject(error); // handle error from onHide
    }
    hide._isDoing = false;
  }
  hide._isDoing = false; // required to prevent infinite-calling from parent

  function appendEvent<K extends keyof HTMLElementEventMap>(
    ...args: Parameters<onEventType<K, HTMLElement | Document>>
  ): () => void {
    const r = onEvent(...args);
    onRemoveCallbacks.push(r);
    return r;
  }

  // add event by popup.onShow and remove by onHide
  function onShowEvent<K extends keyof HTMLElementEventMap>(
    ...args: Parameters<onEventType<K, Document | HTMLElement>>
  ): void {
    onShowCallbacks.push(() => onEvent(...args));
  }

  function includes(el: unknown): boolean {
    return el instanceof Node && (openedEl as HTMLElement).contains(el);
  }

  // apply showCase
  let preventClickAfterFocus = false;
  let openedByHover = false;
  let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
  // onClick
  if (opts.showCase & WUPPopup.ShowCases.onClick) {
    let wasOutsideClick = false; // fix when labelOnClick > inputOnClick
    let lastActive: HTMLElement | null = null;
    onShowEvent(document, "focusin", ({ target }) => {
      const isMe = openedEl === target || includes(target);
      if (!isMe) {
        lastActive = target as HTMLElement;
      }
    });

    let wasMouseMove = false; // fix when user makes t.mousedown, mousemove, body.mouseup
    appendEvent(t, "mousedown", () => {
      wasMouseMove = false;
      const r = onEvent(
        t,
        "mousemove",
        (e) => (wasMouseMove = e.movementX !== 0 || e.movementY !== 0), // it's required otherwise browser can provide move with 0 0 changes
        { once: true, passive: true }
      );
      document.addEventListener("mouseup", () => r(), { once: true, passive: true });
    });

    onShowEvent(document, "click", (e) => {
      preventClickAfterFocus = false; // mostly it doesn't make sense but maybe it's possible
      if (wasMouseMove || e.detail === 2) {
        wasMouseMove = false;
        return;
      }
      // filter click from target because we have target event for this
      const isTarget = t === e.target || (e.target instanceof Node && t.contains(e.target));
      if (!isTarget) {
        const isMeClick = openedEl === e.target || includes(e.target);
        if (isMeClick) {
          focusFirst(lastActive || t);
          hide(WUPPopup.HideCases.onPopupClick, e);
        } else {
          hide(WUPPopup.HideCases.onOutsideClick, e);
          wasOutsideClick = true;
          setTimeout(() => (wasOutsideClick = false), 50);
        }
      }
    });

    appendEvent(t, "click", (e) => {
      if (!(e as MouseEvent).pageX) {
        // pageX is null if it was called programmatically
        preventClickAfterFocus = false; // test-case: focus without click > show....click programatically on target > it should hide
      }

      if (
        preventClickAfterFocus ||
        debounceTimeout ||
        wasOutsideClick ||
        openedByHover ||
        e.detail === 2 || // it's double-click
        wasMouseMove
      ) {
        return;
      }

      if (!openedEl) {
        lastActive = document.activeElement as HTMLElement;
        show(WUPPopup.ShowCases.onClick, e);
      } else {
        const isMeClick = openedEl === e.target || includes(e.target);
        hide(isMeClick ? WUPPopup.HideCases.onPopupClick : WUPPopup.HideCases.onTargetClick, e);
      }

      // fix when labelOnClick > inputOnClick > inputOnFocus
      debounceTimeout = setTimeout(() => (debounceTimeout = undefined), 1);
    });
  }

  // onHover
  if (opts.showCase & WUPPopup.ShowCases.onHover) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const ev = (ms: number, isMouseIn: boolean, e: MouseEvent): void => {
      timeoutId && clearTimeout(timeoutId);
      openedByHover = isMouseIn;
      if ((isMouseIn && !openedEl) || (!isMouseIn && openedEl))
        timeoutId = setTimeout(
          () =>
            t.isConnected && // possible when target removed via innerHTML
            (isMouseIn
              ? show(WUPPopup.ShowCases.onHover, e) //
              : hide(WUPPopup.HideCases.onMouseLeave, e)),
          ms
        );
      else timeoutId = undefined;
    };
    appendEvent(t, "mouseenter", (e) => ev(opts.hoverShowTimeout, true, e));
    // use only appendEvent; with onShowEvent it doesn't work properly (because filtered by timeout)
    appendEvent(t, "mouseleave", (e) => ev(opts.hoverHideTimeout, false, e));
  }

  // onFocus
  if (opts.showCase & WUPPopup.ShowCases.onFocus) {
    const onFocused = async (e: FocusEvent): Promise<void> => {
      if (!openedEl || debounceTimeout) {
        preventClickAfterFocus = !!(opts.showCase & WUPPopup.ShowCases.onClick);
        await show(WUPPopup.ShowCases.onFocus, e);
        if (preventClickAfterFocus) {
          const rst = (): void => {
            preventClickAfterFocus = false;
            r1();
            r2();
          };
          const r1 = appendEvent(document, "touchstart", rst); // mousdown isn't not called when user touch-move-end
          const r2 = appendEvent(document, "mousedown", rst);
        }
      }
    };
    onRemoveCallbacks.push(onFocusGot(t, onFocused, { debounceMs: opts.focusDebounceMs }));

    const blur = async (e: FocusEvent): Promise<void> => {
      if (openedEl) {
        const isToMe = openedEl === document.activeElement || openedEl === e.relatedTarget;
        const isToMeInside = !isToMe && includes(document.activeElement || e.relatedTarget);
        !isToMe && !isToMeInside && (await hide(WUPPopup.HideCases.onFocusOut, e));
        if (!openedEl) {
          openedByHover = false;
        }
      }
    };

    onShowCallbacks.push(() => onFocusLost(t, blur, { debounceMs: opts.focusDebounceMs }));
    const a = document.activeElement;
    if (!opts.skipAlreadyFocused && (a === t || (a instanceof HTMLElement && t.contains(a)))) {
      // isAlreadyFocused
      onFocused(new FocusEvent("focus"));
      preventClickAfterFocus = false;
    }
  }

  return { stopListen, hide, show };
}

popupListen.$defaults = {
  showCase: WUPPopup.ShowCases.onClick,
  hoverShowTimeout: 200,
  hoverHideTimeout: 500,
};
