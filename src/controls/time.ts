/* eslint-disable prefer-destructuring */
import WUPScrolled from "../helpers/scrolled";
import localeInfo from "../objects/localeInfo";
import WUPTimeObject from "../objects/timeObject";
import WUPPopupElement from "../popup/popupElement";
import WUPBaseComboControl from "./baseCombo";

const tagName = "wup-time";

declare global {
  namespace WUP.Time {
    interface EventMap extends WUP.BaseCombo.EventMap {}
    interface ValidityMap extends WUP.BaseCombo.ValidityMap, Pick<WUP.Text.ValidityMap, "_mask" | "_parse"> {
      /** Enabled if option [min] is pointed; If $value < pointed shows message 'Min time is {x}` */
      min: WUPTimeObject;
      /** Enabled if option [min] is pointed; if $value > pointed shows message 'Max time is {x}` */
      max: WUPTimeObject;
    }
    interface Defaults<T = WUPTimeObject, VM = ValidityMap> extends WUP.BaseCombo.Defaults<T, VM> {
      /** String representation of displayed time (enables mask, - to disable mask set $options.mask="");
       * @defaultValue localeInfo.time
       * @tutorial Troubleshooting
       * * with changing $options.format need to change/reset mask/maskholder also */
      format?: string;
      /** Increment value in minutes
       *  @defaultValue 1 */
      step: number;
    }
    interface Options<T = WUPTimeObject, VM = ValidityMap> extends WUP.BaseCombo.Options<T, VM>, Defaults<T, VM> {
      /** User can't select time less than min */
      min?: WUPTimeObject;
      /** User can't select time more than max */
      max?: WUPTimeObject;
      format: string;
    }
    interface Attributes
      extends WUP.BaseCombo.Attributes,
        WUP.Base.toJSX<Partial<Pick<Options, "format" | "min" | "max" | "format" | "step">>> {}
    interface JSXProps<C = WUPTimeControl> extends WUP.BaseCombo.JSXProps<C>, Attributes {
      initValue?: string;
    }
  }
  interface HTMLElementTagNameMap {
    [tagName]: WUPTimeControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUP.Time.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

/** Form-control with time picker
 * @tutorial Troubleshooting
 * * $options.format related only to displayed text, to work with other time-options like min/max use strict format 'hh:mm'
 * * if increase `--ctrl-icon-size`: change `ctrl-icon-img` to `--ctrl-icon-img: var(--ctrl-time-icon-img-lg)`: otherwise quality is ugly on larger icon
 * @example
  const el = document.createElement("wup-time");
  el.$options.name = "time";
  el.$initValue = new WUPTimeObject(22, 15);
  el.$options.validations = { required: true, min=new WUPTimeObject(01,05), max=new WUPTimeObject(23,00) };
  el.$options.format = "hh-mm A";
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-time name="time" initvalue="22:15" min="01:05" max="23:00"/>
  </wup-form>;
 */
export default class WUPTimeControl<
  ValueType extends WUPTimeObject = WUPTimeObject,
  EventMap extends WUP.Time.EventMap = WUP.Time.EventMap
> extends WUPBaseComboControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTimeControl;

  // --ctrl-time-icon-img-png-20: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAABiAAAAYgH4krHQAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAYJJREFUOI2l1L9qVUEQBvCf5+JFUBBbJQi2SSW+gLFV88ck2tmaBJE8gen8h/gCWklInzZ5h4BKIkkUtFD7BDGF91jsHLJe7tl70Q+GPTvzzcfOnJ1lMLq4h3V8xFHYLtawEJyRMI/PqIfYAWZKQh28zBLe4RHGcTZsPHzvM95zVIMEG7FfWGwjBSos4ThynvUT5jKx66Uy+jCZiU43zi4+hfNBS2KN1ZbYcsT3Q8tdJz1rK7Mk2MGH4MxX2VFfo9eSVMJvvInvqQpXY7P1D2INNmO9VuFibL7+h+CXWC9VUu1wakjSTUwM4dQVvsdmrEC8hQvYxiuc74tfjvUbaTZraQJKOIPH+IkfuJ/FVkLjLWnQa2mcOkNE4Qo24iD8fW3mSJfxIBxLIwg2aF6bh5G7h9NNcDacx9I4jYobkdPD7f7gi0x0Wbn8TpysmeMng0hVJlpLfVmRrsq5sInwNT3r4anyy2TWSU9LtoepklCOrvT316Rn/wiH2JGuxh3ZD8jxB6xmcQf6l8SZAAAAAElFTkSuQmCC');
  static get $styleRoot(): string {
    return `:root {
        --ctrl-time-icon-img-lg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M383.615 0C171.647 0 0 172.032 0 384s171.648 384 383.615 384c212.352 0 384.383-172.032 384.383-384S595.966 0 383.615 0zM384 691.199C214.272 691.199 76.801 553.727 76.801 384S214.273 76.801 384 76.801c169.728 0 307.199 137.472 307.199 307.199S553.727 691.199 384 691.199zm-38.401-499.198h57.6v201.6l172.8 102.528-28.8 47.232-201.6-120.96v-230.4z' /%3E%3C/svg%3E");
        --ctrl-time-icon-img: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAABOAAAATgGxzR8zAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAASxJREFUOI2V00kuRFEUBuCvXqLMrEBIRBeKxCIMrcFAYguMRMz13QYwESxAMxIjXYKEiIHYAQYSTRncU1JRT+FPbnLfOf9/unsetejHPK7wHOcSsyjl8L/QiBW84wMnWItzGrY3LKKYJz5AGZtoy0nQjq3g7H0PshqOiXolBiaDu1Ax9EXZmznkY4zm2LeldnozjKCA8T9kr2AMGUYyDEpDuvtHgFucYzBDC27+Ia7gGq2ZNJDCD6QXDKMnx1cg9fGArh8CDOFM2olpNFX5unEPc9KStNcpdwBHOIzvztDMkNbzTVqSeiigOe47oflqbVmaxeQvQWAquPPVxiL2w7GNjhxhZ2QuYxcN3wlFLEVpH9Lw1rER9zJepZnViKtRkn7dSzzhERfSK9Q85ye76kkmcVhDgAAAAABJRU5ErkJggg==');
        --ctrl-time-current: inherit;
        --ctrl-time-current-bg: #d9f7fd;
      }`;
  }

  // todo fix animate-dropdown affects on mark { translate }

  static get $style(): string {
    const focusStyle = `
          content: " ";
          position: absolute;
          display: block;
          top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          width: 2em;
          height: 2em;
          border-radius: 50%;
          //box-shadow: 0 0 3px 1px inset var(--ctrl-focus);
          box-shadow: 0 0 3px 1px var(--ctrl-focus);
    `;
    return `${super.$style}
      :host {
        --ctrl-icon-img: var(--ctrl-time-icon-img-lg);
        --ctrl-icon-img: var(--ctrl-time-icon-img);
      }
      :host wup-calendar {
        margin: 0;
      }
      :host [menu] {
        overflow: hidden;
        position: relative;
      }
      :host [menu] ul {
        margin: 0;
        padding: 0;
        list-style-type: none;
        cursor: pointer;
        overflow: auto;
        text-align: center;
        display: inline-block;
        vertical-align: middle;
      }
      :host ul:after {
        z-index: -1;
        content: " ";
        position: absolute;
        display: block;
        top: 50%; left: 50%;
        transform: translate(-50%,-50%);
        width: 100%;
        height: 3em;
        background: var(--ctrl-time-current-bg);
      }
      :host [menu] li,
      :host [menu] mark {
        padding: 1em 1.2em;
        height: 1em;
        border-radius: 50%;
      }
      :host [menu] mark {
        z-index: -1;
        position: absolute;
        display: block;
        top: 50%; left: 2em;
        transform: translateY(-50%);
        font: inherit;
        font-weight: bold;
        background: none;
        color: inherit;
        margin: 0;
      }
      :host [menu] li[aria-selected=true],
      :host [menu] li[disabled] {
        font-weight: bold;
        color: var(--ctrl-time-current);
      }
      :host [menu] li[focused] {
        position: relative;
      }
      :host [menu] li[focused]:after {
        ${focusStyle}
      }
      :host [menu] li[disabled] {
        pointer-events: none;
        touch-action: none;
        color: transparent;
      }
      @media (hover: hover) {
        :host [menu] li:hover {
          position: relative;
        }
        :host [menu] li:hover:after {
         ${focusStyle}
        }
      }`;
  }

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUP.Time.Options>;
    arr.push("format", "step");
    return arr;
  }

  static get observedAttributes(): Array<string> {
    const arr = super.observedAttributes as Array<LowerKeys<WUP.Time.Attributes>>;
    arr.push("format", "min", "max", "step");
    return arr;
  }

  static $defaults: WUP.Time.Defaults = {
    ...WUPBaseComboControl.$defaults,
    step: 1,
    validationRules: {
      ...WUPBaseComboControl.$defaults.validationRules,
      min: (v, setV, c) =>
        (v === undefined || v < setV) && `Min value is ${setV.format((c as WUPTimeControl)._opts.format)}`,
      max: (v, setV, c) =>
        (v === undefined || v > setV) && `Max value is ${setV.format((c as WUPTimeControl)._opts.format)}`,
    },
  };

  // @ts-expect-error reason: validationRules is different
  $options: WUP.Time.Options = {
    ...this.#ctr.$defaults,
    format: localeInfo.time,
  };

  // @ts-expect-error reason: validationRules is different
  protected override _opts = this.$options;

  /** Parse string to WUPTimeObject */
  override parse(text: string): ValueType | undefined {
    /* istanbul ignore else */
    if (!text) {
      return undefined;
    }
    return new WUPTimeObject(text) as any;
  }

  /** Called to parse input text to value (related to locale or pointed format) */
  override parseInput(text: string): ValueType | undefined {
    if (!text) {
      return undefined;
    }
    return new WUPTimeObject(text) as any;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override canParseInput(_text: string): boolean {
    return !this.refMask || this.refMask.isCompleted;
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Time.Options> | null): void {
    this._opts.format = (this.getAttribute("format") ?? this._opts.format)?.replace(/\D{0,1}(ss|SS)/, "") || "hh:mm A";

    this._opts.mask =
      this._opts.mask ??
      this._opts.format
        .replace(/hh|HH/, "00") //
        .replace(/[hH]/, "#0")
        .replace(/mm|MM/, "00")
        .replace(/[mM]/, "#0") // convert hh-mm > 00-00; h/m > #0/#0
        .replace(/a/, "//[aApP]//m")
        .replace(/A/, "//[aApP]//M");
    this._opts.maskholder =
      this._opts.maskholder ??
      this._opts.format
        .replace(/([mMhH]){1,2}/g, "$1$1")
        .replace(/a/, "*m")
        .replace(/A/, "*M");

    this._opts.min = this.parse(this.getAttribute("min") || "") ?? this._opts.min;
    this._opts.max = this.parse(this.getAttribute("max") || "") ?? this._opts.max;
    this._opts.step = Number.parseInt(this.getAttribute("step") || "", 10) || 5;

    super.gotChanges(propsChanged as any);
  }

  protected get validations(): WUP.Text.Options["validations"] {
    const vls = (super.validations as WUP.Time.Options["validations"])!; // undefined impossible because of textControl || {};
    // user can type not valid value according to options min,max,exclude. So need to enable validations rules in this case
    if (this._opts.min) vls.min = this._opts.min;
    if (this._opts.max) vls.max = this._opts.max;
    return vls as WUP.BaseControl.Options["validations"];
  }

  $refHours?: HTMLElement & { _scrolled: WUPScrolled; _value: number };
  $refMinutes?: HTMLElement & { _scrolled: WUPScrolled; _value: number };
  $refHours12?: HTMLElement & { _scrolled: WUPScrolled; _value: number };

  protected override async renderMenu(popup: WUPPopupElement, menuId: string, rows = 1): Promise<HTMLElement> {
    // todo with rows = 1 no selected items & AM/PM bold affects on width
    popup.$options.minWidthByTarget = false;

    const append = (parent: HTMLElement, v: number, twoDigs: boolean): HTMLElement => {
      const li = parent.appendChild(document.createElement("li"));
      li.textContent = twoDigs && v < 10 ? `0${v}` : v.toString();
      return li;
    };

    const drows = Math.round(rows / 2) - 1;
    const hh = this.$value?.hours || 0;
    const mm = this.$value?.minutes || 0;

    // render hours
    const lh = document.createElement("ul");
    lh.setAttribute("id", menuId);
    // todo what about role="listbox"
    popup.appendChild(lh);
    const h12 = /[aA]$/.test(this._opts.format);
    const hh2 = /[hH]+/g.exec(this._opts.format)![0].length === 2;
    const renderHours = (v: number): HTMLElement => append(lh, v, hh2);

    // render minutes
    const lm = document.createElement("ul");
    popup.appendChild(lm);
    const mm2 = /[mM]+/g.exec(this._opts.format)![0].length === 2;
    const renderMinutes = (v: number): HTMLElement => append(lm, v, mm2);
    const { step } = this._opts;

    const selectNext = (prev: WUP.Scrolled.State, next: WUP.Scrolled.State): void => {
      this._selectedMenuItem = prev.items[0];
      next.items[0] && this.selectMenuItem(next.items[0]);
    };

    // carousel for hours
    this.$refHours = lh as any as HTMLElement & { _scrolled: WUPScrolled; _value: number };
    this.$refHours._scrolled = new WUPScrolled(lh, {
      // hours 0..23 pages 0..23
      swipeDebounceMs: 100,
      scrollToClick: true,
      pages: { current: h12 ? hh % 12 : hh, total: h12 ? 12 : 24, before: drows, after: drows, cycled: true },
      onRender: (_dir, v, prev, next) => {
        const items = [renderHours(v)];
        v = h12 && v === 0 ? 12 : v;
        this.$refHours!._value = next.index;
        if (rows === 1) {
          next.items = items;
        }
        selectNext(prev, next);
        return items;
      },
    });

    // carousel for minutes
    this.$refMinutes = lm as any as HTMLElement & { _scrolled: WUPScrolled; _value: number };
    this.$refMinutes._scrolled = new WUPScrolled(lm, {
      swipeDebounceMs: 100,
      scrollToClick: true,
      // minutes 0..59 pages 0..12
      pages: {
        current: Math.round(mm / step),
        total: Math.round(60 / step),
        before: drows,
        after: drows,
        cycled: true,
      },
      onRender: (_dir, v, prev, next) => {
        const items = [renderMinutes(v)];
        v = Math.round(v * step);
        this.$refMinutes!._value = Math.round(next.index * step);
        if (rows === 1) {
          next.items = items;
        }
        selectNext(prev, next);
        return items;
      },
    });

    if (h12) {
      // 12AM..1AM...11AM  12PM..1PM....11PM
      // 00    01    11    12    13     23
      const lower = this._opts.format.endsWith("a");
      const lh12 = document.createElement("ul");
      popup.appendChild(lh12);
      // carousel for hours
      this.$refHours12 = lh12 as any as HTMLElement & { _scrolled: WUPScrolled; _value: number };
      this.$refHours12._scrolled = new WUPScrolled(lh12, {
        swipeDebounceMs: 100,
        scrollToClick: true,
        // pm => empty, PM, AM, /*empty*/
        // am => /*empty*/, PM, AM, empty
        pages: { current: this.$value?.isPM ? 1 : 2, total: 4, before: Math.min(drows, 1), after: Math.min(drows, 1) },
        onRender: (_dir, v, prev, next) => {
          if (next.index === 0 || next.index === 3) {
            return null;
          }
          selectNext(prev, next);
          this.$refHours12!._value = next.index;
          const item = document.createElement("li");
          item.textContent = (lower ? ["am", "pm", "am", "am"] : ["AM", "PM", "AM", "AM"])[v];
          (v === 0 || v === 3) && item.setAttribute("disabled", ""); // WARN: intead of empty need render invisible AM otherwise AM bold affects on width
          return [item];
        },
      });
    }
    // todo add Ok/Cancel for popup otherwise we can't define if user is finished

    // render hh:mm separator
    const sep = document.createElement("mark");
    sep.setAttribute("aria-hidden", true);
    sep.textContent = /[hH]([^hH])/.exec(this._opts.format)![1]!;
    popup.appendChild(sep);

    return Promise.resolve(lh);
  }

  protected override setValue(v: ValueType | undefined, canValidate = true, skipInput = false): boolean | null {
    return super.setValue(v, canValidate, skipInput);
  }

  protected override valueToInput(v: ValueType | undefined): Promise<string> | string {
    if (v === undefined) {
      return "";
    }
    return v.format(this._opts.format);
  }

  protected override resetInputValue(): void {
    // don't call super because validation is appeared
  }

  protected override gotInput(e: WUP.Text.GotInputEvent): void {
    super.gotInput(e, true);
    // todo replace a to A, A to a on the fly
  }

  protected override gotKeyDown(e: KeyboardEvent): Promise<void> {
    // todo handle select
    const wasOpen = this.$isOpen;
    const r = super.gotKeyDown(e);
    if (wasOpen) {
      let isNext = false;
      switch (e.key) {
        case "ArrowDown":
          isNext = true;
        // eslint-disable-next-line no-fallthrough
        case "ArrowUp":
          {
            const { chunks: ch } = this.refMask!;
            let { chunk } = this.refMask!.findChunkByCursor(this.$refInput.selectionStart!);
            if (!chunk.isVar) {
              chunk = ch[chunk.index + 1] || ch[chunk.index - 1]; // when cursor at the end of suffix
            }
            const hhChunk = ch.find((c) => c.isVar)!;
            const mmChunk = ch.find((c, i) => i > hhChunk.index && c.isVar)!;
            const h12Chunk = ch.find((c, i) => i > mmChunk.index && c.isVar);
            switch (chunk) {
              case hhChunk:
                this.$refHours!._scrolled.goTo(isNext);
                break;
              case mmChunk:
                this.$refMinutes!._scrolled.goTo(isNext);
                break;
              case h12Chunk:
                {
                  const v = this.$refHours12!._value;
                  const to = (isNext && v === 2 && 1) || (!isNext && v === 1 && 2) || (isNext ? v + 1 : v - 1);
                  this.$refHours12!._scrolled.goTo(to);
                }
                break;
              default:
                break;
            }
          }
          break;
        default:
          break;
      }
    }
    return r;
  }
}

customElements.define(tagName, WUPTimeControl);
// testcase: increment carousel for hh:mm in both directions
