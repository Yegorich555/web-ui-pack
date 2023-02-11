import WUPBaseElement from "./baseElement";
import { animate } from "./helpers/animate";
import { mathScaleValue } from "./helpers/math";

const tagName = "wup-circle";

declare global {
  namespace WUP.Circle {
    interface Defaults {
      /** Width of each segment; expected 1..100 (perecentage)
       * @defaultValue 10 */
      width: number;
      /** Border/corner radius of each segment; expected 0..0.5 where 0.5 == 50% of `$options.wdith`
       * @defaultValue 0.25 */
      corner: number;
      /** Enable background circle
       * @defaultValue true */
      back: boolean;
      /** Angle from that rendering is started -360..360 (degrees)
       * @defaultValue 0 */
      from: number;
      /** Angle from that rendering is started -360..360 (degrees)
       * @defaultValue 360 */
      to: number;
      /** Min possible value that fits `options.from`
       * @defaultValue 0 */
      min: number;
      /** Max possible value that fits `options.to`
       * @defaultValue 100 */
      max: number;
      /** Space between segments; expected 0...20 (degrees)
       * @defaultValue 2 */
      space: number;
    }

    interface Options extends Defaults {
      /** Items related to circle-segments */
      items: Array<{ value: number; color?: string }>;
    }
    interface Attributes
      extends WUP.Base.toJSX<
        Partial<Pick<Options, "back" | "width" | "from" | "to" | "items" | "corner" | "min" | "max" | "space">>
      > {}
    interface JSXProps<C = WUPCircleElement> extends WUP.Base.JSXProps<C>, Attributes {}
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

/** Arc/circle chart based on SVG
 * @example
 * <wup-circle
 *   back="true"
 *   from="0"
 *   to="360"
 *   space="2"
 *   min="0"
 *   max="100"
 *   width="14"
 *   corner="0.25"
 *   items="window.circleItems"
 *  ></wup-circle>
 * // or JS/TS
 * const el = document.createElement("wup-circle");
 * el.$options.items = [{value:20}]; // etc.
 * document.body.appendChild(el); */
export default class WUPCircleElement extends WUPBaseElement {
  #ctr = this.constructor as typeof WUPCircleElement;

  static get observedOptions(): Array<keyof WUP.Circle.Options> {
    return this.observedAttributes;
  }

  static get observedAttributes(): Array<LowerKeys<WUP.Circle.Attributes>> {
    return ["items", "width", "back", "corner", "from", "to", "min", "max", "space"];
  }

  static get $styleRoot(): string {
    return `:root {
          --circle-0: var(--base-sep);
          --circle-1: var(--base-btn-bg);
          --circle-2: #ff9f00;
          --circle-3: #1fb13f;
          --circle-4: #9482bd;
          --circle-5: #8bc4d7;
          --circle-6: #1abdb5;
        }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
        contain: style layout paint;
        display: block;
        position: relative;
        overflow: hidden;
        margin: auto;
        padding: 2px;
        --anim-time: 400ms;
      }
      :host>strong {
        display: block;
        position: absolute;
        transform: translate(-50%,-50%);
        top: 50%; left: 50%;
        font-size: larger;
      }
      :host>svg {
        overflow: visible;
        display: block;
      }
      :host>svg path {
        stroke-width: 0;
        fill-rule: evenodd;
      }
      :host>svg>path { fill: var(--circle-0); }
      :host>svg>g>path:nth-child(1) { fill: var(--circle-1); }
      :host>svg>g>path:nth-child(2) { fill: var(--circle-2); }
      :host>svg>g>path:nth-child(3) { fill: var(--circle-3); }
      :host>svg>g>path:nth-child(4) { fill: var(--circle-4); }
      :host>svg>g>path:nth-child(5) { fill: var(--circle-5); }
      :host>svg>g>path:nth-child(6) { fill: var(--circle-6); }`;
  }

  static $defaults: WUP.Circle.Defaults = {
    width: 14,
    corner: 0.25,
    back: true,
    from: 0,
    to: 360,
    min: 0,
    max: 100,
    space: 2,
  };

  $options: WUP.Circle.Options = {
    ...this.#ctr.$defaults,
    items: [],
  };

  $refSVG = this.make("svg");
  $refItems = this.make("g");
  $refLabel?: HTMLElement;

  protected override _opts = this.$options;

  /** Creates new svg-part */
  protected make<K extends keyof SVGElementTagNameMap>(tag: string): SVGElementTagNameMap[K] {
    return document.createElementNS("http://www.w3.org/2000/svg", tag) as SVGElementTagNameMap[K];
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Circle.Options> | null): void {
    super.gotChanges(propsChanged);

    this._opts.items = this.getRefAttr("items") || [];
    this._opts.back = this.getBoolAttr("back", this._opts.back);
    ["width", "corner", "from", "to", "min", "max", "space"].forEach((key) => {
      (this._opts as any)[key] = this.getNumAttr(key)!;
    });

    if (propsChanged) {
      this.removeChildren.call(this.$refItems); // NiceToHave: instead of re-init update/remove required children
      this.removeChildren.call(this.$refSVG); // clean before new render
    }
    this.gotRenderItems();
  }

  _animation?: WUP.PromiseCancel<boolean>;
  protected gotRenderItems(): void {
    this._animation?.stop(false);

    const angleMin = this._opts.from;
    let angleMax = this._opts.to;
    // render background circle
    if (this._opts.back) {
      const back = this.make("path");
      back.setAttribute("d", this.drawArc(angleMin, angleMax));
      this.$refSVG.appendChild(back);
    }

    // render items
    this.$refSVG.appendChild(this.$refItems);
    const { items, space } = this._opts;
    let vMin = this._opts.min ?? 0;
    let vMax = this._opts.max ?? 360;
    const animTime = Number.parseInt(getComputedStyle(this).getPropertyValue("--anim-time"), 10); // WARN: expected anim-time: 200ms
    if (items.length > 1) {
      vMin = 0;
      vMax = items.reduce((v, item) => item.value + v, 0);
      angleMax -= (items.length - (angleMax - angleMin === 360 ? 0 : 1)) * space;
    }

    let angleTo = 0;
    let angleFrom = angleMin;
    (async () => {
      for (let i = 0; i < items.length; ++i) {
        const a = items[i];
        const v = a.value;
        angleTo = mathScaleValue(v, vMin, vMax, angleMin, angleMax) + (angleFrom - angleMin);
        const path = this.$refItems.appendChild(this.make("path"));
        a.color && path.setAttribute("fill", a.color);

        const ms = items.length === 1 ? animTime : mathScaleValue(v, vMin, vMax, 0, animTime);
        const from = angleFrom;
        this._animation = animate(from, angleTo, ms, (animV) => {
          path.setAttribute("d", this.drawArc(from, animV));
        });
        await this._animation.catch().finally(() => delete this._animation);

        angleFrom = angleTo + space;
      }
    })();

    // render/remove label
    let ariaLbl = "";
    if (items.length === 1) {
      this.$refLabel = this.$refLabel ?? this.appendChild(document.createElement("strong"));
      const rawV = items[0].value;
      const perc = Math.round(((angleTo - this._opts.from) * 100) / (this._opts.to - this._opts.from));
      this.renderLabel(this.$refLabel, perc, rawV);
      ariaLbl = this.$refLabel.textContent!;
    } else {
      this.$refLabel && this.$refLabel.remove();
      delete this.$refLabel;
      ariaLbl = `Values: ${items.map((a) => a.value).join(",")}`;
    }
    this.$refSVG.setAttribute("aria-label", ariaLbl);
  }

  /** Called on every changeEvent */
  protected override gotRender(): void {
    super.gotRender();
    this.$refSVG.setAttribute("viewBox", `0 0 100 100`);
    this.$refSVG.setAttribute("role", "img");
    this.appendChild(this.$refSVG);
  }

  /** Called every time as need text-value */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  renderLabel(label: HTMLElement, percent: number, rawValue: number): void {
    label.textContent = `${percent}%`;
  }

  /** Returns svg-path for Arc according to options */
  protected drawArc(angleFrom: number, angleTo: number): string {
    const r = 50;
    const center: [number, number] = [r, r];
    return drawArc(center, r, this._opts.width, angleFrom, angleTo, this._opts.corner);
  }
}

customElements.define(tagName, WUPCircleElement);

/** Returns svg-path for Cirle according to options */
export function drawCircle(center: [number, number], r: number, width: number): string {
  const inR = r - width;
  const [x, y] = center;

  return [
    `M${x - r} ${y}`,
    `A${r} ${r} 0 1 0 ${x + r} ${y}`,
    `A${r} ${r} 0 1 0 ${x - r} ${y}`,
    `M${x - inR} ${y}`,
    `A${inR} ${inR} 0 1 0 ${x + inR} ${y}`,
    `A${inR} ${inR} 0 1 0 ${x - inR} ${y}`,
    "Z",
  ].join(" ");
}

/** Returns x,y for point in the circle */
function pointOnArc(center: [number, number], r: number, angle: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180.0;
  return [center[0] + r * Math.cos(radians), center[1] + r * Math.sin(radians)];
}

/** Returns svg-path for Arc according to options */
export function drawArc(
  center: [number, number],
  r: number,
  width: number,
  angleFrom: number,
  angleTo: number,
  cornerR: number
): string {
  if (Math.abs(angleTo - angleFrom) === 360) {
    return drawCircle(center, r, width);
  }

  const inR = r - width;
  const circumference = Math.abs(angleTo - angleFrom);
  cornerR = Math.min(width / 2, width * cornerR);
  if (360 * (cornerR / (Math.PI * (r - width))) > Math.abs(angleFrom - angleTo)) {
    cornerR = (circumference / 360) * inR * Math.PI;
  }

  // inner and outer radiuses
  const inR2 = inR + cornerR;
  const outR = r - cornerR;

  // butts corner points
  const oStart = pointOnArc(center, outR, angleFrom);
  const oEnd = pointOnArc(center, outR, angleTo);

  const iStart = pointOnArc(center, inR2, angleFrom);
  const iEnd = pointOnArc(center, inR2, angleTo);

  const iSection = 360 * (cornerR / (2 * Math.PI * inR));
  const oSection = 360 * (cornerR / (2 * Math.PI * r));

  // arcs endpoints
  const iArcStart = pointOnArc(center, inR, angleFrom + iSection);
  const iArcEnd = pointOnArc(center, inR, angleTo - iSection);

  const oArcStart = pointOnArc(center, r, angleFrom + oSection);
  const oArcEnd = pointOnArc(center, r, angleTo - oSection);

  const arcSweep1 = circumference > 180 + 2 * oSection ? 1 : 0;
  const arcSweep2 = circumference > 180 + 2 * iSection ? 1 : 0;

  return [
    `M ${oStart[0]} ${oStart[1]}`, // begin path
    `A ${cornerR} ${cornerR} 0 0 1 ${oArcStart[0]} ${oArcStart[1]}`, // outer start corner
    `A ${r} ${r} 0 ${arcSweep1} 1 ${oArcEnd[0]} ${oArcEnd[1]}`, // outer main arc
    `A ${cornerR} ${cornerR} 0 0 1 ${oEnd[0]} ${oEnd[1]}`, // outer end corner
    `L ${iEnd[0]} ${iEnd[1]}`, // end butt
    `A ${cornerR} ${cornerR} 0 0 1 ${iArcEnd[0]} ${iArcEnd[1]}`, // inner end corner
    `A ${inR} ${inR} 0 ${arcSweep2} 0 ${iArcStart[0]} ${iArcStart[1]}`, // inner arc
    `A ${cornerR} ${cornerR} 0 0 1 ${iStart[0]} ${iStart[1]}`, // inner start corner
    "Z", // end path
  ].join(" ");
}

// example: https://medium.com/@pppped/how-to-code-a-responsive-circular-percentage-chart-with-svg-and-css-3632f8cd7705
// similar https://github.com/w8r/svg-arc-corners
// demo https://milevski.co/svg-arc-corners/demo/
