import WUPBaseElement from "./baseElement";
import objectClone from "./helpers/objectClone";
import { px2Number, styleTransform } from "./helpers/styleHelpers";
import { getOffset } from "./popup/popupPlacements";

declare global {
  namespace WUP.Spin {
    interface Defaults {
      /** Place inside parent as inline-block otherwise overflow target in the center (`position: relative` is not required);
       * @defaultValue false */
      inline?: boolean;
      /** Virtual padding of parentElement [top, right, bottom, left] or [top/bottom, right/left] in px
       * @defaultValue [4,4] */
      overflowOffset: [number, number, number, number] | [number, number];
      /** Allow to create shadowBox to partially hide target (only for `inline: false`)
       * @defaultValue true */
      overflowFade: boolean;
      /** Allow to reduce size to fit parent (for max-size change css-var --spin-size)
       * @defaultValue false for inline:true, true for inline:false */
      fit?: boolean;
    }
    interface Options extends Defaults {
      /** Anchor element that need to oveflow by spinner, by default it's parentElement  */
      overflowTarget?: HTMLElement | null;
    }
    interface Attributes {
      /** Place inside parent as inline-block or overflow target in the center (`position: relative` isnot  required);
       * @defaultValue false */
      inline?: boolean | "";
      /** Allow to create shadowBox to partially hide target (only for `inline: false`)
       * @defaultValue true */
      overflowFade?: boolean | "";
      /** Allow to reduce size to fit parent (for max-size change css-var --spin-size)
       * @defaultValue false for inline:true, true for inline:false */
      fit?: boolean | "";
    }
    interface JSXProps<T extends WUPSpinElement> extends WUP.Base.JSXProps<T>, Attributes {}
  }
}

/** Flexible animated element with ability to place over target element without position relative
 * @tutorial Troubleshooting
 * * when used several spin-types at once: define `--spin-1` & `--spin-2` colors manually per each spin-type
 * @example
 * JS/TS
 * ```js
 * import WUPSpinElement, { spinUseTwinDualRing } from "web-ui-pack/spinElement";
 * spinUseTwinDualRing(WUPSpinElement); // to apply another style
 *
 * const el = document.body.appendChild(document.createElement('wup-spin'));
 * el.$options.inline = false;
 * el.$options.overflowTarget = document.body.appendChild(document.createElement('button'))
 * ```
 * HTML
 * ```html
 * <button> Loading...
 *  <!-- Default; it's equal to <wup-spin></wup-spin>-->
 *  <wup-spin inline="false" fit="true" overflowfade="true"></wup-spin>
 *  <!-- Inline + fit to parent -->
 *  <wup-spin inline fit></wup-spin>
 *  <!-- OR; it's equal to <wup-spin inline="false" fit="true" overflowfade="false"></wup-spin> -->
 *  <wup-spin overflowfade="false"></wup-spin>
 * </button>
 * ```
 */
export default class WUPSpinElement extends WUPBaseElement {
  #ctr = this.constructor as typeof WUPSpinElement;

  static get observedOptions(): Array<keyof WUP.Spin.Options> {
    return ["inline", "overflowTarget", "overflowOffset", "overflowFade", "fit"];
  }

  static get observedAttributes(): Array<LowerKeys<WUP.Spin.Attributes>> {
    return ["inline", "overflowfade", "fit"];
  }

  static get $styleRoot(): string {
    return `:root {
          --spin-1: #ffa500;
          --spin-2: #fff;
          --spin-speed: 1.2s;
          --spin-size: 3em;
          --spin-item-size: calc(var(--spin-size) / 8);
          --spin-fade: #ffffff6e;
        }`;
  }

  /* c8 ignore next 3 */
  /* istanbul ignore next 3 */
  static get $styleApplied(): string {
    return "";
  }

  static get $style(): string {
    return `${super.$style}
      @keyframes WUP-SPIN-1 {
        100% { transform: rotate(360deg); }
      }
      :host {
        z-index: 100;
        width: var(--spin-size);
        height: var(--spin-size);
        top:0; left:0;
        pointer-events: none;
      }
      :host,
      :host div {
        display: inline-block;
        box-sizing: border-box;
        border-radius: 50%;
      }
      :host div {
        animation: WUP-SPIN-1 var(--spin-speed) linear infinite;
        width: 100%; height: 100%;
        left:0; top:0;
      }
      :host div[fade] {
         display: block;
         position: absolute;
         left:0; top:0;
         animation: none;
         border: none;
         border-radius: var(--border-radius);
         transform: none;
         z-index: -1;
         background: var(--spin-fade);
      }
      :host div[fade]::after { content: none; }
      ${this.$styleApplied}`;
  }

