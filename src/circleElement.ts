import WUPBaseElement from "./baseElement";
import WUPPopupElement from "./popup/popupElement";
import { ShowCases } from "./popup/popupElement.types";
import animate from "./helpers/animate";
import { mathScaleValue, rotate } from "./helpers/math";
import { parseMsTime } from "./helpers/styleHelpers";
import { onEvent } from "./indexHelpers";

// example: https://medium.com/@pppped/how-to-code-a-responsive-circular-percentage-chart-with-svg-and-css-3632f8cd7705
// similar https://github.com/w8r/svg-arc-corners
// demo https://milevski.co/svg-arc-corners/demo/

const tagName = "wup-circle";
const radius = 50;

declare global {
  namespace WUP.Circle {
    interface Item {
      value: number;
      color?: string;
      /** Point any text | function to show tooltip
       * @hints
       * * set `Item value {#}` to use tooltip where `{#}` is pointed value
       * * point function to use custom logic
       * * override `WUPCircleElement.prototype.renderTooltip` to use custom logic
       * * to change hover-timeouts see `WUPCircleElement.$defaults.hover...`
       * * use below example to use custom logic @example
       *  items = [{
       *    value: 5,
       *    label: (item, popup) => {
       *     setTimeout(()=>popup.innerHTML=...);
       *     return ""
       *  }] */
      tooltip?: string | ((item: Item, popup: WUPPopupElement) => string);
    }
    interface SVGItem extends SVGPathElement {
      _relatedItem: Item;
      _hasTooltip?: true;
      _center: { x: number; y: number };
    }
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
      /** Space between segments; expected 0..20 (degrees)
       * @defaultValue 2 */
      space: number;
      /** Min segment size - to avoid rendering extra-small segments; expected 0..20 (degrees)
       * @defaultValue 10 */
      minsize: number;
      /** Timeout in ms before popup shows on hover of target;
       * @defaultValue inherited from WUPPopupElement.$defaults.hoverShowTimeout */
      hoverShowTimeout: number;
      /** Timeout in ms before popup hides on mouse-leave of target;
       * @defaultValue 0 */
      hoverHideTimeout: number;
    }

    interface Options extends Defaults {
      /** Items related to circle-segments */
      items: Item[];
    }
    interface Attributes
      extends WUP.Base.toJSX<
        Partial<
          Pick<Options, "back" | "width" | "from" | "to" | "items" | "corner" | "min" | "max" | "space" | "minsize">
        >
      > {}
    interface JSXProps<C = WUPCircleElement> extends WUP.Base.JSXProps<C>, Attributes {}
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPCircleElement; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Arc/circle chart based on SVG
       *  @see {@link WUPCircleElement} */
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
export default class WUPCircleElement extends WUPBaseElement<WUP.Circle.Options> {
  #ctr = this.constructor as typeof WUPCircleElement;

  static get observedOptions(): Array<keyof WUP.Circle.Options> {
    return this.observedAttributes;
  }

  static get observedAttributes(): Array<LowerKeys<WUP.Circle.Attributes>> {
    return ["items", "width", "back", "corner", "from", "to", "min", "max", "space", "minsize"];
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
        overflow: visible;
        margin: auto;
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
      :host>svg>g>path:nth-child(6) { fill: var(--circle-6); }
      :host>wup-popup,
      :host>wup-popup-arrow {
        white-space: pre;
        pointer-events: none;
        user-select: none;
        touch-action: none;
      }
      :host>wup-popup {
        background: rgba(255,255,255,0.9)
      }
      :host>wup-popup-arrow:before {
        opacity: 0.9;
        margin: 0;
      }`;
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
    minsize: 10,
    hoverShowTimeout: WUPPopupElement.$defaults.hoverShowTimeout,
    hoverHideTimeout: 0,
  };

  constructor() {
    super();
    this._opts.items = [];
  }

  $refSVG = this.make("svg");
  $refItems = this.make("g");
  $refLabel?: HTMLElement;

  /** Creates new svg-part */
  protected make<K extends keyof SVGElementTagNameMap>(tag: string): SVGElementTagNameMap[K] {
    return document.createElementNS("http://www.w3.org/2000/svg", tag) as SVGElementTagNameMap[K];
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Circle.Options> | null): void {
    super.gotChanges(propsChanged);

    this._opts.items = this.getAttr("items", "ref") || [];
    this._opts.back = this.getAttr("back", "bool") || false;
    ["width", "corner", "from", "to", "min", "max", "space", "minsize"].forEach((key) => {
      (this._opts as any)[key] = this.getAttr(key, "number")!;
    });

    if (propsChanged) {
      this.removeChildren.call(this.$refItems); // NiceToHave: instead of re-init update/remove required children
      this.removeChildren.call(this.$refSVG); // clean before new render
    }
    this.gotRenderItems();
  }

  /** Returns array of render-angles according to pointed arguments */
  mapItems(
    valueMin: number,
    valueMax: number,
    angleMin: number,
    angleMax: number,
    space: number,
    minSize: number,
    animTime: number,
    items: WUP.Circle.Options["items"]
  ): Array<{ angleFrom: number; angleTo: number; ms: number }> {
    if (items.length > 1) {
      valueMin = 0;
      valueMax = items.reduce((v, item) => item.value + v, 0);
      angleMax -= (items.length - (angleMax - angleMin === 360 ? 0 : 1)) * space;
    }
    let angleFrom = angleMin;

    let diff = 0;
    let diffCnt = 0;
    type MappedItem = { angleFrom: number; angleTo: number; ms: number; v: number };
    // calc angle-value per item
    const arr: MappedItem[] = items.map((s) => {
      const v = mathScaleValue(s.value, valueMin, valueMax, angleMin, angleMax) - angleMin;
      const a = { angleFrom: 0, angleTo: 0, ms: 0, v };
      if (v !== 0 && v < minSize) {
        diff += minSize - v; // gather sum of difference to apply later
        ++diffCnt;
        a.v = minSize; // not allow angle to be < minSize
      }
      return a;
    });
    // smash difference to other segments
    if (diff !== 0 && arr.length !== 1) {
      // todo if affects on label in the center for single item
      let cnt = arr.length - diffCnt;
      arr.forEach((a) => {
        if (a.v > minSize) {
          let v = diff / cnt;
          let next = a.v - v;
          if (next < minSize) {
            v -= minSize - next;
            next = minSize;
          }
          a.v = next;
          diff -= v;
          --cnt;
        }
      });

      if (diff > 0) {
        // possible issue when items so many that we don't have enough-space
        console.error(
          "WUP-CIRCLE. Impossible to increase segments up to $options.minSize. Change [minSize] or filter items yourself. arguments:",
          { valueMin, valueMax, angleMin, angleMax, space, minSize, animTime, items }
        );
        // assign values without minSize
        items.forEach((s, i) => {
          arr[i].v = mathScaleValue(s.value, valueMin, valueMax, angleMin, angleMax) - angleMin;
        });
      }
    }

    // calc result
    const totalAngle = angleMax - angleMin;
    arr.forEach((a) => {
      a.angleFrom = angleFrom;
      a.angleTo = angleFrom + a.v;
      a.ms = items.length === 1 ? animTime : Math.abs((a.v * animTime) / totalAngle);
      angleFrom = a.angleTo + space;
    });

    return arr;
  }

  _animation?: WUP.PromiseCancel<boolean>;
  protected gotRenderItems(): void {
    this._animation?.stop(false);

    const angleMin = this._opts.from;
    const angleMax = this._opts.to;
    const vMin = this._opts.min ?? 0;
    const vMax = this._opts.max ?? 360;
    const { items } = this._opts;

    const style = getComputedStyle(this);
    const animTime = parseMsTime(style.getPropertyValue("--anim-time"));

    const arr = this.mapItems(vMin, vMax, angleMin, angleMax, this._opts.space, this._opts.minsize, animTime, items);

    // render background circle
    if (this._opts.back) {
      const back = this.make("path");
      back.setAttribute("d", this.drawArc(angleMin, angleMax));
      this.$refSVG.appendChild(back);
    }

    // render items
    this.$refSVG.appendChild(this.$refItems);

    (async () => {
      let hasTooltip = false;
      const hw = this._opts.width / 2;
      for (let i = 0; i < items.length; ++i) {
        const a = items[i];
        const c = arr[i];
        // apply colors
        const path = this.$refItems.appendChild(this.make("path")) as WUP.Circle.SVGItem;
        const col = a.color || style.getPropertyValue(`--circle-${i + 1}`).trim();
        col && path.setAttribute("fill", col); // only for saving as file-image
        if (a.color) {
          path.style.fill = a.color; // attr [fill] can't override css-rules
        }

        path._center = { x: radius, y: hw };
        if (a.tooltip) {
          hasTooltip = true;
          path._hasTooltip = true;
          // calc center for tooltip
          const ca = c.angleFrom + (c.angleTo - c.angleFrom) / 2;
          [path._center.x, path._center.y] = rotate(radius, radius, radius, hw, ca);
        }
        path._relatedItem = a;
        // animate
        this._animation = animate(c.angleFrom, c.angleTo, c.ms, (animV) => {
          path.setAttribute("d", this.drawArc(c.angleFrom, animV));
        });
        await this._animation.catch().finally(() => delete this._animation);
      }
      this.useTooltip(hasTooltip);
    })();

    // render/remove label
    let ariaLbl = "";
    if (items.length === 1) {
      this.$refLabel = this.$refLabel ?? this.appendChild(document.createElement("strong"));
      const rawV = items[0].value;
      const perc = Math.round(((arr[0].angleTo - this._opts.from) * 100) / (this._opts.to - this._opts.from));
      this.renderLabel(this.$refLabel, perc, rawV);
      ariaLbl = this.$refLabel.textContent!;
    } else {
      this.$refLabel && this.$refLabel.remove();
      delete this.$refLabel;
      ariaLbl = `Values: ${items.map((a) => a.value).join(",")}`;
    }
    this.$refSVG.setAttribute("aria-label", ariaLbl);
  }

  /** Called when need to show popup over segment */
  renderTooltip(segment: WUP.Circle.SVGItem): WUPPopupElement {
    const popup = document.createElement("wup-popup");
    popup.$options.showCase = ShowCases.always;
    popup.$options.target = segment;
    popup.$options.arrowEnable = true;
    // place in the center of drawed path
    popup.getTargetRect = () => {
      const r = this.$refSVG.getBoundingClientRect();
      const scale = Math.min(r.width, r.height) / 100;
      const x = r.x + segment._center.x * scale;
      const y = r.y + segment._center.y * scale;
      return DOMRect.fromRect({ x, y, width: 0.01, height: 0.01 });
    };
    const item = segment._relatedItem;
    const lbl = item.tooltip!;
    popup.innerText =
      typeof lbl === "function" ? lbl.call(this, item, popup) : lbl.replace("{#}", item.value.toString());

    return this.appendChild(popup);
  }

  /** Function to remove tooltipListener */
  _tooltipDisposeLst?: () => void;
  /** Apply tooltip listener; */
  protected useTooltip(isEnable: boolean): void {
    if (!isEnable) {
      this._tooltipDisposeLst?.call(this);
      this._tooltipDisposeLst = undefined;
      return;
    }
    if (this._tooltipDisposeLst) {
      return;
    }
    // impossible to use popupListen because it listens for single target but we need per each segment
    this._tooltipDisposeLst = onEvent(
      this,
      "mouseenter", // mouseenter is fired even with touch event (mouseleave fired with touch outside in this case)
      (e) => {
        // NiceToHave: rewrite popupListen to use here
        const t = e.target as WUP.Circle.SVGItem & {
          _tid?: ReturnType<typeof setTimeout>;
          _tooltip?: WUPPopupElement;
        };
        if (t._hasTooltip) {
          t._tid && clearTimeout(t._tid); // remove timer for mouseleave
          t._tid = setTimeout(() => {
            if (t._tooltip) t._tooltip.$show();
            else t._tooltip = this.renderTooltip(t);
          }, this._opts.hoverShowTimeout);

          onEvent(
            e.target as HTMLElement,
            "mouseleave",
            () => {
              t._tid && clearTimeout(t._tid); // remove timer for mouseenter
              t._tid = setTimeout(() => {
                t._tooltip?.$hide().finally(() => {
                  // popup can be opened when user returns mouse back in a short time
                  if (t._tooltip && !t._tooltip!.$isOpen) {
                    t._tooltip!.remove();
                    t._tooltip = undefined;
                  }
                });
                t._tid = undefined;
              }, this._opts.hoverHideTimeout);
            },
            { once: true }
          );
        }
      },
      { capture: true, passive: true }
    );
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
    const r = radius;
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
