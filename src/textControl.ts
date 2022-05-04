/* eslint-disable no-use-before-define */
/* eslint-disable no-unused-expressions */
import WUPBaseElement, { JSXCustomProps, WUP } from "./baseElement";
import isEqual from "./helpers/isEqual";
import onFocusLostEv from "./helpers/onFocusLost";
// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases } from "./popup/popupElement";

interface WUPBaseControl<T> {
  /** Current (parsed) value of control */
  $value: T | undefined;
  /** Returns true if value is empty string or undefined */
  readonly $isEmpty: boolean;
  /** Returns if value changed (by comparisson with initValue via static.isEqual option)
   *  By default values compared by valueOf if it's possible
   */
  readonly $isChanged: boolean;
  /** Returns true if control is valid; to fire validation use $validate() */
  readonly $isValid: boolean;
  /** Check validity and show error if not swtich off; canShowError is true by default
   * @returns errorMessage or false (if valid)
   */
  $validate(canShowError?: boolean): string | false;
}

export type Validation<T, ST, C extends WUPBaseControl<T> = WUPBaseControl<T>> = (
  value: T,
  setValue: ST,
  ctrl: C
) => false | string;

export type CustomValidation<T, C extends WUPBaseControl<T> = WUPBaseControl<T>> = (
  value: T,
  ctrl: C
) => false | string;

export const enum ValidateFromCases {
  onInit,
  onFocusLost,
  onInput,
  onSubmit,
  /** When $validate() is fired programmatically */
  onManualCall,
}

export const enum ValidationCases {
  /** Wait for first user-change > wait for valid > wait for invalid >> show error;
   *  When invalid: wait for valid > hide error > wait for invalid > show error
   *  Also you can check $options.validityDebounceMs */
  onChangeSmart = 1,
  /** Validate when user changed value (via type,select etc.); Also you can check $options.validityDebounceMs */
  onChange = 1 << 1,
  /** Validate when control losts focus */
  onFocusLost = 1 << 2,
  /** Validate when not-empty initValue defined and doesn't fit validations  */
  onInit = 1 << 3,
}

export interface BaseControlOptions<T, V, VK extends Record<string, any>, C extends WUPBaseControl<T>> {
  /** Title/label for control */
  label?: string;
  /** Property key of model; For name 'firstName' >> model['firstName'] */
  name?: string;
  /** Name to autocomplete by browser; by default it's equal to [name]; to disable autocomplete point empty string */
  autoFillName?: string;
  /** Disallow edit/copy value; adds attr [disabled] for styling */
  disabled?: boolean;
  /** Disallow copy value; adds attr [readonly] for styling */
  readOnly?: boolean;
  /** Default/init value */
  initValue?: T;
  /** When to validate control and show error; by default onChangeSmart & onFocusLost & onSubmit.
   *  Validation by onSubmit impossible to disable
   */
  validationCase: ValidationCases;
  /** Rules defined in control */
  validationRules: { [key in keyof VK]: V };
  /** Rules enabled for current control */
  validations?: { [K in keyof VK]?: VK[K] | CustomValidation<T, C> } | { [k: string]: CustomValidation<T, C> };
  /** Wait for pointed time before show error (it's sumarized with $options.debounce); WARN: hide error without debounce */
  validityDebounceMs: number;
}

export type TextControlValidationMap = {
  required: true;
  min: number;
  max: number;
};
// eslint-disable-next-line no-use-before-define
export type TextControlValidation<T> = Validation<T, any, WUPTextControl<T>>;

export interface TextControlOptions<T = string, V extends TextControlValidation<T> = TextControlValidation<T>>
  extends BaseControlOptions<T, V, TextControlValidationMap, WUPTextControl<T>> {
  /** Debounce time to wait for user finishes typing to start validate or provide onChange event
   *
   * Default is `0`;
   */
  debounceMs: number;
  /** Debounce option for onFocustLost event (for validationCases.onFocusLost); More details @see onFocusLostOptions.debounceMs in helpers/onFocusLost; Default is 100ms */
  focusDebounceMs?: number;
}