  static $defaults: WUP.Spin.Defaults = {
    overflowOffset: [4, 4],
    overflowFade: true,
  };

  static _itemsCount = 1;

  $options: WUP.Spin.Options = objectClone(this.#ctr.$defaults);
  protected override _opts = this.$options;

  /** Force to update position (when options changed) */
  $refresh(): void {
    this.gotChanges([]);
  }

  protected override connectedCallback(): void {
    this.style.display = "none"; // required to prevent unexpected wrong-render (tied with empty timeout)
    super.connectedCallback();
  }

  protected override gotRemoved(): void {
    super.gotRemoved();
    this.#frameId && window.cancelAnimationFrame(this.#frameId);
    this.#frameId = undefined;
    if (this.#prevTarget?.isConnected) {
      // otherwise removing attribute doesn't make sense
      this.#prevTarget.removeAttribute("aria-busy");
      this.#prevTarget = undefined;
    }
  }

  protected override gotRender(): void {
    for (let i = 0; i < this.#ctr._itemsCount; ++i) {
      this.appendChild(document.createElement("div"));
    }
  }

  protected override gotReady(): void {
    this.setAttribute("aria-label", "Loading. Please wait");
    super.gotReady();
  }

  #prevTarget?: HTMLElement;
  $refFade?: HTMLDivElement;
  protected override gotChanges(propsChanged: Array<keyof WUP.Spin.Options> | null): void {
    super.gotChanges(propsChanged);

    this._opts.inline = this.getBoolAttr("inline", this._opts.inline);
    this._opts.fit = this.getBoolAttr("fit", this._opts.fit ?? !this._opts.inline);
    this._opts.overflowFade = this.getBoolAttr("overflowFade", this._opts.overflowFade);

    this.style.cssText = "";
    this.#prevRect = undefined;
    this.#frameId && window.cancelAnimationFrame(this.#frameId);
    this.#frameId = undefined;

    const nextTarget = this.target;
    if (this.#prevTarget !== nextTarget) {
      this.#prevTarget?.removeAttribute("aria-busy");
      nextTarget.setAttribute("aria-busy", true);
      this.#prevTarget = nextTarget;
    }

    if (!this._opts.inline) {
      if (this._opts.overflowFade && !this.$refFade) {
        this.$refFade = this.appendChild(document.createElement("div"));
        this.$refFade.setAttribute("fade", "");
        const s = getComputedStyle(this.target);
        this.$refFade.style.borderTopLeftRadius = s.borderTopLeftRadius;
        this.$refFade.style.borderTopRightRadius = s.borderTopRightRadius;
        this.$refFade.style.borderBottomLeftRadius = s.borderBottomLeftRadius;
        this.$refFade.style.borderBottomRightRadius = s.borderBottomRightRadius;
      } else if (!this._opts.overflowFade && this.$refFade) {
        this.$refFade.remove();
        this.$refFade = undefined;
      }
      this.style.position = "absolute";
      const goUpdate = (): void => {
        this.#prevRect = this.#updatePosition();
        // possible if hidden by target-remove
        this.#frameId = window.requestAnimationFrame(goUpdate);
      };
      goUpdate();
    } else {
      this.style.transform = "";
      this.style.position = "";
      this.$refFade?.remove();
      this.$refFade = undefined;

      if (this.getBoolAttr("fit", this._opts.fit)) {
        const goUpdate = (): void => {
          this.style.position = "absolute";
          const p = this.parentElement as HTMLElement;
          const r = { width: p.clientWidth, height: p.clientHeight, left: 0, top: 0 };
          this.style.position = "";
          if (this.#prevRect && this.#prevRect.width === r.width && this.#prevRect.height === r.height) {
            return;
          }
          const ps = getComputedStyle(p);
          const { paddingTop, paddingLeft, paddingBottom, paddingRight } = ps;
          const innW = r.width - px2Number(paddingLeft) - px2Number(paddingRight);
          const innH = r.height - px2Number(paddingTop) - px2Number(paddingBottom);
          const sz = Math.min(innH, innW);
          const varItemSize = ps.getPropertyValue("--spin-item-size");
          const scale = Math.min(Math.min(innW, innH) / this.clientWidth, 1);
          // styleTransform(this, "scale", scale === 1 ? "" : `${scale}`); // wrong because it doesn't affect on the layout size
          // this.style.zoom = scale; // zoom isn't supported by FireFox
          this.style.cssText = `--spin-size:${sz}px; --spin-item-size: calc(${varItemSize} * ${scale})`;
          // this.style.width = `${sz}px`;
          // this.style.height = `${sz}px`;

          this.#prevRect = r;
          this.#frameId = window.requestAnimationFrame(goUpdate);
        };
        goUpdate();
      }
    }
  }

  get target(): HTMLElement {
    return (this._opts.inline ? this.parentElement : this._opts.overflowTarget || this.parentElement) as HTMLElement;
  }

  get hasRelativeParent(): boolean {
    const p = this.offsetParent;
    return !!p && getComputedStyle(p).position === "relative";
  }

  #prevRect?: Pick<DOMRect, "width" | "height" | "top" | "left">;
  #frameId?: number;
  /** Update position. Call this method in cases when you changed options */
  #updatePosition = (): Pick<DOMRect, "width" | "height" | "top" | "left"> | undefined => {
    const trg = this.target;
    if (!trg.clientWidth || !trg.clientHeight) {
      this.style.display = "none"; // hide if target is not displayed
      return undefined;
    }
    this.style.display = "";

    const r = { width: trg.offsetWidth, height: trg.offsetHeight, left: trg.offsetLeft, top: trg.offsetTop };
    // when target has position:relative
    if (this.offsetParent === trg) {
      r.top = 0;
      r.left = 0;
    } else if (!this.hasRelativeParent) {
      const { top, left } = trg.getBoundingClientRect();
      r.top = top;
      r.left = left;
    }

    if (
      this.#prevRect &&
      this.#prevRect.top === r.top &&
      this.#prevRect.left === r.left &&
      this.#prevRect.width === r.width &&
      this.#prevRect.height === r.height
    ) {
      return this.#prevRect;
    }

    const offset = getOffset(this._opts.overflowOffset);
    this.style.display = "";

    const w = r.width - offset.left - offset.right;
    const h = r.height - offset.top - offset.bottom;
    const scale = this._opts.fit ? Math.min(Math.min(h, w) / this.clientWidth, 1) : 1;

    const left = Math.round(r.left + offset.left + (w - this.clientWidth) / 2);
    const top = Math.round(r.top + offset.top + (h - this.clientHeight) / 2);
    styleTransform(this, "translate", `${left}px,${top}px`);
    styleTransform(this, "scale", scale === 1 ? "" : `${scale}`);

    if (this.$refFade) {
      styleTransform(this.$refFade, "translate", `${r.left - left}px,${r.top - top}px`);
      styleTransform(this.$refFade, "scale", scale === 1 || !scale ? "" : `${1 / scale}`);
      /* istanbul ignore else */
      if (this.$refFade.clientWidth !== r.width) {
        this.$refFade.style.width = `${r.width}px`;
      }
      /* istanbul ignore else */
      if (this.$refFade.clientWidth !== r.height) {
        this.$refFade.style.height = `${r.height}px`;
      }
    }

    return r;
  };
}

