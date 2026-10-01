import WUPBaseElement, { AttributeMap, AttributeTypes } from "./baseElement";
import { px2Number, styleTransform } from "./helpers/styleHelpers";
import { getOffset } from "./popup/popupPlacements";

const tagName = "wup-spin";
declare global {
  namespace WUP.Spin {
    interface Options {
      /** Place inside parent as inline-block otherwise overflow target in the center (`position: relative` is not required);
       * @defaultValue false */
      inline: boolean;
      /** Allow to reduce size to fit parent (for max-size change css-var --spin-size)
       * @defaultValue `auto` => `false` when inline:true, `true` when inline:false */
      fit: boolean | "auto";
      /** Virtual padding of parentElement [top, right, bottom, left] or [top/bottom, right/left] in px
       * @defaultValue [4,4] */
      overflowOffset: [number, number, number, number] | [number, number];
      /** Allow to create shadowBox to partially hide target (only for `inline: false`)
       * @defaultValue true */
      overflowFade: boolean;
      /** Anchor element that need to overflow by spinner; ignored if option `inline='true'`
       * @defaultValue `auto`: parentElement */
      overflowTarget: HTMLElement | "auto";
    }
    interface JSXProps extends WUP.Base.OnlyNames<Options> {
      "w-inline"?: boolean | "";
      "w-fit"?: boolean | "" | "auto";
      /** Virtual padding of parentElement [top, right, bottom, left] or [top/bottom, right/left] in px;
       * * Point Global reference to object with array
       * @example
       * ```js
       * window.someObj = [...];
       * <wup-spin w-overflowoffset="window.someObj"></wup-spin>
       * ```
       * @defaultValue [4,4] */
      "w-overflowOffset"?: string;
      "w-overflowFade"?: boolean | "";
      /** Anchor element that need to overflow by spinner
       * * Point querySelector to related element
       * @example
       * ```html
       * <div id="me"></div>
       * <wup-spin w-overflowTarget="#me"></wup-spin>
       * ```
       * @defaultValue `auto`: parentElement */
      "w-overflowTarget"?: string;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPSpinElement; // add element to document.createElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** Flexible animated element with ability to place over target element without position relative
       * @see {@link WUPSpinElement} */
      [tagName]: WUP.Base.ReactHTML<WUPSpinElement> & WUP.Spin.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Flexible animated element with ability to place over target element without position relative
       * @see {@link WUPSpinElement} */
      [tagName]: HTMLAttributes<WUPSpinElement> & WUP.Spin.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Flexible animated element with ability to place over target element without position relative
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/spin}
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
 *  <wup-spin w-inline="false" w-fit="true" w-overflowfade="true"></wup-spin>
 *  <!-- Inline + fit to parent -->
 *  <wup-spin w-inline w-fit></wup-spin>
 *  <!-- OR; it's equal to <wup-spin w-inline="false" w-fit="true" w-overflowfade="false"></wup-spin> -->
 *  <wup-spin w-overflowfade="false"></wup-spin>
 * </button>
 * ``` */
export default class WUPSpinElement<
  TOptions extends WUP.Spin.Options = WUP.Spin.Options
> extends WUPBaseElement<TOptions> {
  #ctr = this.constructor as typeof WUPSpinElement;

  static get $styleRoot(): string {
    return "";
  }

  /* c8 ignore next 3 */
  /* istanbul ignore next 3 */
  static get $styleApplied(): string {
    return "";
  }

  static get $style(): string {
    return `${super.$style} ${this.$styleApplied}`; // WARN: spinElement.scss is injected after super.$style via stylesLoader.js
  }

  static get mappedAttributes(): Record<string, AttributeMap> {
    const m = super.mappedAttributes;
    m.fit.type = AttributeTypes.bool;
    m.overflowtarget.type = AttributeTypes.selector;
    return m;
  }

  static $defaults: WUP.Spin.Options = {
    overflowOffset: [4, 4],
    overflowFade: true,
    overflowTarget: "auto",
    inline: false,
    fit: "auto",
  };

  /** Used to clone defaults to options on init; override it to clone  */
  static override cloneDefaults<T extends Record<string, any>>(): T {
    const d = super.cloneDefaults() as WUP.Spin.Options;
    d.overflowOffset = [...d.overflowOffset];
    return d as unknown as T;
  }

  static _itemsCount = 1;

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
        this.#prevRect = this.updatePosition();
        // possible if hidden by target-remove
        this.#frameId = window.requestAnimationFrame(goUpdate);
      };
      goUpdate();
    } else {
      this.style.transform = "";
      this.style.position = "";
      this.$refFade?.remove();
      this.$refFade = undefined;

      if (this.isFitParent) {
        const goUpdate = (): void => {
          this.style.display = "none";
          const p = this.parentElement as HTMLElement;
          const r = { width: p.clientWidth, height: p.clientHeight, left: 0, top: 0 };
          this.style.display = "";
          if (this.#prevRect && this.#prevRect.width === r.width && this.#prevRect.height === r.height) {
            return;
          }

          this.style.cssText = ""; // otherwise getPropertyValue is wrong
          const ps = getComputedStyle(p);
          const { paddingTop, paddingLeft, paddingBottom, paddingRight } = ps;
          const innW = r.width - px2Number(paddingLeft) - px2Number(paddingRight);
          const innH = r.height - px2Number(paddingTop) - px2Number(paddingBottom);
          let sz = Math.min(innH, innW);
          sz -= sz % 2; // 17px => 16px: Safari issue > placed wrong with odd width
          const varItemSize = ps.getPropertyValue("--spin-item-size");
          const scale = Math.min(sz / this.clientWidth, 1);
          // styleTransform(this, "scale", scale === 1 ? "" : `${scale}`); // wrong because it doesn't affect on the layout size
          // this.style.zoom = scale; // zoom isn't supported by FireFox
          this.style.cssText = `--spin-size: ${sz}px; --spin-item-size: calc(${varItemSize} * ${scale})`;
          // this.style.width = `${sz}px`;
          // this.style.height = `${sz}px`;

          this.#prevRect = r;
          this.#frameId = window.requestAnimationFrame(goUpdate);
        };
        goUpdate();
      }
    }
  }

  /** Returns value based on `$options.fit` */
  get isFitParent(): boolean {
    const o = this._opts.fit;
    return o === "auto" ? !this._opts.inline : o;
  }

  /** Returns target element based on $options */
  get target(): HTMLElement {
    const trg = this._opts.overflowTarget;
    return this._opts.inline || trg === "auto" || !trg ? this.parentElement! : trg;
  }

  /** Returns whether exists parent with position relative */
  get hasRelativeParent(): boolean {
    const p = this.offsetParent;
    return !!p && getComputedStyle(p).position === "relative";
  }

  #prevRect?: Pick<DOMRect, "width" | "height" | "top" | "left">;
  #frameId?: number;
  /** Update position. Call this method in cases when you changed options */
  protected updatePosition(): Pick<DOMRect, "width" | "height" | "top" | "left"> | undefined {
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
    const scale = this.isFitParent ? Math.min(Math.min(h, w) / this.clientWidth, 1) : 1;

    const left = Math.round(r.left + offset.left + (w - this.clientWidth) / 2);
    const top = Math.round(r.top + offset.top + (h - this.clientHeight) / 2);
    styleTransform(this, "translate", `${left}px,${top}px`); // WARN: parent transform not affects on element how it works in popup
    styleTransform(this, "scale", scale === 1 ? "" : `${scale}`);

    if (this.$refFade) {
      styleTransform(this.$refFade, "translate", `${r.left - left}px,${r.top - top}px`);
      styleTransform(this.$refFade, "scale", scale === 1 || !scale ? "" : `${1 / scale}`);
      this.$refFade.style.width = `${r.width}px`;
      this.$refFade.style.height = `${r.height}px`;
    }

    return r;
  }
}

spinUseRing(WUPSpinElement);
customElements.define(tagName, WUPSpinElement);

/** Basic function to change spinner-style
 * @param style css-string OR getter; string with (@wup-include mixinName) is replaced with css of the mixin from spinElement.scss via stylesLoader.js */
export function spinSetStyle(
  cls: typeof WUPSpinElement<any>,
  itemsCount: number,
  style: string | (() => string)
): void {
  cls._itemsCount = itemsCount;
  Object.defineProperty(cls, "$styleApplied", {
    configurable: true,
    get: typeof style === "function" ? style : () => style,
  });
}

/** Apply on class to change spinner-style */
export function spinUseRing(cls: typeof WUPSpinElement<any>): void {
  spinSetStyle(cls, 1, "@wup-include useRing");
}

/** Apply on class to change spinner-style */
export function spinUseDualRing(cls: typeof WUPSpinElement<any>): void {
  spinSetStyle(cls, 1, "@wup-include useDualRing");
}

/** Apply on class to change spinner-style */
export function spinUseTwinDualRing(cls: typeof WUPSpinElement<any>): void {
  spinSetStyle(cls, 2, "@wup-include useTwinDualRing");
}

/** Apply on class to change spinner-style */
export function spinUseRoller(cls: typeof WUPSpinElement<any>): void {
  spinSetStyle(cls, 4, "@wup-include useRoller"); // WARN: itemsCount must be equal to $cnt of the mixin
}

/** Apply on class to change spinner-style */
export function spinUseDotRoller(cls: typeof WUPSpinElement<any>): void {
  spinSetStyle(cls, 7, "@wup-include useDotRoller"); // WARN: itemsCount must be equal to $cnt of the mixin
}

/** Apply on class to change spinner-style */
export function spinUseDotRing(cls: typeof WUPSpinElement<any>): void {
  spinSetStyle(cls, 10, "@wup-include useDotRing"); // WARN: itemsCount must be equal to $cnt of the mixin
}

/** Apply on class to change spinner-style */
export function spinUseSpliceRing(cls: typeof WUPSpinElement<any>): void {
  spinSetStyle(cls, 12, "@wup-include useSpliceRing"); // WARN: itemsCount must be equal to $cnt of the mixin
}

/** Apply on class to change spinner-style */
export function spinUseHash(cls: typeof WUPSpinElement<any>): void {
  spinSetStyle(cls, 2, "@wup-include useHash");
}