export interface WUPBaseControlEventMap extends WUP.EventMap {
  /** Fires after every UI-change (changes by user - not programmatically) */
  $change: Event;
  /** Fires after popup is hidden */
  $validate: Event;
}

/**
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <input />
 *      <strong>{$options.label}</strong>
 *   </span>
 * </label>
 */
export default class WUPTextControl<T = string, Events extends WUPBaseControlEventMap = WUPBaseControlEventMap>
  extends WUPBaseElement<Events>
  implements WUPBaseControl<T>
{
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  // @ts-ignore
  protected get ctr(): typeof WUPTextControl {
    return this.constructor as typeof WUPTextControl;
  }

  /** Options that need to watch for changes; use gotOptionsChanged() */
  static observedOptions = new Set<keyof TextControlOptions>(["label", "name", "autoFillName", "disabled", "readOnly"]);

  /* Array of attribute names to listen for changes */
  static get observedAttributes(): Array<keyof TextControlOptions> {
    return ["label", "name", "autoFillName", "disabled", "readOnly"];
  }

  /** StyleContent related to component */
  static get style(): string {
    return `
      :host {

      }
     `;
  }

  /** Default function to compare values/changes;
   *  Redefine it or define valueOf for values; By default values compared by valueOf if it's possible
   */
  static isEqual(v1: unknown, v2: unknown): boolean {
    return isEqual(v1, v2);
  }

  /** Default function to compare values/changes;
   *  Redefine it or define valueOf for values; By default values compared by valueOf if it's possible
   */
  static isEmpty(v: unknown): boolean {
    return v === "" || v === undefined;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: TextControlOptions = {
    debounceMs: 0,
    validityDebounceMs: 500,
    validationCase: ValidationCases.onChangeSmart | ValidationCases.onFocusLost,
    validationRules: {
      required: (v, setV) => setV && this.isEmpty(v) && "This field is required",
      min: (v, setV) => v.length < setV && `Min length is ${setV} characters`,
      max: (v, setV) => v.length > setV && `Max length is ${setV} characters`,
    },
  };

  $options: Omit<TextControlOptions, "validationRules"> = {
    ...this.ctr.$defaults,
    // @ts-ignore
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  /** References to nested HTMLElements */
  $refs = {
    label: document.createElement("label"),
    input: document.createElement("input"),
    title: document.createElement("strong"),
    error: undefined as WUPPopupElement | undefined,
  };

  get #initValue(): T | undefined {
    return this._opts.initValue as any;
  }

  #rawValue: T | undefined;

  get $value(): T | undefined {
    return this.#rawValue; // todo implement parse from rawValue
  }

  set $value(v: T | undefined) {
    if (!isEqual(this.#rawValue, v)) {
      this.#rawValue = v;
      this.$refs.input.value = v ? (v as any).toString() : "";
    }
  }

  $isDirty = false;

  get $isEmpty(): boolean {
    return this.ctr.isEmpty(this.#rawValue);
  }

  get $isChanged(): boolean {
    return this.ctr.isEqual(this.$value, this.#initValue);
  }

  #isValid?: boolean;
  get $isValid(): boolean {
    if (this.#isValid == null) {
      this.goValidate(ValidateFromCases.onInit, false);
    }

    return this.#isValid as boolean;
  }

  $validate(canShowError = true): string | false {
    return this.goValidate(ValidateFromCases.onManualCall, canShowError);
  }

  $showError(err: string): void {
    return this.goShowError(err);
  }

  $hideError(): void {
    return this.goHideError();
  }

  constructor() {
    super();

    const r = this.$refs.input;
    r.placeholder = " ";
  }

  #reinit() {
    console.warn("reinit");

    this._opts.label = this.getAttribute("label") ?? this._opts.label;
    this._opts.name = this.getAttribute("name") ?? this._opts.name;
    this._opts.autoFillName = this.getAttribute("autoFillName") ?? this._opts.autoFillName;
    this._opts.disabled = this.getAttribute("disabled") != null ? true : this._opts.disabled;
    this._opts.readOnly = this.getAttribute("readOnly") != null ? true : this._opts.readOnly;

    this.$refs.title.textContent = this._opts.label || null;
    const r = this.$refs.input;
    r.type = "text"; // todo configurable option

    if (this._opts.autoFillName === "") {
      r.autocomplete = "off";
    } else {
      const n = this._opts.autoFillName || (this._opts.name as string);
      if (!n) {
        r.removeAttribute("name");
        r.autocomplete = "off";
      } else {
        r.name = n;
        r.autocomplete = n;
      }
    }

    const required = this._opts.validations?.required;
    r.required = required ? (required as any) !== false : false;
    // todo how to do it for fieldset[aria-required]
    r.disabled = this._opts.disabled as boolean;
    r.readOnly = this._opts.readOnly as boolean;
    r.autofocus = this.getAttribute("autoFocus") != null;

    this.#isStopAttrListen = true;
    this._opts.disabled ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
    this._opts.readOnly ? this.setAttribute("readOnly", "") : this.removeAttribute("readOnly");
    this.#isStopAttrListen = false;
  }

  protected override gotReady() {
    super.gotReady();
    this.#reinit();
  }

  #isFirstConn = true;
  protected override connectedCallback() {
    super.connectedCallback();

    if (this.#isFirstConn) {
      this.#isFirstConn = false;

      this.$refs.input.id = this.ctr.uniqueId;
      this.$refs.label.setAttribute("for", this.$refs.input.id);

      const s = this.$refs.label.appendChild(document.createElement("span"));
      s.appendChild(this.$refs.input);
      s.appendChild(this.$refs.title);
      this.appendChild(this.$refs.label);
    }

    // this.appendEvent be removed by dispose()
    this.appendEvent(
      this,
      "mousedown", // to prevent blur-focus effect for input by label click
      (e) => !(e.target instanceof HTMLInputElement) && e.preventDefault()
    );

    this.appendEvent(this.$refs.input, "input", this.onInput as any);

    if (this._opts.validationCase & ValidationCases.onInit) {
      !this.$isEmpty && this.goValidate(ValidateFromCases.onInit);
    }
    if (this._opts.validationCase & ValidationCases.onFocusLost) {
      this.disposeLst.push(
        onFocusLostEv(this, () => this.goValidate(ValidateFromCases.onFocusLost), {
          debounceMs: this._opts.focusDebounceMs,
        })
      );
    }
  }

  #wasValid = false;
  #validTimer?: number;
  protected goValidate(fromCase: ValidateFromCases, canShowError = true): string | false {
    const vls = this._opts.validations;
    if (!vls) {
      this.#isValid = true;
      return false;
    }

    let errMsg = "";
    const v = this.$value as unknown as string;

    Object.keys(vls).some((k) => {
      const vl = vls[k as "required"];

      let err: false | string;
      if (vl instanceof Function) {
        err = vl(v, this as unknown as WUPTextControl<string>);
      } else {
        const rules = this.ctr.$defaults.validationRules;
        const r = rules[k as "required"];
        if (!r) {
          throw new Error(`${this.tagName} '${this.ctr.$defaults.name}'. Validation rule [${vl}] is not found`);
        }
        err = r(v, vl, this as unknown as WUPTextControl<string>);
      }

      if (err !== false) {
        errMsg = err;
        return true;
      }

      return false;
    });

    this.#isValid = !errMsg;
    this.#validTimer && clearTimeout(this.#validTimer);

    if (fromCase === ValidateFromCases.onInput && this._opts.validationCase & ValidationCases.onChangeSmart) {
      if (errMsg) {
        if (!this.#wasValid) {
          canShowError = false;
        }
      } else {
        this.#wasValid = true;
      }
    }

    setTimeout(() => this.fireEvent("$validate", { cancelable: false }));

    if (errMsg) {
      if (canShowError) {
        if (fromCase === ValidateFromCases.onInput) {
          this.#validTimer = window.setTimeout(() => this.goShowError(errMsg), this._opts.validityDebounceMs);
        } else {
          this.goShowError(errMsg);
        }
      }
      return errMsg;
    }

    this.goHideError();
    return false;
  }

  protected goShowError(err: string) {
    this.$refs.input.setCustomValidity(err);
    this.setAttribute("invalid", "");

    if (!this.$refs.error) {
      const p = document.createElement("wup-popup");
      p.$options.showCase = ShowCases.always;
      p.$options.target = this;
      p.$options.placement = [
        WUPPopupElement.$placements.$bottom.$start.$resizeWidth,
        WUPPopupElement.$placements.$top.$start.$resizeWidth,
      ];
      p.$options.maxWidthByTarget = true;
      p.setAttribute("error", "");
      p.setAttribute("aria-live", "off"); // 'off' (not 'polite') because popup changes display block>none when it hidden after scrolling
      p.id = this.ctr.uniqueId;
      this.$refs.input.setAttribute("aria-describedby", p.id); // watchfix: nvda doesn't read aria-errormessage: https://github.com/nvaccess/nvda/issues/8318
      this.$refs.error = this.appendChild(p);
      p.addEventListener("click", this.focus);

      const hiddenLbl = p.appendChild(document.createElement("span"));
      hiddenLbl.textContent = `Error${this._opts.name ? ` for ${this._opts.name}` : ""}: `;
      hiddenLbl.className = "wup-hidden";

      p.appendChild(document.createElement("span"));
      p.$show();
    }

    this.$refs.error.childNodes.item(1).textContent = err;
  }

  protected goHideError() {
    this.$refs.input.setCustomValidity("");
    this.$refs.input.removeAttribute("aria-describedby");
    this.removeAttribute("invalid");

    if (this.$refs.error) {
      const p = this.$refs.error;
      p.addEventListener("$hide", p.remove);
      p.$hide();
      this.$refs.error = undefined;
    }
  }

  #inputTimer?: number;
  protected onInput(e: Event & { currentTarget: HTMLInputElement }) {
    this.$isDirty = true;

    const v = e.currentTarget.value;
    this.#validTimer && clearTimeout(this.#validTimer);

    const process = () => {
      this.#rawValue = v as any;
      // todo parse value here ???
      const c = this._opts.validationCase;
      if (c & ValidationCases.onChange || c & ValidationCases.onChangeSmart) {
        this.goValidate(ValidateFromCases.onInput);
      }
      this.fireEvent("$change", { cancelable: false });
    };

    if (this._opts.debounceMs) {
      this.#inputTimer && clearTimeout(this.#inputTimer);
      this.#inputTimer = window.setTimeout(() => process(), this._opts.debounceMs);
    } else {
      process();
    }
  }

  protected override gotOptionsChanged(e: WUP.OptionEvent) {
    super.gotOptionsChanged(e);
    this.#reinit();
  }

  #isStopAttrListen = false;
  #attrTimer?: number;
  protected override gotAttributeChanged(name: string, oldValue: string, newValue: string): void {
    if (this.#isStopAttrListen) {
      return;
    }
    super.gotAttributeChanged(name, oldValue, newValue);
    // debounce filter
    if (this.#attrTimer) {
      return;
    }
    this.#attrTimer = window.setTimeout(() => {
      this.#attrTimer = undefined;
      this.#reinit();
    });
  }
}

const tagName = "wup-text-ctrl";
customElements.define(tagName, WUPTextControl);

declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPTextControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSXCustomProps<WUPTextControl> &
        Partial<{
          /** @deprecated Title/label for control; */
          label: string;
          /** @deprecated Property key of model; For name 'firstName' >> model['firstName'] */
          name: string;
          /** @deprecated Name to autocomplete by browser; by default it's equal to [name]; to disable autocomplete point empty string */
          autoFillName: string;

          /** Disallow edit/copy value */
          disabled: boolean;
          /** Disallow edit value */
          readOnly: boolean;
          /** Focus on init */
          autoFocus: boolean;

          /** @readonly Use [invalid] for styling */
          readonly invalid: boolean;

          /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$validate') instead */
          onValidate: never;
          /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$change') instead */
          onChange: never;
        }>;
    }
  }
}

// const el = document.createElement(tagName);
// el.$options.name = "testMe";
// el.$options.validations = {
//   required: true,
//   max: 2,
//   min: (v, ctrl) => v.length > 500 && "This is error",
//   extra: (v) => "test Me",
// };

// el.$validate();
