import WUPBaseElement, { WUP } from "./baseElement";
import { px2Number, styleTransform } from "./helpers/styleHelpers";

declare global {
  namespace WUPSpin {
    interface Defaults {
      /** Place inside parent as inline-block otherwise overflow target in the center (`position: relative` isnot  required);
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
    interface JSXProps<T extends WUPSpinElement> extends WUP.JSXProps<T> {
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
  }
}
/** Flexible animated element with ability to place over target element without position relative */
export default class WUPSpinElement extends WUPBaseElement {
  #ctr = this.constructor as typeof WUPSpinElement;

  static observedOptions = new Set<keyof WUPSpin.Options>(["inline", "overflowTarget", "overflowOffset"]);
  static get observedAttributes(): Array<keyof WUPSpin.Options> {
    return ["inline", "overflowFade", "fit"];
  }

  static get $styleRoot(): string {
    return `:root {
          --spin-1: #ffa500;
          --spin-2: #fff;
          --spin-speed: 1.2s;
          --spin-size: 3em;
          --spin-item-size: calc(var(--spin-size) / 8);
          --spin-shadow: #ffffff6e;
        }`;
  }

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
         background: var(--spin-shadow);
      }
      :host div[fade]::after { content: none; }
      ${this.$styleApplied}`;
  }

  static $defaults: WUPSpin.Defaults = {
    overflowOffset: [4, 4],
    overflowFade: true,
  };

  static _itemsCount = 1;

  $options: WUPSpin.Options = {
    ...this.#ctr.$defaults,
  };

  protected override _opts = this.$options;

  /** Force to update position (when $options.oveflow is true) */
  $refresh(): void {
    this.gotChanges([]);
  }

  protected override connectedCallback(): void {
    this.style.display = "none"; // required to prevent unexpected wrong-render (tied with empty timeout)
    super.connectedCallback();
  }

  protected override gotRemoved(): void {
    super.gotRemoved();

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
  $refShadow?: HTMLDivElement;
  protected override gotChanges(propsChanged: Array<keyof WUPSpin.Options> | null): void {
    super.gotChanges(propsChanged);

    this._opts.inline = this.getBoolAttr("inline", this._opts.inline);
    this._opts.fit = this.getBoolAttr("inline", this._opts.fit ?? !this._opts.inline);
    this.style.cssText = "";
    this.#prevRect = undefined;
    this.#frameId && window.cancelAnimationFrame(this.#frameId);
    this.#frameId = undefined;

    const nextTarget = this.target;
    if (this.#prevTarget !== nextTarget) {
      this.#prevTarget?.removeAttribute("aria-busy");
      nextTarget.setAttribute("aria-busy", "true");
      this.#prevTarget = nextTarget;
    }

    if (!this._opts.inline) {
      if (this._opts.overflowFade && !this.$refShadow) {
        this.$refShadow = this.appendChild(document.createElement("div"));
        this.$refShadow.setAttribute("fade", "");
        const s = getComputedStyle(this.target);
        this.$refShadow.style.borderTopLeftRadius = s.borderTopLeftRadius;
        this.$refShadow.style.borderTopRightRadius = s.borderTopRightRadius;
        this.$refShadow.style.borderBottomLeftRadius = s.borderBottomLeftRadius;
        this.$refShadow.style.borderBottomRightRadius = s.borderBottomRightRadius;
      } else if (!this._opts.overflowFade && this.$refShadow) {
        this.$refShadow.remove();
        this.$refShadow = undefined;
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
      this.$refShadow?.remove();
      this.$refShadow = undefined;

      if (this.getBoolAttr("fit", false)) {
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
    return !(!this.offsetParent || getComputedStyle(this.offsetParent as HTMLElement).position !== "relative");
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

    const offset = {
      top: this._opts.overflowOffset[0],
      right: this._opts.overflowOffset[1],
      bottom: this._opts.overflowOffset[2] ?? this._opts.overflowOffset[0],
      left: this._opts.overflowOffset[3] ?? this._opts.overflowOffset[1],
    };

    this.style.display = "";

    const w = r.width - offset.left - offset.right;
    const h = r.height - offset.top - offset.bottom;
    const scale = this._opts.fit ? Math.min(Math.min(h, w) / this.clientWidth, 1) : 1;

    const left = r.left + offset.left + (w - this.clientWidth) / 2;
    const top = r.top + offset.top + (h - this.clientHeight) / 2;
    styleTransform(this, "translate", `${left}px,${top}px`);
    styleTransform(this, "scale", scale === 1 ? "" : `${scale}`);

    if (this.$refShadow) {
      styleTransform(this.$refShadow, "translate", `${r.left - left}px,${r.top - top}px`);
      styleTransform(this.$refShadow, "scale", scale === 1 ? "" : `${1 / scale}`);
      if (this.$refShadow.clientWidth !== r.width) {
        this.$refShadow.style.width = `${r.width}px`;
      }
      if (this.$refShadow.clientWidth !== r.height) {
        this.$refShadow.style.height = `${r.height}px`;
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
      [tagName]: WUPSpin.JSXProps<WUPSpinElement>;
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
      `:host { --spin-2: transparent; }
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
       :host {
          --spin-2: #b35e03;
          --spin-item-size: max(1px, calc(var(--spin-size) / 12));
          position: relative;
       }
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
    return `
        :host { position: relative; }
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
    return `
        :host { --spin-step: 24deg; position: relative; }
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
    return `
        @keyframes WUP-SPIN-2 {
            0%,20%,80%,100% { transform: scale(1); background: var(--spin-1) }
            50% { transform: scale(1.4); background: var(--spin-2) }
        }
        :host {
          --spin-2: #ff5200;
          position: relative;
         }
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
    return `
        @keyframes WUP-SPIN-3 {
          100% { opacity: 0; background: var(--spin-2); }
        }
        :host {
          --spin-item-size: calc(var(--spin-size) / 10);
          position: relative;
         }
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

// test case when target has position:relative
// test case when target.parent has position:relative
// test case when no parent with position:relative
