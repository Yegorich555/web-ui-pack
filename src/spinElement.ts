/* eslint-disable no-use-before-define */
import WUPBaseElement, { WUP } from "./baseElement";
import { styleTransform } from "./helpers/styleHelpers";

declare global {
  namespace WUPSpin {
    interface Defaults {
      /** Place inside parent as inline-block or overflow target in the center (`position: relative` not required);
       * @defaultValue false */
      inline?: boolean;
      /** Virtual padding of parentElement
       *  [top, right, bottom, left] or [top/bottom, right/left] in px
       * @defaultValue [4,4] */
      overflowOffset: [number, number, number, number] | [number, number];
      /** Allow to reduce size if it's bigger than parent (for max-size change css-var --spin-size)
       * @defaultValue true */
      overflowReduceByTarget: boolean;
    }
    interface Options extends Defaults {
      /** Anchor element that need to oveflow by spinner, by default it's parentElement  */
      overflowTarget?: HTMLElement | null;
    }
    interface JSXProps<T extends WUPSpinElement> extends WUP.JSXProps<T> {
      /** Place inside parent as inline-block or overflow target in the center (`position: relative` not required);
       * @defaultValue false */
      inline?: boolean;
    }
  }
}

/** Flexible animated element with ability to place over target element without position relative */
export default class WUPSpinElement extends WUPBaseElement {
  #ctr = this.constructor as typeof WUPSpinElement;

  static observedOptions = new Set<keyof WUPSpin.Options>(["inline", "overflowTarget", "overflowOffset"]);
  static get observedAttributes(): Array<keyof WUPSpin.Options> {
    return ["inline"];
  }

  static get $styleRoot(): string {
    return `:root {
          --spin-1: #ffa500;
          --spin-2: #fff;
          --spin-speed: 1s;
          --spin-size: 2em;
          --spin-width: calc(var(--spin-size) / 6);
        }`;
  }

  static get $style(): string {
    return `
      :host,
      :host > div {
        z-index: 100;
        display: inline-block;
        width: var(--spin-size);
        height: var(--spin-size);
        box-sizing: border-box;
        border-radius: 50%;
        top:0; left:0;
        pointer-events: none;
      }
      :host > div {
        border: var(--spin-width) solid var(--spin-1);
        border-top-color: var(--spin-2);
        animation: WUP-SPIN-1 var(--spin-speed) linear infinite;
        width: 100%; height: 100%;
      }
      @keyframes WUP-SPIN-1 {
        100% { transform: rotate(360deg); }
      }`;
  }

  static $defaults: WUPSpin.Defaults = {
    overflowReduceByTarget: true,
    overflowOffset: [4, 4],
  };

  $options: WUPSpin.Options = {
    ...this.#ctr.$defaults,
  };

  protected override _opts = this.$options;

  $refSpin = document.createElement("div");

  /** Force to update position (when $options.oveflow is true) */
  $refresh() {
    this.gotChanges([]);
  }

  protected connectedCallback() {
    this.style.display = "none"; // required to prevent unexpected wrong-render (tied with empty timeout)
    super.connectedCallback();
  }

  protected override gotRender() {
    this.appendChild(this.$refSpin);
  }

  protected override gotReady() {
    this.setAttribute("aria-label", "Loading. Please wait");
    super.gotReady();
  }

  protected override gotChanges(propsChanged: Array<keyof WUPSpin.Options> | null) {
    super.gotChanges(propsChanged);

    this._opts.inline = this.getBoolAttr("inline", this._opts.inline);

    this.style.display = "";
    this.#prevRect = undefined;
    this.#frameId && window.cancelAnimationFrame(this.#frameId);
    this.#frameId = undefined;

    if (!this._opts.inline) {
      this.style.position = "absolute";
      const goUpdate = () => {
        this.#prevRect = this.#updatePosition();
        // possible if hidden by target-remove
        this.#frameId = window.requestAnimationFrame(goUpdate);
      };
      goUpdate();
    } else {
      this.style.transform = "";
    }
  }

  get target(): HTMLElement {
    return this._opts.overflowTarget || (this.parentElement as HTMLElement);
  }

  get hasRelativeParent(): boolean {
    return !(!this.offsetParent || getComputedStyle(this.offsetParent as HTMLElement).position !== "relative");
  }

  #prevRect?: Pick<DOMRect, "width" | "height" | "top" | "left">;
  #frameId?: number;
  /** Update position. Call this method in cases when you changed options */
  #updatePosition = (): Pick<DOMRect, "width" | "height" | "top" | "left"> | undefined => {
    const trg = this.target;
    // possible when target removed via set innerHTML (in this case remove-hook doesn't work)
    if (!trg.isConnected) {
      return undefined;
    }

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
    const size = Math.min(h, w);
    const scale = this._opts.overflowReduceByTarget ? Math.min(size / this.clientWidth, 1) : 1;

    const left = r.left + offset.left + (w - this.clientWidth) / 2;
    const top = r.top + offset.top + (h - this.clientHeight) / 2;
    styleTransform(this, "translate", `${left}px,${top}px`);
    styleTransform(this, "scale", scale === 1 ? "" : `${scale}`);

    // todo oveflow-shadow here ???

    return r;
  };
}

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

// setTimeout(() => {
//   document.querySelector("main")?.scrollTo({ top: 60 });
// }, 300);

// test case when target has position:relative
// test case when target.parent has position:relative
// test case when no parent with position:relative
