import WUPBaseElement from "./baseElement";

const tagName = "wup-circle";

declare global {
  namespace WUP.Circle {
    interface Defaults {
      /** Width of each segment expected 1..100 (perecentage)
       * @defaultValue 10 */
      width: number;
      /** Border/corner radius of each segment 0..w/2 (no more than width)
       * @defaultValue 2 */
      corner: number;
      /** Enable background circle
       * @defaultValue true */
      back: boolean;
      /** Angle from that rendering is started 0..360 (degrees)
       * @defaultValue 0 */
      from: number;
      /** Angle from that rendering is started 0..360 (degrees)
       * @defaultValue 360 */
      to: number;

      /** Min expected value (if min & max is missed then items values must absolute from 0 to 360)
       * @defaultValue 0 */
      min?: number;
      /** Max expected value (if min & max is missed then items values must absolute from 0 to 360)
       * @defaultValue 100 */
      max?: number;
    }

    interface Options extends Defaults {
      /** Items related to circle-segments */
      items: Array<{ value: number; color?: string }>;
    }
    interface Attributes
      extends WUP.Base.toJSX<Partial<Pick<Options, "back" | "width" | "from" | "to" | "items" | "corner">>> {}
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

/** Arc/circle chart based on SVG */
export default class WUPCircleElement extends WUPBaseElement {
  #ctr = this.constructor as typeof WUPCircleElement;

  static get observedOptions(): Array<keyof WUP.Circle.Options> {
    return ["items", "width", "back", "corner", "from", "to"];
  }

  static get observedAttributes(): Array<LowerKeys<WUP.Circle.Attributes>> {
    return ["items", "width", "back", "corner", "from", "to"];
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
        contain: style;
        display: block;
        position: relative;
        overflow: hidden;
        margin: auto;
        padding: 2px;
      }
      :host strong {
        display: block;
        position: absolute;
        transform: translate(-50%,-50%);
        top: 50%; left: 50%;
        font-size: larger;
        color: var(--circle-label);
      }
      :host svg {
        overflow: visible;
        display: block;
      }
      :host svg>path {
        stroke-width: 0;
        fill-rule: evenodd;
        fill: var(--circle-0);
      }
      :host g>path:nth-child(1) { fill: var(--circle-1); }
      :host g>path:nth-child(2) { fill: var(--circle-2); }
      :host g>path:nth-child(3) { fill: var(--circle-3); }
      :host g>path:nth-child(4) { fill: var(--circle-4); }
      :host g>path:nth-child(5) { fill: var(--circle-5); }
      :host g>path:nth-child(6) { fill: var(--circle-6); }
      `;
  }

  static $defaults: WUP.Circle.Defaults = {
    width: 14,
    corner: 3,
    back: true,
    from: 0,
    to: 360,
    min: 0,
    max: 100,
  };

  $options: WUP.Circle.Options = {
    ...this.#ctr.$defaults,
    items: [],
  };

  protected override _opts = this.$options;

  /** Creates new svg-part */
  protected make<K extends keyof SVGElementTagNameMap>(tag: string): SVGElementTagNameMap[K] {
    return document.createElementNS("http://www.w3.org/2000/svg", tag) as SVGElementTagNameMap[K];
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Circle.Options> | null): void {
    super.gotChanges(propsChanged);

    this._opts.items = this.getRefAttr("items") || [];
    this._opts.width = this.getNumAttr("width")!;
    this._opts.back = this.getBoolAttr("back", this._opts.back);
    this._opts.corner = this.getNumAttr("corner")!;
    this._opts.from = this.getNumAttr("from")!;
    this._opts.to = this.getNumAttr("to")!;

    if (propsChanged) {
      this.$refItems.textContent = "";
      this.$refSVG.textContent = ""; // clean before new render
    }
    this.gotRender();
  }

  $refSVG = this.make("svg");
  $refItems = this.make("g");
  $refLabel?: HTMLElement;

  /** Called on every changeEvent */
  protected override gotRender(): void {
    // example: https://medium.com/@pppped/how-to-code-a-responsive-circular-percentage-chart-with-svg-and-css-3632f8cd7705
    this.$refSVG.setAttribute("viewBox", `0 0 100 100`);
    this.$refSVG.setAttribute("role", "img");
    const title = this.$refSVG.appendChild(this.make("title"));
    title.textContent = "Some description for WA here"; // todo check it for WA
    this.$refSVG.appendChild(this.$refItems);

    // render background cicle
    if (this._opts.back) {
      // render background circle
      const back = this.make("path");
      back.setAttribute("d", this.drawArc(this._opts.from, this._opts.to));
      this.$refSVG.prepend(back);
    }

    // render items
    // todo develop animation here
    const { items } = this._opts;
    let angleFrom = this._opts.from;
    let angleTo = 0;
    let end = 0;

    let { min, max } = this._opts;
    if (items.length > 1) {
      min = 0; // items.reduce((v, item) => (item.value < v ? item.value : v), 0);
      max = items.reduce((v, item) => item.value + v, 0);
    }

    for (let i = 0; i < items.length; ++i) {
      const a = items[i];
      const v = a.value;
      angleTo = this.valueToAngle(v, min, max) + end;

      const path = this.$refItems.appendChild(this.make("path"));
      path.setAttribute("d", this.drawArc(angleFrom, angleTo));
      a.color && path.setAttribute("fill", a.color);
      end = angleTo;
      angleFrom = angleTo; // todo add extra space between segments here
    }

    // render/remove label
    if (items.length === 1) {
      this.$refLabel = this.$refLabel ?? this.appendChild(document.createElement("strong"));
      const rawV = items[0].value;
      const perc = Math.round(((angleTo - this._opts.from) * 100) / (this._opts.to - this._opts.from));
      this.renderLabel(this.$refLabel, perc, rawV);
    } else {
      this.$refLabel?.remove();
      this.$refLabel = undefined;
    }

    this.appendChild(this.$refSVG);
  }

  /** Convert value to angle according to options min,max,from,to */
  protected valueToAngle(v: number, min: number | null | undefined, max: number | null | undefined): number {
    const { from, to } = this._opts;
    if (min == null || max == null) {
      return v; // if min & max is null than value is pointed in degress
    }

    // WARN: theoritaclly possible to get 1deg out for rendering several segments with Math.round
    const r = Math.round(scaleValue(v, min, max, from, to));
    return r;
  }

  /** Called every time as need to text-value */
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

  // rotate(cx: number, cy: number, x: number, y: number, angle: number): [number, number] {
  //   const rad = (Math.PI / 180) * angle;
  //   const cos = Math.cos(rad);
  //   const sin = Math.sin(rad);
  //   const nx = cos * (x - cx) - sin * (y - cy) + cx;
  //   const ny = cos * (y - cy) + sin * (x - cx) + cy;
  //   return [nx, ny];
  // }
}

customElements.define(tagName, WUPCircleElement);

function pointOnArc(center: [number, number], r: number, angle: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180.0;
  return [center[0] + r * Math.cos(radians), center[1] + r * Math.sin(radians)];
}

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
  cornerR = Math.min(width / 2, cornerR);
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

/** Scale value from one range to another; 4..20mA to 0..100deg for instance */
export function scaleValue(v: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  const span = (toMax - toMin) / (fromMax - fromMin);
  return span * (v - fromMin) + toMin;
}
