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
       *  @defaultValue 5 */
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
      }`;
  }

  static get $style(): string {
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
    step: 5, // todo implement
    validationRules: {
      ...WUPBaseComboControl.$defaults.validationRules,
      min: (v, setV, c) =>
        (v === undefined || v < setV) && `Min date is ${setV.format((c as WUPTimeControl)._opts.format)}`,
      max: (v, setV, c) =>
        (v === undefined || v > setV) && `Max date is ${setV.format((c as WUPTimeControl)._opts.format)}`,
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
    return new WUPTimeObject(text) as ValueType;
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
    this._opts.format = (this.getAttribute("format") ?? this._opts.format)?.replace(/\D{0,1}(ss|SS)/, "") || "hh:mm a";

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

  protected override async renderMenu(popup: WUPPopupElement, menuId: string): Promise<HTMLElement> {
    popup.$options.minWidthByTarget = false;

    const el = document.createElement("div");
    // todo add menu here

    popup.appendChild(el);
    return Promise.resolve(el);
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

  // protected override resetInputValue(): void {
  //   // don't call super because validation is appeared
  // }

  protected override gotInput(e: WUP.Text.GotInputEvent): void {
    super.gotInput(e, true);
    // todo replace a to A, A to a on the fly
  }

  // protected override gotKeyDown(e: KeyboardEvent): Promise<void> {
  //   const wasOpen = this.$isOpen;
  //   switch (e.key) {
  //     case "Test":
  //       break;
  //     default:
  //       break;
  //   }

  //   const r = !e.defaultPrevented && super.gotKeyDown(e);
  //   return r || Promise.resolve();
  // }

  // protected override focusMenuItem(next: HTMLElement | null): void {
  //   super.focusMenuItem(next);
  // }
}

customElements.define(tagName, WUPTimeControl);