spinUseRing(WUPSpinElement);
const tagName = "wup-spin";
customElements.define(tagName, WUPSpinElement);

declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPSpinElement;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUP.Spin.JSXProps<WUPSpinElement>;
    }
  }
}

/** Basic function to change spinner-style */
export function spinSetStyle(cls: typeof WUPSpinElement, itemsCount: number, getter: () => string): void {
  cls._itemsCount = itemsCount;
  Object.defineProperty(cls, "$styleApplied", {
    configurable: true,
    get: getter,
  });
}

/** Apply on class to change spinner-style */
export function spinUseRing(cls: typeof WUPSpinElement): void {
  spinSetStyle(
    cls,
    1,
    () => `:host div {
        border: var(--spin-item-size) solid var(--spin-1);
        border-top-color: var(--spin-2);
      }`
  );
}

/** Apply on class to change spinner-style */
export function spinUseDualRing(cls: typeof WUPSpinElement): void {
  spinSetStyle(
    cls,
    1,
    () =>
      `:root { --spin-2: transparent; }
       :host div {
         border: var(--spin-item-size) solid;
         border-color: var(--spin-2) var(--spin-1) var(--spin-2) var(--spin-1);
      }`
  );
}

export function spinUseTwinDualRing(cls: typeof WUPSpinElement): void {
  spinSetStyle(
    cls,
    2,
    () =>
      `@keyframes WUP-SPIN-2-2 {
          0% { transform: translate(-50%, -50%) rotate(360deg); }
       }
       :root {
          --spin-2: #b35e03;
          --spin-item-size: max(1px, calc(var(--spin-size) / 12));
       }
       :host { position: relative; }
       :host div:nth-child(1) {
          border: var(--spin-item-size) solid;
          border-color: transparent var(--spin-1) transparent var(--spin-1);
       }
       :host div:nth-child(2) {
          border: var(--spin-item-size) solid;
          border-color: var(--spin-2) transparent var(--spin-2) transparent;
          position: absolute;
          width: calc(100% - var(--spin-item-size) * 3);
          height: calc(100% - var(--spin-item-size) * 3);
          left: 50%; top: 50%;
          transform: translate(-50%,-50%);
          animation: WUP-SPIN-2-2 var(--spin-speed) linear infinite;
       }`
  );
}

