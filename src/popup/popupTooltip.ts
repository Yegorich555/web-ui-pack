import { PopupOpenCases } from "./popupElement.types";
import { PopupPlacements } from "./popupPlacements";
import onEvent from "../helpers/onEvent";

interface TooltipReg extends Pick<WUP.Popup.TooltipOptions, "className" | "showOnFocus"> {
  attr: string;
  delayMs: number;
  popup: Partial<WUP.Popup.Options>;
}
/** Registered options of `WUPPopupElement.$useTooltip()`: the 1st one matched by attr is applied */
const tooltipRegs: TooltipReg[] = [];
/** Single set of listeners shared by all `WUPPopupElement.$useTooltip()` calls */
let tooltipLst: { hide: (reg: TooltipReg) => void; dispose: () => void } | undefined;

/** Listen for events to show tooltip for elements with attrs from {@link tooltipRegs} */
function listenTooltips(): NonNullable<typeof tooltipLst> {
  let t: HTMLElement | null = null; // current target; only 1 tooltip at once
  let r: TooltipReg | undefined; // options related to current target
  let p: HTMLElementTagNameMap["wup-popup"] | undefined;
  let tid: ReturnType<typeof setTimeout> | undefined; // timeout to show (before popup is rendered) or to hide (after)
  let isHover = false;
  let isFocus = false;

  const reset = (): void => {
    if (!t) return; // nothing to reset
    clearTimeout(tid);
    t = null;
    r = undefined;
    isHover = false;
    isFocus = false;
    const pp = p;
    p = undefined;
    pp?.$close().finally(() => pp.remove());
  };

  /** Wait for delay before show tooltip for new target */
  const init = (el: HTMLElement, reg: TooltipReg): void => {
    reset();
    t = el;
    r = reg;
    tid = setTimeout(show, reg.delayMs);
  };

  /** Returns whether element is target or tooltip itself */
  const isOwn = (el: EventTarget): boolean => el === t || (!!p && (el === p || el === p.$refArrow));

  /** Returns text of elements pointed by [aria-describedby]; so many targets can refer to a single element with the same text */
  const getDescription = (el: HTMLElement): string | undefined =>
    el
      .getAttribute("aria-describedby")
      ?.split(" ")
      .map((id) => document.getElementById(id)?.textContent)
      .filter((s) => s)
      .join(" ");

  const show = (): void => {
    const text = t!.getAttribute(r!.attr) || getDescription(t!) || t!.getAttribute("aria-label");
    if (!text || !t!.isConnected) {
      reset();
      return;
    }

    p = document.createElement("wup-popup");
    if (r!.className) p.className = r!.className;
    p.setAttribute("tooltip", ""); // to apply tooltip styles
    p.$options.placement = [PopupPlacements.$top.$start];
    p.$options.offset = [4, 4];
    Object.assign(p.$options, r!.popup);
    p.$options.openCase = PopupOpenCases.onInit;
    p.$options.target = t;
    p.textContent = text; // WARN: textContent (not innerHTML) otherwise it is open to XSS
    document.body.appendChild(p);
  };

  const opts = { passive: true, capture: true };
  const rst = [
    // pointerenter is fired for each element in hierarchy (for touch also) in opposite to touchstart
    onEvent(
      document,
      "pointerenter",
      (e) => {
        const el = e.target as HTMLElement;
        if (isOwn(el)) {
          isHover = true;
          p && clearTimeout(tid); // pointer is moved from target to tooltip or back => cancel hiding
          return;
        }
        const reg = el.hasAttribute && tooltipRegs.find((a) => el.hasAttribute(a.attr));
        if (reg) {
          init(el, reg);
          isHover = true;
        }
      },
      opts
    ),
    // pointerleave doesn't bubble but capture-listener gets it from children also => compare target
    onEvent(
      document,
      "pointerleave",
      (e) => {
        if (!isOwn(e.target)) return;
        isHover = false;
        if (isFocus) return; // visible until focusout
        if (p) {
          clearTimeout(tid);
          tid = setTimeout(reset, p.$options.hoverCloseTimeout); // wait for user moves pointer over tooltip
        } else reset();
      },
      opts
    ),
    onEvent(document, "keydown", (e) => e.key === "Escape" && reset(), opts),
    // mouse & pen: pressing hides tooltip; touch: tooltip is visible during the long-press
    onEvent(document, "pointerdown", (e) => e.pointerType !== "touch" && reset(), opts),
    // touch is released or turned into scroll
    onEvent(document, "pointerup", reset, opts),
    onEvent(document, "pointercancel", reset, opts),
    // "click" can be fired without pointerdown (by SpaceDown on button)
    onEvent(document, "click", reset, opts),
    onEvent(
      document,
      "focusin",
      (e) => {
        const el = e.target as HTMLElement;
        const reg = tooltipRegs.find((a) => a.showOnFocus && el.hasAttribute(a.attr));
        if (!reg || !el.matches(":focus-visible")) return; // skip focus by pointer
        el !== t && init(el, reg);
        isFocus = true;
        p && clearTimeout(tid); // cancel hiding after pointerleave
      },
      opts
    ),
    onEvent(
      document,
      "focusout",
      (e) => {
        if (e.target !== t) return;
        isFocus = false;
        !isHover && reset();
      },
      opts
    ),
  ];

  return {
    hide: (reg) => reg === r && reset(),
    dispose: () => {
      reset();
      rst.forEach((f) => f());
    },
  };
}

/** Listen for events to show tooltip for elements with pointed attr; see `WUPPopupElement.$useTooltip()` */
export default function useTooltip(options?: WUP.Popup.TooltipOptions): { dispose: () => void } {
  const { delayMs, className, showOnFocus, attr, ...popup } = options ?? {};
  const reg: TooltipReg = { attr: attr || "w-tooltip", delayMs: delayMs ?? 1000, className, showOnFocus, popup };
  tooltipRegs.push(reg);
  if (!tooltipLst) tooltipLst = listenTooltips();

  return {
    dispose: () => {
      const i = tooltipRegs.indexOf(reg);
      if (i === -1) return; // already disposed
      tooltipRegs.splice(i, 1);
      tooltipLst!.hide(reg);
      if (!tooltipRegs.length) {
        tooltipLst!.dispose();
        tooltipLst = undefined;
      }
    },
  };
}
