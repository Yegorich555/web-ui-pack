import WUPBaseElement from "./baseElement";

const tagName = "wup-circle";

declare global {
  namespace WUP.Circle {
    interface Defaults {}
    interface Options extends Defaults {
      /** Percentage of circle */
      value: number;
    }
    interface Attributes {
      /** Percentage of circle */
      value?: string;
    }
    interface JSXProps<C = WUPCircleElement> extends WUP.Base.JSXProps<C> {
      value?: string | number;
    }
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPCircleElement; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUP.Circle.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

/** Arc chart based on SVG */
export default class WUPCircleElement extends WUPBaseElement {
  #ctr = this.constructor as typeof WUPCircleElement;

  static get observedOptions(): Array<keyof WUP.Circle.Options> {
    return ["value"];
  }

  static get observedAttributes(): Array<LowerKeys<WUP.Circle.Attributes>> {
    return ["value"];
  }

  static get $styleRoot(): string {
    return `:root {
          --circle-1: #eee;
          --circle-2: #ff9f00;
          --circle-w: 8%;
          --circle-2-w: var(--circle-w);
          --circle-label: var(--circle-2);
        }`;
  }

  // todo move keyFrame into mediaquery
  static get $style(): string {
    return `${super.$style}
      :host {
        display: block;
        position: relative;
      }
      :host strong {
        display: block;
        position: absolute;
        transform: translate(-50%,-50%);
        top: 50%; left: 50%;
        font-size: larger;
        color: var(--circle-label);
      }
      :host path {
          // fill: none;
          stroke: var(--circle-2);
          stroke-width: 1;
      }
      :host path+path {
        // fill: none;
        stroke: green;
      }
      // :host path:first-child {
      //   fill: none;
      //   stroke: var(--circle-1);
      //   stroke-width: var(--circle-w);
      // }
      // :host path+path {
      //   fill: none;
      //   stroke: var(--circle-2);
      //   stroke-width: var(--circle-2-w);
      //   stroke-linecap: round;
      //   animation: progress 1s ease-out forwards;
      // }
      // @keyframes progress {
      //   0% {
      //     stroke-dasharray: 0 100;
      //   }
      // }
    `;
  }

  static $defaults: WUP.Circle.Defaults = {};
  $options: WUP.Circle.Options = {
    ...this.#ctr.$defaults,
    value: 0,
  };

  protected override _opts = this.$options;

  protected override gotChanges(propsChanged: Array<keyof WUP.Circle.Options> | null): void {
    super.gotChanges(propsChanged);
    if (!propsChanged || propsChanged.includes("value")) {
      const av = Number.parseInt(this.getAttribute("value") ?? "", 10);
      this._opts.value = Number.isNaN(av) ? this._opts.value || 0 : av;
      console.warn(this._opts.value);
      // this.renderValue();
    }
  }

  $refPathVal = document.createElementNS("http://www.w3.org/2000/svg", "path");
  $refLabel = document.createElement("strong");
  protected override gotRender(): void {
    // example: https://medium.com/@pppped/how-to-code-a-responsive-circular-percentage-chart-with-svg-and-css-3632f8cd7705
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");

    const dataPath = "M50 0 a 50 50 0 0 1 0 100 a 50 50 0 0 1 0 -100";
    // render full circle
    const pathFull = svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    pathFull.setAttribute("d", dataPath);

    // render valued Arc
    svg.appendChild(this.$refPathVal);
    this.renderValue();

    this.appendChild(this.$refLabel);
    this.appendChild(svg);
  }

  drawArc(options: { size: number; angleFrom: number; angleTo: number; corner: number; width: number }): string {
    const cornerR = 0; // (options.corner * options.width) / 100;
    const d = options.size;
    const r = d / 2;

    const [x, y] = this.rotate(r, r, r, 0, options.angleFrom);
    const [x2, y2] = this.rotate(r, r, x, y, options.angleTo - options.angleFrom);

    const str = `M${x} ${y} A${r} ${r} 0 0 1 ${x2} ${y2}`;
    return str;
  }

  rotate(cx: number, cy: number, x: number, y: number, angle: number): [number, number] {
    const rad = (Math.PI / 180) * angle;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const nx = cos * (x - cx) - sin * (y - cy) + cx;
    const ny = cos * (y - cy) + sin * (x - cx) + cy;
    return [nx, ny];
  }

  // /** Update rendered part depended on value */
  protected renderValue(): void {
    const { value } = this._opts;
    this.$refLabel.textContent = `${value}%`; // todo add options format
    // todo recalc value to angleTo
    const dp = this.drawArc({ size: 100, angleFrom: 0, angleTo: 90, corner: 50, width: 10 });
    this.$refPathVal.setAttribute("d", dp);
  }
}

customElements.define(tagName, WUPCircleElement);