/** Apply on class to change spinner-style */
export function spinUseRoller(cls: typeof WUPSpinElement): void {
  const cnt = 4;
  spinSetStyle(cls, cnt, () => {
    let s = "";
    for (let i = 1; i <= cnt - 1; ++i) {
      s += `:host div:nth-child(${i}) { animation-delay: -0.${15 * (cnt - i)}s }
        `;
    }
    return `:host { position: relative; }
            :host div {
              animation-timing-function: cubic-bezier(0.5, 0, 0.5, 1);
              position: absolute;
              border: var(--spin-item-size) solid;
              border-color: var(--spin-1) transparent transparent transparent;
            }
            ${s}`;
  });
}

/** Apply on class to change spinner-style */
export function spinUseDotRoller(cls: typeof WUPSpinElement): void {
  const cnt = 7;
  spinSetStyle(cls, cnt, () => {
    let s = "";
    for (let i = 1; i <= cnt; ++i) {
      s += `:host div:nth-child(${i}) { animation-delay: -${0.036 * i}s; }
            :host div:nth-child(${i})::after { transform: rotate(calc(45deg + var(--spin-step) * ${i - 1})); }
            `;
    }
    return `:root { --spin-step: 24deg; }
            :host { position: relative; }
            :host div {
              animation-timing-function: cubic-bezier(0.5, 0, 0.5, 1);
              position: absolute;
            }
            :host div::after {
              content: " ";
              display: block;
              position: absolute;
              left: 0;
              top: calc(50% - var(--spin-item-size) / 2);
              transform-origin: calc(var(--spin-size) / 2);
              width: var(--spin-item-size);
              height: var(--spin-item-size);
              border-radius: 50%;
              background: var(--spin-1);
            }
            ${s}`;
  });
}

/** Apply on class to change spinner-style */
export function spinUseDotRing(cls: typeof WUPSpinElement): void {
  const cnt = 10;
  spinSetStyle(cls, cnt, () => {
    let s = "";
    for (let i = 1; i <= cnt; ++i) {
      s += `:host div:nth-child(${i})::after { animation-delay: ${0.1 * (i - 1)}s; }
            :host div:nth-child(${i}) { transform: translate(-50%,-50%) rotate(${(360 / cnt) * (i - 1)}deg) }
            `;
    }
    return `@keyframes WUP-SPIN-2 {
              0%,20%,80%,100% { transform: scale(1); background: var(--spin-1) }
              50% { transform: scale(1.4); background: var(--spin-2) }
            }
            :root { --spin-2: #ff5200; }
            :host { position: relative; }
            :host div {
              position: absolute;
              width: calc(100% / 1.4142135623730951);
              height: calc(100% / 1.4142135623730951);
              animation: none;
              top:50%; left:50%;
            }
            :host div::after {
              animation: WUP-SPIN-2 var(--spin-speed) linear infinite;
              content: " ";
              display: block;
              width: var(--spin-item-size);
              height: var(--spin-item-size);
              border-radius: 50%;
              background: var(--spin-1);
            }
            ${s}`;
  });
}

/** Apply on class to change spinner-style */
export function spinUseSpliceRing(cls: typeof WUPSpinElement): void {
  const cnt = 12;
  spinSetStyle(cls, cnt, () => {
    let s = "";
    for (let i = 1; i <= cnt; ++i) {
      s += `:host div:nth-child(${i}) {
                animation-delay: -${0.1 * (cnt - i)}s;
                transform: rotate(${(360 / cnt) * (i - 1)}deg);
              }
            `;
    }
    return `@keyframes WUP-SPIN-3 {
              100% { opacity: 0; background: var(--spin-2); }
            }
            :root { --spin-item-size: calc(var(--spin-size) / 10); }
            :host { position: relative; }
            :host div {
              animation: WUP-SPIN-3 var(--spin-speed) linear infinite;
              position: absolute;
              width: calc(var(--spin-size) / 4);
              height: var(--spin-item-size);
              left: 0;
              top: calc(50% - var(--spin-item-size) / 2);
              transform-origin: calc(var(--spin-size) / 2);
              background: var(--spin-1);
              border-radius: calc(var(--spin-item-size) / 2);
            }
            ${s}`;
  });
}
