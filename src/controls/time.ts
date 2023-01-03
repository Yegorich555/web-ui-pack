import WUPTimeObject from "../objects/timeObject";
import localeInfo from "../helpers/localeInfo";
import WUPPopupElement from "../popup/popupElement";
import WUPBaseComboControl, { WUPBaseComboIn } from "./baseCombo";

const tagName = "wup-time";

export namespace WUPTimeIn {
  export interface Defs {
    /** String representation of displayed time (enables mask, - to disable mask set $options.mask="");
     * @defaultValue localeInfo.time
     * @tutorial Troubleshooting
     * * with changing $options.format need to change/reset mask/maskholder also */
    format?: string;
    step: number; // todo implement
  }
  export interface Opt {
    /** User can't select time less than min */
    min?: WUPTimeObject;
    /** User can't select time more than max */
    max?: WUPTimeObject;
    /** Times that user can't choose (disabled) */
    exclude?: WUPTimeObject[];
    format: string;
  }
  export interface JSXProps {
    min?: string;
    max?: string;
  }

  export type Generics<
    ValueType = WUPTimeObject,
    ValidationKeys extends WUP.Time.ValidationMap = WUP.Time.ValidationMap,
    Defaults = Defs,
    Options = Opt
  > = WUPBaseComboIn.Generics<ValueType, ValidationKeys, Defaults & Defs, Options & Opt>;

  export type GenDef<T = WUPTimeObject> = Generics<T>["Defaults"];
  export type GenOpt<T = WUPTimeObject> = Generics<T>["Options"];
}
declare global {
  namespace WUP.Time {
    interface ValidationMap extends WUP.BaseControl.ValidationMap, Pick<WUP.Text.ValidationMap, "_mask" | "_parse"> {
      /** Enabled if option [min] is pointed; If $value < pointed shows message 'Min time is {x}` */
      min: WUPTimeObject;
      /** Enabled if option [min] is pointed; if $value > pointed shows message 'Max time is {x}` */
      max: WUPTimeObject;
      // /** Enabled if option [exclude] is pointed; If invalid shows "This time is disabled" */
      exclude: WUPTimeObject[];
    }
    interface EventMap extends WUP.BaseCombo.EventMap {}
    interface Defaults<T = WUPTimeObject> extends WUPTimeIn.GenDef<T> {}
    interface Options<T = WUPTimeObject> extends WUPTimeIn.GenOpt<T> {}
    interface JSXProps<T extends WUPTimeControl> extends WUP.BaseCombo.JSXProps<T>, WUPTimeIn.JSXProps {
      /** @deprecated default value; format yyyy-MM-dd hh:mm:ss.fff */
      initValue?: string;
      /** String representation of displayed time (enables mask, - to disable mask set $options.mask="");
       * @defaultValue localeInfo.time
       * @deprecated */
      format?: string;
    }
  }
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPTimeControl;
  }
  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUP.Time.JSXProps<WUPTimeControl>;
    }
  }
}

/** Form-control with time picker
 * @tutorial Troubleshooting
 * * $options.format related only to displayed text, to work with other time-options like min/max use strict format 'hh:mm'
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

  static get $styleRoot(): string {
    // todo add icon
    return `:root {
        --ctrl-time-icon-img: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M652.801 76.8c42.24 0 76.8 34.56 76.8 76.8v537.601c0 42.24-34.56 76.8-76.8 76.8H115.2c-42.624 0-76.8-34.56-76.8-76.8l.384-537.601c0-42.24 33.792-76.8 76.416-76.8h38.4V0h76.8v76.8h307.2V0h76.8v76.8h38.4zM192 345.6h76.8v76.8H192v-76.8zm230.4 0v76.8h-76.8v-76.8h76.8zm153.601 0h-76.8v76.8h76.8v-76.8zM115.2 691.2h537.601V268.8H115.2v422.4z'/%3E%3C/svg%3E");
      }`;
  }

  static get $style(): string {
    return `${super.$style}
      :host {
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
    arr.push("format");
    return arr;
  }

  static get observedAttributes(): Array<string> {
    const arr = super.observedAttributes as Array<LowerKeys<WUP.Time.Options>>;
    arr.push("format", "min", "max", "exclude");
    return arr;
  }

  static $defaults: WUP.Time.Defaults<WUPTimeObject> = {
    ...WUPBaseComboControl.$defaults,
    step: 5,
    // debounceMs: 500,
    validationRules: {
      ...WUPBaseComboControl.$defaults.validationRules,
      min: (v, setV, c) =>
        (v === undefined || v < setV) && `Min date is ${setV.format((c as WUPTimeControl)._opts.format)}`,
      max: (v, setV, c) =>
        (v === undefined || v > setV) && `Max date is ${setV.format((c as WUPTimeControl)._opts.format)}`,
      exclude: (v, setV) =>
        (v === undefined || setV.some((d) => d.valueOf() === v.valueOf())) && `This time is not allowed`,
    },
    // format: localeInfo.time.toLowerCase()
  };

  $options: WUP.Time.Options<ValueType> = {
    ...this.#ctr.$defaults,
    // utc: true,
    format: localeInfo.time,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

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
    this._opts.format = (this.getAttribute("format") ?? this._opts.format) || "hh:mm a";
    this._opts.mask =
      this._opts.mask ??
      this._opts.format
        .replace(/[aA]/, "AM") // todo how to use with mask ?
        .replace(/hh|HH/g, "00") //
        .replace(/[hH]/g, "#0")
        .replace(/mm|MM/g, "00")
        .replace(/[mM]/g, "#0"); // convert hh-mm > 00-00; h/m > #0/#0
    this._opts.maskholder = this._opts.maskholder ?? this._opts.format.replace(/([mMhH]){1,2}/g, "$1$1");
    this._opts.min = this.parse(this.getAttribute("min") || "") ?? this._opts.min;
    this._opts.max = this.parse(this.getAttribute("max") || "") ?? this._opts.max;
    this._opts.exclude = this.getRefAttr<WUPTimeObject[]>("exclude");

    super.gotChanges(propsChanged as any);
  }

  protected get validations(): WUP.Text.Options["validations"] {
    const vls = (super.validations as WUP.Time.Options["validations"])!; // undefined impossible because of textControl || {};
    // user can type not valid value according to options min,max,exclude. So need to enable validations rules in this case
    if (this._opts.min) vls.min = this._opts.min;
    if (this._opts.max) vls.max = this._opts.max;
    if (this._opts.exclude) vls.exclude = this._opts.exclude;
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
