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
      :host path:first-child {
        fill: none;
        stroke: var(--circle-1);
        stroke-width: var(--circle-w);
      }
      :host path+path {
        fill: none;
        stroke: var(--circle-2);
        stroke-width: var(--circle-2-w);
        stroke-linecap: round;
        animation: progress 1s ease-out forwards;
      }
      @keyframes progress {
        0% {
          stroke-dasharray: 0 100;
        }
      }
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
      this.renderValue();
    }
  }

  $refPathVal = document.createElementNS("http://www.w3.org/2000/svg", "path");
  $refLabel = document.createElement("strong");
  protected override gotRender(): void {
    // example: https://medium.com/@pppped/how-to-code-a-responsive-circular-percentage-chart-with-svg-and-css-3632f8cd7705
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 36 36");

    // todo it must depend on css circle-size
    const dataPath = "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831";
    // render full circle
    const pathFull = svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    pathFull.setAttribute("d", dataPath);

    // render valued Arc
    const pathVal = svg.appendChild(this.$refPathVal);
    pathVal.setAttribute("d", dataPath);
    this.renderValue();

    this.appendChild(this.$refLabel);
    this.appendChild(svg);

    // WARN: custom-border radius with blur-filter works poor on different sizes
    // const nofilter = !!this.getAttribute("nofilter");
    // if (!nofilter) {
    //   // to make borders custom rounded need svg-filter: https://stackoverflow.com/questions/71639206/is-there-a-way-to-make-svg-icon-path-edges-partially-rounded-using-css
    //   // https://codepen.io/t_afif/pen/jOMZwLa
    //   pathVal.setAttribute("filter", "url(#round)");

    //   const strokeWidth = 2.8; // todo get from css
    //   const dev = 0.3 * strokeWidth;
    //   const multi = dev * 10; // *3 for sm, *10 fo lg: https://stackoverflow.com/questions/36781067/svg-fegaussianblur-correlation-between-stddeviation-and-size
    //   svg.insertAdjacentHTML(
    //     "beforeend",
    //     `<filter id="round">
    //       <feGaussianBlur in="SourceGraphic" stdDeviation="${0.5}" result="blur" />
    //       <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0
    //       ${strokeWidth * multi} -${strokeWidth * (multi / 2)}" result="goo" />
    //       <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
    //   </filter>`
    //   );
    // }
  }

  /** Update rendered part depended on value */
  protected renderValue(): void {
    const { value } = this._opts;
    this.$refLabel.textContent = `${value}%`; // todo add options format
    this.$refPathVal.setAttribute("stroke-dasharray", `${value}, 100`);
  }
}

customElements.define(tagName, WUPCircleElement);
