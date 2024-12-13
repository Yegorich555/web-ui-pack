import WUPBaseElement from "./baseElement";
import WUPPopupElement from "./popup/popupElement";
import { PopupOpenCases } from "./popup/popupElement.types";
import animate from "./helpers/animate";
import { mathScaleValue, mathRotate } from "./helpers/math";
import { parseMsTime } from "./helpers/styleHelpers";
import onEvent from "./helpers/onEvent";

// example: https://medium.com/@pppped/how-to-code-a-responsive-circular-percentage-chart-with-svg-and-css-3632f8cd7705
// similar https://github.com/w8r/svg-arc-corners
// demo https://milevski.co/svg-arc-corners/demo/

const tagName = "wup-circle";
const radius = 50;

declare global {
  namespace WUP.Circle {
    /** Item object related to */
    interface Item {
      /** Value of item that will be rendered; depends on @see {@link Options.min}, {@link Options.max}, {@link Options.from}, {@link Options.to} */
      value: number;
      /** Color for item. Default colors defined in css-variables like `--circle-X: #e4e4e4;` where `X` is number of item */
      color?: string;
      /** Point any text | function to show tooltip
       * @hints
       * * set `Item value {#}` to use tooltip where `{#}` is pointed value
       * * point function to use custom logic
       * * override `WUPCircleElement.prototype.renderTooltip` to use custom logic
       * * to change hover-timeouts see {@link WUPCircleElement.$defaults.hoverOpenTimeout}, {@link WUPCircleElement.$defaults.hoverCloseTimeout}_
       * * use below example to use custom logic @example
       *  items = [{
       *    value: 5,
       *    tooltip: (item, popup) => {
       *     setTimeout(()=>popup.innerHTML=...);
       *     return ""
       *  }] */
      tooltip?: string | ItemTooltipFn;
    }
    /** Callback function for rendering tooltip */
    type ItemTooltipFn = (item: ItemResult, popup: WUPPopupElement) => string;
    /** Returns in tooltip callback function with extra fields */
    interface ItemResult extends Item {
      /** Pointed {@link Item.color} OR defined from css-variable like `--circle-X: #e4e4e4;` where `X` is number of item */
      color: string;
      /** Value relative to another items where 100% is SUM or difference max-min for single item */
      percentage: number;
    }

    interface SVGItem extends SVGPathElement {
      _relatedItem: Item;
      _hasTooltip?: true;
      _center: { x: number; y: number };
      _definedColor: string;
    }
    interface Options {
      /** Width of each segment; expected 1..100 (perecentage)
       * @defaultValue 10 */
      width: number;
      /** Border/corner radius of each segment; expected 0..0.5 where 0.5 == 50% of `$options.width`
       * @defaultValue 0.25 */
      corner: number;
      /** Enable background circle
       * @defaultValue true */
      back: boolean;
      /** Angle from that rendering is started -360..360 (degrees)
       * @defaultValue 0 */
      from: number;
      /** Angle to that rendering is finished -360..360 (degrees)
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
      minSize: number;
      /** Timeout in ms before popup shows on hover of target;
       * @defaultValue inherited from WUPPopupElement.$defaults.hoverOpenTimeout */
      hoverOpenTimeout: number;
      /** Timeout in ms before popup closes on mouse-leave of target;
       * @defaultValue 0 */
      hoverCloseTimeout: number;
      /** Items related to circle-segments;
       * If pointed single item then label will be auto created. For other label-details @see {@link WUPCircleElement.prototype.$refLabel}  */
      items: Item[];
    }
    interface JSXProps extends WUP.Base.OnlyNames<Omit<Options, "hoverOpenTimeout" | "hoverCloseTimeout" | "items">> {
      "w-width"?: number;
      "w-corner"?: number;
      "w-back"?: boolean | "";
      "w-from"?: number;
      "w-to"?: number;
      "w-min"?: number;
      "w-max"?: number;
      "w-space"?: number;
      "w-minSize"?: number;
      /** Global reference to object with array
       * @see {@link Item}
       * @example
       * ```js
       * window.myItems = [...];
       * <wup-circle w-items="window.myItems"></wup-circle>
       * ``` */
      "w-items"?: string;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPCircleElement; // add element to document.createElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** Arc/circle chart based on SVG
       *  @see {@link WUPCircleElement} */
      [tagName]: WUP.Base.ReactHTML<WUPCircleElement> & WUP.Circle.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Arc/circle chart based on SVG
       *  @see {@link WUPCircleElement} */
      [tagName]: HTMLAttributes<WUPCircleElement> & WUP.Circle.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Arc/circle chart based on SVG
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/circle}
 * @example
 * <wup-circle
 *   w-back="true"
 *   w-from="0"
 *   w-to="360"
 *   w-space="2"
 *   w-min="0"
 *   w-max="100"
 *   w-width="14"
 *   w-corner="0.25"
 *   w-items="window.circleItems"
 *  >
 *   <strong>Some custom label</strong>
 * </wup-circle>
 * // or JS/TS
 * const el = document.createElement("wup-circle");
 * el.$options.items = [{value:20}]; // etc.
 * document.body.appendChild(el); */
export default class WUPCircleElement extends WUPBaseElement<WUP.Circle.Options> {
  // #ctr = this.constructor as typeof WUPCircleElement;

  static get $styleRoot(): string {
    return `:root {
          --circle-0: #e4e4e4;
          --circle-1: #009fbc;
          --circle-2: #ff9f00;
          --circle-3: #1fb13f;
          --circle-4: #9482bd;
          --circle-5: #8bc4d7;
          --circle-6: #1abdb5;
          --circle-7: #a0db67;
          --circle-8: #67dbba;
        }
        [wupdark] {
          --circle-0: #104652;
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
        min-width: 100px;
        min-height: 50px;
        --anim-t: 400ms;
      }
      :host>strong {
        display: block;
        position: absolute;
        transform: translate(-50%,-50%);
        top: 50%; left: 50%;
        font-size: larger;
        max-width: calc(100% - 20px);
        white-space: pre-line;
        text-align: center;
      }
      :host[half] {
        aspect-ratio: 2;
      }
      :host[half]>strong {
        top: initial;
        bottom: 0;
        transform: translateX(-50%);
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
      :host>svg>g>path:nth-child(7) { fill: var(--circle-7); }
      :host>svg>g>path:nth-child(8) { fill: var(--circle-8); }
      :host>wup-popup,
      :host>wup-popup-arrow {
        white-space: pre;
        pointer-events: none;
        user-select: none;
        touch-action: none;
      }`;
  }

  static $defaults: WUP.Circle.Options = {
    width: 14,
    corner: 0.25,
    back: true,
    from: 0,
    to: 360,
    min: 0,
    max: 100,
    space: 2,
    minSize: 10,
    hoverOpenTimeout: WUPPopupElement.$defaults.hoverOpenTimeout,
    hoverCloseTimeout: 0,
    items: [],
  };

  static override cloneDefaults<T extends Record<string, any>>(): T {
    const d = super.cloneDefaults() as WUP.Circle.Options;
    d.items = [];
    return d as unknown as T;
  }

  $refSVG = this.make("svg");
  $refItems = this.make("g");
  /** Reference to <strong> element
   * @tutorial Troubleshooting/rules:
   * * label auto created only when pointed items.length === 1
   * * if you need custom label then use `<wup-circle><strong>Custom label here</strong><wup-circle>`
   * * Override {@link WUPCircleElement.prototype.renderLabel} to customize behavior when single item */
  $refLabel?: HTMLElement;

  /** Creates new svg-part */
  protected make<K extends keyof SVGElementTagNameMap>(tag: string): SVGElementTagNameMap[K] {
    return document.createElementNS("http://www.w3.org/2000/svg", tag) as SVGElementTagNameMap[K];
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Circle.Options> | null): void {
    this._opts.items ??= [];
    super.gotChanges(propsChanged);

    let skipAnim = false;
    if (propsChanged) {
      this.removeChildren.call(this.$refItems);
      this.removeChildren.call(this.$refSVG); // clean before new render
      skipAnim = true; // renderNew without animation
    }

    const isHalf = Math.abs(this._opts.to - this._opts.from) === 180;
    this.setAttr("half", isHalf, true);

    this.renderItems(skipAnim);
  }

  /** Returns array of render-angles according to pointed arguments */
  mapItems(
    valueMin: number,
    valueMax: number,
    angleMin: number,
    angleMax: number,
    space: number,
    minSizeDeg: number,
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
      if (v !== 0 && v < minSizeDeg) {
        diff += minSizeDeg - v; // gather sum of difference to apply later
        ++diffCnt;
        a.v = minSizeDeg; // not allow angle to be < minSize
      }
      return a;
    });
    // smash difference to other segments
    if (diff !== 0 && arr.length !== 1) {
      let cnt = arr.length - diffCnt;
      arr.forEach((a) => {
        if (a.v > minSizeDeg) {
          let v = diff / cnt;
          let next = a.v - v;
          if (next < minSizeDeg) {
            v -= minSizeDeg - next;
            next = minSizeDeg;
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
          { valueMin, valueMax, angleMin, angleMax, space, minSize: minSizeDeg, animTime, items }
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
  protected renderItems(skipAnim?: boolean): void {
    this._animation?.stop(false);

    const angleMin = this._opts.from;
    const angleMax = this._opts.to;
    const vMin = this._opts.min;
    const vMax = this._opts.max;
    const { items, minSize: minsize, corner, width } = this._opts;

    const style = getComputedStyle(this);
    const animTime = skipAnim ? 0 : parseMsTime(style.getPropertyValue("--anim-t"));

    // calc min possible segment size so cornerR can fit
    const inR = radius - width + corner * width;
    const minDegCorner = (Math.min(width, width * 2 * corner) * 180) / Math.PI / inR; // min segment degrees according to corner radius
    const minDeg = Math.max(minsize, minDegCorner);
    const arr = this.mapItems(vMin, vMax, angleMin, angleMax, this._opts.space, minDeg, animTime, items);

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
        const cssVar = a.color || style.getPropertyValue(`--circle-${i + 1}`).trim() || "#000";
        path.setAttribute("fill", cssVar); // only for saving as file-image
        if (a.color) {
          path.style.fill = a.color; // attr [fill] can't override css-rules
        }
        path._definedColor = a.color || cssVar;
        path._center = { x: radius, y: hw };
        if (a.tooltip) {
          hasTooltip = true;
          path._hasTooltip = true;
          // calc center for tooltip
          const ca = c.angleFrom + (c.angleTo - c.angleFrom) / 2;
          [path._center.x, path._center.y] = mathRotate(radius, radius, radius, hw, ca);
        }
        path._relatedItem = a;
        // animate
        this._animation = animate(c.angleFrom, c.angleTo, c.ms, (animV) => {
          path.setAttribute("d", this.drawArc(c.angleFrom, animV));
        });
        !skipAnim && (await this._animation.catch().finally(() => delete this._animation));
      }
      this.useTooltip(hasTooltip);
    })();

    // render/remove label
    let ariaLbl = "";
    if (items.length === 1) {
      let isCustomLabel = false;
      if (!this.$refLabel) {
        // allow to use label created outside internal logic
        const existed = this.querySelector("strong");
        if (existed) {
          ariaLbl = existed.textContent || "";
          isCustomLabel = true;
        }
      }
      if (!isCustomLabel) {
        this.$refLabel ??= this.appendChild(document.createElement("strong"));
        const rawV = items[0].value;
        const perc = mathScaleValue(rawV, vMin, vMax, 0, 100);
        this.renderLabel(this.$refLabel, perc, rawV);
        ariaLbl = this.$refLabel.textContent!;
      }
    } else {
      this.$refLabel?.remove();
      delete this.$refLabel;
      ariaLbl = `Values: ${items.map((a) => a.value).join(",")}`;
    }
    this.$refSVG.setAttribute("aria-label", ariaLbl);
  }

  /** Called when need to show popup over segment */
  renderTooltip(segment: WUP.Circle.SVGItem): WUPPopupElement {
    const popup = document.createElement("wup-popup");
    popup.setAttribute("tooltip", "");
    popup.$options.openCase = PopupOpenCases.onInit;
    popup.$options.target = segment;
    popup.$options.arrowEnable = true;
    // place in the center of drawn path
    popup.getTargetRect = () => {
      const r = this.$refSVG.getBoundingClientRect();
      const scale = Math.min(r.width, r.height) / 100;
      const x = r.x + segment._center.x * scale;
      const y = r.y + segment._center.y * scale;
      return DOMRect.fromRect({ x, y, width: 0.01, height: 0.01 });
    };
    const total = this.$options.items!.reduce((sum, a) => sum + a.value, 0);
    const item: WUP.Circle.ItemResult = {
      ...segment._relatedItem,
      color: segment._definedColor,
      percentage: mathScaleValue(segment._relatedItem.value, 0, total, 0, 100),
    };

    const lbl = item.tooltip!;

    popup.innerText =
      typeof lbl === "function"
        ? lbl.call(this, item, popup)
        : lbl
            .replace("{#}", item.value.toString())
            .replace("{#%}", `${(Math.round(item.percentage * 10) / 10).toString()}%`);

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
            if (t._tooltip) t._tooltip.$open();
            else t._tooltip = this.renderTooltip(t);
          }, this._opts.hoverOpenTimeout);

          onEvent(
            e.target as HTMLElement,
            "mouseleave",
            () => {
              t._tid && clearTimeout(t._tid); // remove timer for mouseenter
              t._tid = setTimeout(() => {
                t._tooltip?.$close().finally(() => {
                  // popup can be opened when user returns mouse back in a short time
                  if (t._tooltip && !t._tooltip!.$isOpened) {
                    t._tooltip!.remove();
                    t._tooltip = undefined;
                  }
                });
                t._tid = undefined;
              }, this._opts.hoverCloseTimeout);
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
    this.$refSVG.setAttribute("viewBox", `0 0 100 100`);
    this.$refSVG.setAttribute("role", "img");
    this.appendChild(this.$refSVG);
  }

  /** Called every time as need text-value (only if $options.items.length === 1) */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  renderLabel(label: HTMLElement, percent: number, rawValue: number): void {
    label.textContent = `${Math.round(percent)}%`;
  }

  /** Returns svg-path for Arc according to options */
  protected drawArc(angleFrom: number, angleTo: number): string {
    const r = radius;
    const center: [number, number] = [r, r];
    return drawArc(center, r, this._opts.width, angleFrom, angleTo, this._opts.corner);
  }
}

customElements.define(tagName, WUPCircleElement);

/** Returns svg-path for Circle according to options */
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
  const maxCorner = (circumference / 360) * Math.PI * (r - width / 2);
  cornerR = Math.min(width / 2, width * cornerR, maxCorner);

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
