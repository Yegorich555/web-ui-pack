/* eslint-disable prefer-destructuring */
import { AttributeMap, AttributeTypes } from "../baseElement";
import onEvent from "../helpers/onEvent";
import WUPScrolled from "../helpers/scrolled";
import localeInfo from "../objects/localeInfo";
import WUPTimeObject from "../objects/timeObject";
import WUPPopupElement from "../popup/popupElement";
import { WUPcssIcon } from "../styles";
import WUPBaseComboControl, { HideCases, ShowCases } from "./baseCombo";
import { SetValueReasons } from "./baseControl";

const tagName = "wup-time";

declare global {
  namespace WUP.Time {
    interface EventMap extends WUP.BaseCombo.EventMap {}
    interface ValidityMap extends WUP.BaseCombo.ValidityMap {
      /** Enabled if option [min] is pointed; If $value < pointed shows message 'Min time is {x}` */
      min: WUPTimeObject;
      /** Enabled if option [min] is pointed; if $value > pointed shows message 'Max time is {x}` */
      max: WUPTimeObject;
      /** User can't select time in excluded range */
      exclude: { test: (v: WUPTimeObject) => boolean };
    }
    interface NewOptions {
      /** String representation of displayed time (enables mask, - to disable mask set $options.mask="");
       * @defaultValue localeInfo.time
       * @example `hh:mm a` or `h:m`
       * @tutorial Troubleshooting
       * * with changing $options.format need to change/reset mask/maskholder also */
      format: string;
      /** Increment value in minutes
       *  @defaultValue 1
       * @tutorial Troubleshooting
       * If set step = 5 user still able to set minutes not divisible step */
      step: number;
      /** Set `false` to hide menu buttons 'Ok' & 'Cancel'
       * @tutorial Troubleshooting
       * in this case any changing selection in menu changes value & input; so user don't need to press Enter
       * but if press escape: menu closed and value reverted to that was before
       * @defaultValue false */
      menuButtonsOff: boolean;
      /** User can't select time less than min */
      min: WUPTimeObject | null;
      /** User can't select time more than max */
      max: WUPTimeObject | null;
      /** User can't select time in excluded range */
      exclude: { test: (v: WUPTimeObject) => boolean } | null;
    }
    interface Options<T = WUPTimeObject, VM = ValidityMap> extends WUP.BaseCombo.Options<T, VM>, NewOptions {}
    interface JSXProps<C = WUPTimeControl> extends WUP.BaseCombo.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      /** Default value in format hh:mm or hh:mm a */
      "w-initValue"?: string;
      "w-format"?: string;
      "w-step"?: number;
      "w-menuButtonsOff"?: boolean | "";
      /** User can't select date less than min; format hh:mm */
      "w-min"?: string;
      /** User can't select date more than max; format hh:mm */
      "w-max"?: string;
      /** Points that user can't choose
      /** Global reference to object with array
       * @example
       * ```js
       * window.exclude = [new WUPTimeObject("02:30"), ...];
       * <wup-time w-exclude="window.exclude"></wup-time>
       * ``` */
      "w-exclude"?: string;
    }

    interface MenuListElement extends HTMLElement {
      _scrolled: WUPScrolled;
      _value: number;
      goToNext(isNext: boolean): void;
      reinit(): void;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPTimeControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with timepicker
       *  @see {@link WUPTimeControl} */
      [tagName]: WUP.Time.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

/** Form-control with timepicker
 * @tutorial Troubleshooting
 * * $options.format related only to displayed text, to work with other time-options like min/max use strict format 'hh:mm'
 * * if increase `--ctrl-icon-size`: change `ctrl-icon-img` to `--ctrl-icon-img: var(--ctrl-time-icon-img-lg)`: otherwise quality is ugly on larger icon
 * @example
  const el = document.createElement("wup-time");
  el.$options.name = "time";
  el.$initValue = new WUPTimeObject(22, 15);
  el.$options.validations = { required: true, min=new WUPTimeObject(01,05), max=new WUPTimeObject(23,00), exclude= };
  el.$options.format = "hh-mm A";
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-time w-name="time" w-initvalue="22:15" w-min="01:05" w-max="23:00"/>
  </wup-form>; */
export default class WUPTimeControl<
  ValueType extends WUPTimeObject = WUPTimeObject,
  TOptions extends WUP.Time.Options = WUP.Time.Options,
  EventMap extends WUP.Time.EventMap = WUP.Time.EventMap
> extends WUPBaseComboControl<ValueType, TOptions, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTimeControl;

  /** Text announced by screen-readers when button Ok pressed in menu; @defaultValue `Ok` */
  static $ariaOk = "Ok";
  /** Text announced by screen-readers when button Cancel pressed in menu; @defaultValue `Cancel` */
  static $ariaCancel = "Cancel";
  /** Aria-label for list in menu; @defaultValue `Hours` */
  static $ariaHours = "Hours";
  /** Aria-label for list in menu; @defaultValue `Minutes` */
  static $ariaMinutes = "Minutes";
  /** Aria-label for list in menu; @defaultValue `AM PM` */
  static $ariaHours12 = "AM PM";

  // --ctrl-time-icon-img-png-20: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAABiAAAAYgH4krHQAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAYJJREFUOI2l1L9qVUEQBvCf5+JFUBBbJQi2SSW+gLFV88ck2tmaBJE8gen8h/gCWklInzZ5h4BKIkkUtFD7BDGF91jsHLJe7tl70Q+GPTvzzcfOnJ1lMLq4h3V8xFHYLtawEJyRMI/PqIfYAWZKQh28zBLe4RHGcTZsPHzvM95zVIMEG7FfWGwjBSos4ThynvUT5jKx66Uy+jCZiU43zi4+hfNBS2KN1ZbYcsT3Q8tdJz1rK7Mk2MGH4MxX2VFfo9eSVMJvvInvqQpXY7P1D2INNmO9VuFibL7+h+CXWC9VUu1wakjSTUwM4dQVvsdmrEC8hQvYxiuc74tfjvUbaTZraQJKOIPH+IkfuJ/FVkLjLWnQa2mcOkNE4Qo24iD8fW3mSJfxIBxLIwg2aF6bh5G7h9NNcDacx9I4jYobkdPD7f7gi0x0Wbn8TpysmeMng0hVJlpLfVmRrsq5sInwNT3r4anyy2TWSU9LtoepklCOrvT316Rn/wiH2JGuxh3ZD8jxB6xmcQf6l8SZAAAAAElFTkSuQmCC');
  static get $styleRoot(): string {
    return `:root {
        --ctrl-time-icon-img-lg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M383.615 0C171.647 0 0 172.032 0 384s171.648 384 383.615 384c212.352 0 384.383-172.032 384.383-384S595.966 0 383.615 0zM384 691.199C214.272 691.199 76.801 553.727 76.801 384S214.273 76.801 384 76.801c169.728 0 307.199 137.472 307.199 307.199S553.727 691.199 384 691.199zm-38.401-499.198h57.6v201.6l172.8 102.528-28.8 47.232-201.6-120.96v-230.4z' /%3E%3C/svg%3E");
        --ctrl-time-icon-img: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAABOAAAATgGxzR8zAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAASxJREFUOI2V00kuRFEUBuCvXqLMrEBIRBeKxCIMrcFAYguMRMz13QYwESxAMxIjXYKEiIHYAQYSTRncU1JRT+FPbnLfOf9/unsetejHPK7wHOcSsyjl8L/QiBW84wMnWItzGrY3LKKYJz5AGZtoy0nQjq3g7H0PshqOiXolBiaDu1Ax9EXZmznkY4zm2LeldnozjKCA8T9kr2AMGUYyDEpDuvtHgFucYzBDC27+Ia7gGq2ZNJDCD6QXDKMnx1cg9fGArh8CDOFM2olpNFX5unEPc9KStNcpdwBHOIzvztDMkNbzTVqSeiigOe47oflqbVmaxeQvQWAquPPVxiL2w7GNjhxhZ2QuYxcN3wlFLEVpH9Lw1rER9zJepZnViKtRkn7dSzzhERfSK9Q85ye76kkmcVhDgAAAAABJRU5ErkJggg==');
        --ctrl-time-current: var(--base-text);
        --ctrl-time-current-bg: #d9f7fd;
      }`;
  }

  static get $style(): string {
    // WARN: "99" & "AM" in ul:after required to fix width changing by font-bold: https://codepen.io/hexagoncircle/pen/WNrYPLo
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
      :host > [menu] {
        overflow: hidden;
      }
      :host > [menu]>div:first-child {
        position: relative;
      }
      :host > [menu] ul {
        margin: 0;
        padding: 0;
        list-style-type: none;
        cursor: pointer;
        overflow: auto;
        text-align: center;
        display: inline-block;
        vertical-align: middle;
      }
      :host > [menu] li,
      :host > [menu] mark,
      :host > [menu] ul:after {
        padding: 1em;
        line-height: 1em;
      }
      :host > [menu] mark {
        z-index: -1;
        position: absolute;
        display: block;
        top:50%; left:0; right:0;
        transform: translateY(-50%);
        margin: 0; padding-left: 2.8em;
        font: inherit;
        background: var(--ctrl-time-current-bg);
      }
      :host > [menu] ul:after {
        content: "99";
        height: 0;
        margin:0; padding-top:0; padding-bottom:0;
        visibility: hidden;
        overflow: hidden;
        user-select: none;
        pointer-events: none;
        display: block;
      }
      :host > [menu] ul:nth-child(3):after {
         content: "AM";
      }
      :host > [menu] li[aria-selected=true],
      :host > [menu] mark,
      :host > [menu] ul:after {
        font-weight: bold;
        color: var(--ctrl-time-current);
      }
      :host > [menu] li[focused] {
        position: relative;
      }
      :host > [menu] li[focused]:after {
        ${focusStyle}
      }
      :host > [menu] li[aria-hidden] {
        pointer-events: none;
        touch-action: none;
        opacity: 0;
      }
      :host > [menu] li[disabled] {
        color: var(--ctrl-err-text);
        --ctrl-focus: var(--ctrl-err-text);
        //background-color: var(--ctrl-err-bg);
      }
      :host > [menu] [group] {
        display: flex;
        gap: 1px;
        padding-top: 1px;
        background: var(--base-sep);
      }
      :host > [menu] button {
        cursor: pointer;
        flex: 1 1 50%;
        display: inline-flex;
        align-content: center;
        justify-content: center;
        height: 2.4em;
        border: none;
        border-radius: 0;
        padding: 0; margin: 0;
        background: var(--base-btn3-bg);
      }
      :host > [menu] button:first-child {
        --ctrl-icon-img: var(--wup-icon-check);
        --ctrl-icon: var(--ctrl-err-icon-valid);
        border-bottom-left-radius: var(--border-radius);
      }
      :host > [menu] button:last-child {
        --ctrl-icon-img: var(--wup-icon-cross);
        --ctrl-icon: var(--ctrl-err-text);
        border-bottom-right-radius: var(--border-radius);
      }
      :host > [menu] button:after {
        ${WUPcssIcon}
        content: "";
        padding:0;
      }
      @media (hover: hover) and (pointer: fine) {
        :host > [menu] li:hover {
          position: relative;
        }
        :host > [menu] li:hover:after {
         ${focusStyle}
        }
        :host > [menu] button:hover {
          box-shadow: inset 0 0 0 99999px rgb(0 0 0 / 10%);
        }
      }
      :host > [menu] button[disabled] {
         box-shadow: inset 0 0 0 99999px rgb(0 0 0 / 5%);
         cursor: not-allowed;
         --ctrl-icon: inherit;
      }`;
  }

  static get mappedAttributes(): Record<string, AttributeMap> {
    const m = super.mappedAttributes;
    m.min.type = AttributeTypes.parsedObject;
    m.max.type = AttributeTypes.parsedObject;
    return m;
  }

  static $defaults: WUP.Time.Options = {
    ...WUPBaseComboControl.$defaults,
    validationRules: {
      ...WUPBaseComboControl.$defaults.validationRules,
      min: (v, setV, c) =>
        (v === undefined || v < setV) && `Min value is ${setV.format((c as WUPTimeControl)._opts.format)}`,
      max: (v, setV, c) =>
        (v === undefined || v > setV) && `Max value is ${setV.format((c as WUPTimeControl)._opts.format)}`,
      exclude: (v, fn) => (v === undefined || fn.test(v)) && "This value is disabled",
    },
    step: 1,
    format: "",
    min: null,
    max: null,
    exclude: null,
    menuButtonsOff: false,
  };

  constructor() {
    super();
    this._opts.format = this.#ctr.$defaults.format || localeInfo.time; // init here to depend on localeInfo
  }

  /** Parse string to WUPTimeObject */
  override parse(text: string): ValueType | undefined {
    if (!text) {
      return undefined;
    }
    return new WUPTimeObject(text) as any;
  }

  /** Called to parse input text to value (related to locale or pointed format) */
  override parseInput(text: string): ValueType | undefined {
    return new WUPTimeObject(text) as any;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override canParseInput(_text: string): boolean {
    return !this.refMask || this.refMask.isCompleted;
  }

  override valueToUrl(v: ValueType): string {
    return v.toString("-");
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Time.Options> | null): void {
    this._opts.format = this._opts.format?.replace(/\D{0,1}(ss|SS)/, "") || "hh:mm A";

    this._opts.mask ||= this._opts.format
      .replace(/hh|HH/, "00") //
      .replace(/[hH]/, "#0")
      .replace(/mm|MM/, "00")
      .replace(/[mM]/, "#0") // convert hh-mm > 00-00; h/m > #0/#0
      .replace(/a/, "//[ap]//m")
      .replace(/A/, "//[AP]//M");
    this._opts.maskholder ||= this._opts.format
      .replace(/([mMhH]){1,2}/g, "$1$1")
      .replace(/a/, "*m")
      .replace(/A/, "*M");

    this._opts.step ||= this.#ctr.$defaults.step;
    super.gotChanges(propsChanged as any);
  }

  $refMenuLists?: WUP.Time.MenuListElement[];
  $refButtonOk?: HTMLButtonElement;
  $refButtonCancel?: HTMLButtonElement;
  protected override get validations(): WUP.Text.Options["validations"] {
    const vls = (super.validations as WUP.Time.Options["validations"])!; // undefined impossible because of textControl || {};
    // user can type not valid value according to options min,max,exclude. So need to enable validations rules in this case
    if (this._opts.min) vls.min = this._opts.min;
    if (this._opts.max) vls.max = this._opts.max;
    if (this._opts.exclude) vls.exclude = this._opts.exclude;
    return vls as WUP.BaseControl.Options["validations"];
  }

  /** Set [disabled] for items according to $options.min & max */
  protected disableItems(): void {
    // eslint-disable-next-line prefer-const
    let { min, max, exclude } = this._opts;
    if ((!min && !max && !exclude) || !this.$refMenuLists) {
      return;
    }

    min ??= 0 as unknown as WUPTimeObject;
    max ??= WUPTimeObject.$maxValue as unknown as WUPTimeObject;
    for (let n = 0; n < 2; ++n) {
      const lst = this.$refMenuLists[n];
      const was = lst._value;
      for (let i = 0; i < lst.children.length; ++i) {
        const el = lst.children.item(i)!;
        lst._value = (el as any)._value;
        const v = this.getMenuValue();
        const isDisabled = v < min || v > max || exclude?.test(v);
        this.setAttr.call(el, "disabled", isDisabled, true);
      }
      lst._value = was;
    }
    const lst = this.$refMenuLists[2];
    if (lst) {
      for (let i = 0; i < lst.children.length; ++i) {
        const el = lst.children.item(i)!;
        const isPM = (el as any)._value === 2;
        const isDisabled = (isPM && max < new WUPTimeObject(12, 0)) || (!isPM && min > new WUPTimeObject(11, 0));
        this.setAttr.call(el, "disabled", isDisabled, true);
      }
    }
    const v = this.getMenuValue();
    const isDisabled = v < min || v > max || exclude?.test(v);
    this.$refButtonOk && this.setAttr.call(this.$refButtonOk!, "disabled", isDisabled, true);
  }

  #isMenuInitPhase?: boolean;
  /** Value before menu is opened */
  #valueBeforeMenu?: ValueType;
  protected override renderMenu(popup: WUPPopupElement, menuId: string, rows = 5): HTMLElement {
    popup.$options.minWidthByTarget = false;
    this.#isMenuInitPhase = true;
    const append = (ul: HTMLElement, v: number | string, twoDigs: boolean, savedV?: number): HTMLElement => {
      const li = ul.appendChild(document.createElement("li"));
      li.textContent = twoDigs && +v < 10 ? `0${v}` : v.toString();
      (li as any)._value = savedV ?? v;
      return li;
    };
    const selectNext = (prev: WUP.Scrolled.State, next: WUP.Scrolled.State): void => {
      this.#lastInputChanged = false;
      const el = next.items[0];
      if (el) {
        // WARN: with such behavior user listens for cnt items in the list but it's wrong since it's carousel with virtualization
        this._selectedMenuItem = prev.items[0];
        this.selectMenuItem(el);
        this._selectedMenuItem = undefined; // otherwise selection is cleared after popup-close
        this._focusedMenuItem && this.focusMenuItem(next.items[0]);
      }
      !this.#isMenuInitPhase && this.$isShown && this.disableItems();
    };

    const drows = Math.round(rows / 2) - 1;
    // select value if user click on item but scrollNext isn't processed
    const onClickSkip = this._opts.menuButtonsOff
      ? () => this.setValue(this.getMenuValue(), SetValueReasons.userSelect)
      : undefined;

    // div required for centering absolute items during the animation
    const parent = popup.appendChild(document.createElement("div"));
    parent.setAttribute("id", menuId);
    parent.setAttribute("role", "application");
    this.$refMenuLists = [];

    // render hours
    const getCurHours = (): number => {
      const hh = this.$value ? this.$value.hours : new Date().getHours();
      return h12 ? hh % 12 : hh;
    };
    const lh = parent.appendChild(document.createElement("ul")) as any as WUP.Time.MenuListElement;
    lh.setAttribute("aria-label", this.#ctr.$ariaHours);
    this.$refMenuLists.push(lh);
    const h12 = /[aA]$/.test(this._opts.format);
    const hh2 = /[hH]+/g.exec(this._opts.format)![0].length === 2;
    // carousel for hours
    lh._scrolled = new WUPScrolled(lh, {
      // hours 0..23 pages 0..23
      swipeDebounceMs: 100,
      scrollByClick: true,
      onClickSkip,
      pages: { current: getCurHours(), total: h12 ? 12 : 24, before: drows, after: drows, cycled: true },
      onRender: (_dir, v, prev, next) => {
        v = h12 && v === 0 ? 12 : v;
        const items: HTMLElement[] = [append(lh, v, hh2)];
        lh._value = next.index;
        next.items = rows === 1 ? items : next.items;
        selectNext(prev, next);
        return items;
      },
    });
    lh.goToNext = (v) => lh._scrolled.goTo(v);
    lh.reinit = () => {
      lh._scrolled.options.pages!.current = getCurHours();
      lh._scrolled.init();
    };

    // render minutes
    const getCurMinutes = (): number =>
      Math.round((this.$value ? this.$value.minutes : new Date().getMinutes()) / step);
    const lm = parent.appendChild(document.createElement("ul")) as any as WUP.Time.MenuListElement;
    lm.setAttribute("aria-label", this.#ctr.$ariaMinutes);
    this.$refMenuLists.push(lm);
    const mm2 = /[mM]+/g.exec(this._opts.format)![0].length === 2;
    const { step } = this._opts;
    // carousel for minutes
    lm._scrolled = new WUPScrolled(lm, {
      swipeDebounceMs: 100,
      scrollByClick: true,
      onClickSkip,
      // minutes 0..59 pages 0..12
      pages: {
        current: getCurMinutes(),
        total: Math.round(60 / step),
        before: drows,
        after: drows,
        cycled: true,
      },
      onRender: (_dir, v, prev, next) => {
        v = Math.round(v * step);
        const items = [append(lm, v, mm2)];
        lm._value = Math.round(next.index * step);
        next.items = rows === 1 ? items : next.items;
        selectNext(prev, next);
        return items;
      },
    });
    lm.goToNext = (v) => lm._scrolled.goTo(v);
    lm.reinit = () => {
      lm._scrolled.options.pages!.current = getCurMinutes();
      lm._scrolled.init();
    };

    if (h12) {
      // render AM/PM
      // 12AM..1AM...11AM  12PM..1PM....11PM
      // 00    01    11    12    13     23
      const lower = this._opts.format.endsWith("a");
      const lh12 = parent.appendChild(document.createElement("ul")) as any as WUP.Time.MenuListElement;
      lh12.setAttribute("aria-label", this.#ctr.$ariaHours12);
      this.$refMenuLists.push(lh12);
      // carousel for hours
      lh12._scrolled = new WUPScrolled(lh12, {
        swipeDebounceMs: 100,
        scrollByClick: true,
        onClickSkip,
        // pm => empty, PM, AM, /*empty*/
        // am => /*empty*/, PM, AM, empty
        pages: { current: this.$value?.isPM ? 2 : 1, total: 4, before: Math.min(drows, 1), after: Math.min(drows, 1) },
        onRender: (_dir, v, prev, next) => {
          if (next.index === 0 || next.index === 3) {
            return null;
          }
          lh12._value = next.index;
          const txt = (lower ? ["pm", "am", "pm", "am"] : ["PM", "AM", "PM", "AM"])[v];
          const item = append(lh12, txt, false, v);
          if (v === 0 || v === 3) {
            item.setAttribute("aria-hidden", true);
          }
          const items = [item];
          next.items = rows === 1 ? items : next.items;
          selectNext(prev, next);
          return items;
        },
      });
      lh12.goToNext = (isNext) => {
        const v = lh12._value;
        const to = (isNext && v === 2 && 1) || (!isNext && v === 1 && 2) || (isNext ? v + 1 : v - 1);
        lh12._scrolled.goTo(to);
      };
    }

    // render hh:mm separator
    const sep = document.createElement("mark");
    sep.setAttribute("aria-hidden", true);
    sep.textContent = /[hH]([^hH])/.exec(this._opts.format)![1]!;
    parent.appendChild(sep);
    !this._opts.menuButtonsOff && this.renderMenuButtons(popup);
    this.#isMenuInitPhase = false;
    return parent;
  }

  protected renderMenuButtons(popup: WUPPopupElement): void {
    // render Ok/Cancel otherwise we can't define if user is finished
    const btns = popup.appendChild(document.createElement("div"));
    btns.setAttribute("group", "");
    const btnOk = btns.appendChild(document.createElement("button"));
    btnOk.setAttribute("type", "button");
    btnOk.setAttribute("aria-label", this.#ctr.$ariaOk);
    btnOk.setAttribute("tabindex", -1);
    this.$refButtonOk = btnOk;

    const btnCancel = btns.appendChild(document.createElement("button"));
    btnCancel.setAttribute("type", "button");
    btnCancel.setAttribute("aria-label", this.#ctr.$ariaCancel);
    btnCancel.setAttribute("tabindex", -1);
    this.$refButtonCancel = btnCancel;

    // handle click on buttons
    onEvent(
      btns,
      "click",
      (e) => {
        e.preventDefault(); // to prevent popup-hide-show
        const t = e.target as Node | HTMLElement;
        let isOk: boolean | null = null;
        if (btnOk === t || this.includes.call(btnOk, t)) {
          isOk = true;
        } else if (btnCancel === t || this.includes.call(btnCancel, t)) {
          isOk = false;
        }
        isOk !== null && this.gotBtnsClick(e, isOk);
      },
      { passive: false }
    );
  }

  protected override async goShowMenu(
    showCase: ShowCases,
    e?: MouseEvent | FocusEvent | null
  ): Promise<WUPPopupElement | null> {
    const r = await super.goShowMenu(showCase, e);

    this.#valueBeforeMenu = this.$value;
    this.#lastInputChanged = false;
    const v = this.$value;
    if (this.$refMenuLists && v) {
      this.#isMenuInitPhase = true; // to avoid calling trySetaValue on reRender
      const menuV = this.getMenuValue();
      menuV.hours !== v.hours && this.$refMenuLists[0].reinit();
      menuV.minutes !== v.minutes && this.$refMenuLists[1].reinit();
      this.$refMenuLists[2]?._scrolled.goTo(v.isPM ? 2 : 1, false);
      this.#isMenuInitPhase = false;
    }
    this.disableItems();

    return r;
  }

  protected override removePopup(): void {
    super.removePopup();
    delete this.$refMenuLists;
    delete this.$refButtonOk;
    delete this.$refButtonCancel;
  }

  /** Cast selected items in menu to WUPTimeObject */
  protected getMenuValue(): ValueType {
    const hh = this.$refMenuLists![0]._value;
    const mm = this.$refMenuLists![1]._value;
    const h12 = this.$refMenuLists![2]?._value;
    return new WUPTimeObject(h12 != null && hh === 0 ? 12 : hh, mm, h12 ? h12 === 2 : undefined) as ValueType;
  }

  /** Called when need to change/cancel changing & close */
  protected gotBtnsClick(e: MouseEvent, isOk: boolean): void {
    if (isOk) {
      this.selectValue(this.getMenuValue());
    } else {
      setTimeout(() => this.goHideMenu(HideCases.OnPressEsc, e)); // without timeout it handles click by listener and opens again
    }
  }

  /** Set value base on menu-selected if menuButtons is off */
  protected trySetValue(): void {
    this._opts.menuButtonsOff &&
      !this.#isMenuInitPhase &&
      this.setValue(this.getMenuValue(), SetValueReasons.userSelect);
  }

  protected override selectMenuItem(next: HTMLElement | null): void {
    super.selectMenuItem(next);
    next !== null && this.trySetValue();
  }

  protected override goHideMenu(hideCase: HideCases, e?: MouseEvent | FocusEvent | null | undefined): Promise<boolean> {
    hideCase === HideCases.OnPressEsc &&
      this._opts.menuButtonsOff &&
      this.setValue(this.#valueBeforeMenu, SetValueReasons.clear);
    return super.goHideMenu(hideCase, e);
  }

  protected override valueToInput(v: ValueType | undefined): string {
    if (v === undefined) {
      return "";
    }
    return v.format(this._opts.format);
  }

  protected override resetInputValue(): void {
    // don't call super because validation is appeared
  }

  #lastInputChanged = false; // if press Enter: need to get value from last touched field (input OR menu)
  protected override gotInput(e: WUP.Text.GotInputEvent): void {
    this.#lastInputChanged = true;
    super.gotInput(e);
  }

  // /** Returns current menu list index that user operates with hours/minutes/h12 */
  // protected findActiveMenuList(): number {
  //   if (!this.$refMenuLists) {
  //     return -1;
  //   }
  //   const { chunks: ch } = this.refMask!;
  //   let { chunk } = this.refMask!.findChunkByCursor(this.$refInput.selectionStart!);
  //   if (!chunk.isVar) {
  //     chunk = ch[chunk.index + 1] || ch[chunk.index - 1]; // when cursor at the end of suffix
  //   }
  //   const hhChunk = ch.find((c) => c.isVar)!;
  //   if (chunk === hhChunk) {
  //     return 0;
  //   }
  //   const mmChunk = ch.find((c, i) => i > hhChunk.index && c.isVar)!;
  //   if (chunk === mmChunk) {
  //     return 1;
  //   }
  //   const h12Chunk = ch.find((c, i) => i > mmChunk.index && c.isVar);
  //   if (chunk === h12Chunk) {
  //     return 2;
  //   }

  //   return 0;
  // }

  protected override focusMenuItem(next: HTMLElement | null): void {
    if (next) {
      !this.$value && this.trySetValue();
      const v = this.getMenuValue();
      const str = this.valueToInput(v) as string;
      next.setAttribute("aria-label", str);
    }
    this._focusedMenuItem?.removeAttribute("aria-label");
    super.focusMenuItem(next);
  }

  protected override focusMenuItemByKeydown(e: KeyboardEvent): void {
    let isHandled = true;
    let isNext = false;
    const lst = this.$refMenuLists!;
    let ind = (this._focusedMenuItem && lst!.findIndex((ref) => ref.contains(this._focusedMenuItem!))) || 0;
    const initFocus = (i: number): number => (this._focusedMenuItem ? i : 0 /* this.findActiveMenuList() */);
    switch (e.key) {
      case "ArrowLeft":
        ind = Math.max(0, initFocus(ind - 1));
        this.focusMenuItem(lst[ind].querySelector("[aria-selected=true]"));
        break;
      case "ArrowRight":
        ind = Math.min(lst.length - 1, initFocus(ind + 1));
        this.focusMenuItem(lst[ind].querySelector("[aria-selected=true]"));
        break;
      case "ArrowDown":
        isNext = true;
      // eslint-disable-next-line no-fallthrough
      case "ArrowUp":
        ind = initFocus(ind);
        if (!this._focusedMenuItem) {
          this.focusMenuItem(lst[ind].querySelector("[aria-selected=true]"));
        } else {
          this._focusedMenuItem = lst[ind].querySelector("[aria-selected=true]"); // otherwise focusNext not fired on next render
          lst[ind].goToNext(isNext);
        }
        break;
      default:
        isHandled = false;
        break;
    }

    if (isHandled) {
      e.preventDefault();
      this.#lastInputChanged = false;
    }
  }

  protected override gotKeyDown(e: KeyboardEvent): void {
    const wasOpen = this.$isShown;
    const isExtraKey = e.altKey || e.shiftKey || e.ctrlKey;

    // handle Enter key when menu is open
    if (!isExtraKey && wasOpen && e.key === "Enter") {
      e.preventDefault();
      if (this.#lastInputChanged || !this.$refButtonOk) {
        this.goHideMenu(HideCases.OnPressEnter);
      } else if (!this.$refButtonOk!.disabled) {
        setTimeout(() =>
          this.$refButtonOk!.dispatchEvent(new MouseEvent("click", { cancelable: true, bubbles: true }))
        );
      }
      return;
    }

    super.gotKeyDown(e);
  }

  protected override gotFocusLost(): void {
    !this._inputError && this.setInputValue(this.$value, SetValueReasons.userSelect); // case: h:m - try to input 01:23 => expected 1:23
    super.gotFocusLost();
  }
}

customElements.define(tagName, WUPTimeControl);
