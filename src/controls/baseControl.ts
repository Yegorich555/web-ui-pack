/* eslint-disable no-use-before-define */
import WUPBaseElement, { WUP } from "../baseElement";
import isEqual from "../helpers/isEqual";
import onFocusLostEv from "../helpers/onFocusLost";
// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases } from "../popup/popupElement";

export namespace WUPControlTypes {
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

  export const enum ValidateFromCases {
    onInit,
    onFocusLost,
    onInput,
    onSubmit,
    /** When $validate() is fired programmatically */
    onManualCall,
  }

  export type ValidationMap = {
    required: boolean;
  };

  export type Generics<
    ValueType, //
    ValidationKeys extends ValidationMap,
    ControlType extends HTMLElement
  > = {
    Validation: (value: ValueType, setValue: ValidationKeys[keyof ValidationKeys], ctrl: ControlType) => false | string;
    CustomValidation: (value: ValueType, ctrl: ControlType) => false | string;
    Options: {
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
      initValue?: ValueType;
      /** When to validate control and show error; by default onChangeSmart & onFocusLost & onSubmit.
       *  Validation by onSubmit impossible to disable
       */
      validationCase: ValidationCases;
      /** Rules defined in control */
      validationRules: {
        [K in keyof ValidationKeys]: (
          value: ValueType,
          setValue: ValidationKeys[K],
          ctrl: ControlType
        ) => false | string;
      };
      /** Rules enabled for current control */
      validations?:
        | {
            [K in keyof ValidationKeys]?: ValidationKeys[K] | ((value: ValueType, ctrl: ControlType) => false | string);
          }
        | { [k: string]: (value: ValueType, ctrl: ControlType) => false | string };
      /** Wait for pointed time before show error (it's sumarized with $options.debounce); WARN: hide error without debounce */
      validityDebounceMs: number;
      /** Debounce option for onFocustLost event (for validationCases.onFocusLost); More details @see onFocusLostOptions.debounceMs in helpers/onFocusLost; Default is 100ms */
      focusDebounceMs?: number;
      /** Debounce time to wait for user finishes typing to start validate and provide $change event
       *
       * Default is `0`;
       */
      debounceMs: number;
    };
  };

  export type Options<T = string> = Generics<T, ValidationMap, WUPBaseControl>["Options"];

  export interface EventMap extends WUP.EventMap {
    /** Fires after every UI-change (changes by user - not programmatically) */
    $change: Event;
    /** Fires after popup is hidden */
    $validate: Event;
  }
}

export default abstract class WUPBaseControl<
  T = string,
  Events extends WUPControlTypes.EventMap = WUPControlTypes.EventMap
> extends WUPBaseElement<Events> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPBaseControl;

  /** Options that need to watch for changes; use gotOptionsChanged() */
  static observedOptions = new Set<keyof WUPControlTypes.Options>([
    "label",
    "name",
    "autoFillName",
    "disabled",
    "readOnly",
  ]);

  /* Array of attribute names to listen for changes */
  static get observedAttributes(): Array<keyof WUPControlTypes.Options> {
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
  static $defaults: WUPControlTypes.Options = {
    debounceMs: 0,
    validityDebounceMs: 500,
    validationCase: WUPControlTypes.ValidationCases.onChangeSmart | WUPControlTypes.ValidationCases.onFocusLost,
    validationRules: {
      required: (v, setV) => setV && this.isEmpty(v) && "This field is required",
    },
  };

  $options: Omit<WUPControlTypes.Options, "validationRules"> = {
    ...this.#ctr.$defaults,
    // @ts-ignore
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  get #initValue(): T | undefined {
    return this._opts.initValue as any;
  }

  #rawValue: T | undefined;
  /** Current (parsed) value of control */
  get $value(): T | undefined {
    return this.#rawValue; // todo implement parse from rawValue
  }

  set $value(v: T | undefined) {
    if (!isEqual(this.#rawValue, v)) {
      this.#rawValue = v;
      this.$refInput.value = v ? (v as any).toString() : "";
    }
  }

  $isDirty = false;

  /** Returns true if value is empty string or undefined */
  get $isEmpty(): boolean {
    return this.#ctr.isEmpty(this.#rawValue);
  }

  /** Returns if value changed (by comparisson with initValue via static.isEqual option)
   *  By default values compared by valueOf if it's possible
   */
  get $isChanged(): boolean {
    return this.#ctr.isEqual(this.$value, this.#initValue);
  }

  #isValid?: boolean;
  /** Returns true if control is valid; to fire validation use $validate() */
  get $isValid(): boolean {
    if (this.#isValid == null) {
      this.goValidate(WUPControlTypes.ValidateFromCases.onInit, false);
    }

    return this.#isValid as boolean;
  }

  /** Check validity and show error if not swtich off; canShowError is true by default
   * @returns errorMessage or false (if valid)
   */
  $validate(canShowError = true): string | false {
    return this.goValidate(WUPControlTypes.ValidateFromCases.onManualCall, canShowError);
  }

  $showError(err: string): void {
    return this.goShowError(err);
  }

  $hideError(): void {
    return this.goHideError();
  }

  /** Reference to nested HTMLElement */
  $refLabel = document.createElement("label");
  /** Reference to nested HTMLElement */
  $refInput = document.createElement("input");
  /** Reference to nested HTMLElement tied with $options.label */
  $refTitle = document.createElement("strong");
  /** Reference to nested HTMLElement tied with errorMessage */
  $refError?: WUPPopupElement;

  // constructor() {
  //   super();
  // }

  gotReinit() {
    console.warn("reinit");

    this._opts.label = this.getAttribute("label") ?? this._opts.label;
    this._opts.name = this.getAttribute("name") ?? this._opts.name;
    this._opts.autoFillName = this.getAttribute("autoFillName") ?? this._opts.autoFillName;
    this._opts.disabled = this.getAttribute("disabled") != null ? true : this._opts.disabled;
    this._opts.readOnly = this.getAttribute("readOnly") != null ? true : this._opts.readOnly;

    this.$refTitle.textContent = this._opts.label || null;
    const r = this.$refInput;
    if (r) {
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
      // todo refactor this to manual autofocus ???
      r.autofocus = this.getAttribute("autoFocus") != null;
    }

    this.#isStopAttrListen = true;
    /* eslint-disable no-unused-expressions */
    this._opts.disabled ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
    this._opts.readOnly ? this.setAttribute("readOnly", "") : this.removeAttribute("readOnly");
    /* eslint-enable no-unused-expressions */
    this.#isStopAttrListen = false;
  }

  protected abstract gotInit(): void;

  protected override gotReady() {
    super.gotReady();
    this.gotReinit();
  }

  #isFirstConn = true;
  protected override connectedCallback() {
    super.connectedCallback();

    if (this.#isFirstConn) {
      this.#isFirstConn = false;

      this.gotInit();
    }

    // this.appendEvent be removed by dispose()
    this.appendEvent(
      this,
      "mousedown", // to prevent blur-focus effect for input by label click
      (e) => !(e.target instanceof HTMLInputElement) && e.preventDefault()
    );

    if (this._opts.validationCase & WUPControlTypes.ValidationCases.onInit) {
      !this.$isEmpty && this.goValidate(WUPControlTypes.ValidateFromCases.onInit);
    }
    if (this._opts.validationCase & WUPControlTypes.ValidationCases.onFocusLost) {
      this.disposeLst.push(
        onFocusLostEv(this, () => this.goValidate(WUPControlTypes.ValidateFromCases.onFocusLost), {
          debounceMs: this._opts.focusDebounceMs,
        })
      );
    }
  }

  #wasValid = false;
  #validTimer?: number;
  protected goValidate(fromCase: WUPControlTypes.ValidateFromCases, canShowError = true): string | false {
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
        err = vl(v, this as unknown as WUPBaseControl<string>);
      } else {
        const rules = this.#ctr.$defaults.validationRules;
        const r = rules[k as "required"];
        if (!r) {
          throw new Error(`${this.tagName} '${this.#ctr.$defaults.name}'. Validation rule [${vl}] is not found`);
        }
        err = r(v, vl as boolean, this as unknown as WUPBaseControl<string>);
      }

      if (err !== false) {
        errMsg = err;
        return true;
      }

      return false;
    });

    this.#isValid = !errMsg;
    this.#validTimer && clearTimeout(this.#validTimer);

    if (
      fromCase === WUPControlTypes.ValidateFromCases.onInput &&
      this._opts.validationCase & WUPControlTypes.ValidationCases.onChangeSmart
    ) {
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
        if (fromCase === WUPControlTypes.ValidateFromCases.onInput) {
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
    this.$refInput.setCustomValidity(err);
    this.setAttribute("invalid", "");

    if (!this.$refError) {
      const p = document.createElement("wup-popup");
      p.$options.showCase = ShowCases.always;
      p.$options.target = this;
      p.$options.placement = [
        WUPPopupElement.$placements.$bottom.$start.$resizeWidth,
        WUPPopupElement.$placements.$top.$start.$resizeWidth,
      ];
      p.$options.maxWidthByTarget = true;
      p.setAttribute("error", "");
      // todo check if it works when err.msg is changed on the fly
      p.setAttribute("aria-live", "off"); // 'off' (not 'polite') because popup changes display block>none when it hidden after scrolling
      p.id = this.#ctr.uniqueId;
      this.$refInput.setAttribute("aria-describedby", p.id); // watchfix: nvda doesn't read aria-errormessage: https://github.com/nvaccess/nvda/issues/8318
      this.$refError = this.appendChild(p);
      p.addEventListener("click", this.focus);

      const hiddenLbl = p.appendChild(document.createElement("span"));
      hiddenLbl.textContent = `Error${this._opts.name ? ` for ${this._opts.name}` : ""}: `;
      hiddenLbl.className = "wup-hidden";

      p.appendChild(document.createElement("span"));
      p.$show();
    }

    this.$refError.childNodes.item(1).textContent = err;
  }

  protected goHideError() {
    this.$refInput.setCustomValidity("");
    this.$refInput.removeAttribute("aria-describedby");
    this.removeAttribute("invalid");

    if (this.$refError) {
      const p = this.$refError;
      p.addEventListener("$hide", p.remove);
      p.$hide();
      this.$refError = undefined;
    }
  }

  // todo this event is wrong for checkboxes
  #inputTimer?: number;
  protected onInput(e: Event & { currentTarget: HTMLInputElement }) {
    this.$isDirty = true;

    const v = e.currentTarget.value;
    this.#validTimer && clearTimeout(this.#validTimer);

    const process = () => {
      this.#rawValue = v as any;
      // todo parse value here ???
      const c = this._opts.validationCase;
      if (c & WUPControlTypes.ValidationCases.onChange || c & WUPControlTypes.ValidationCases.onChangeSmart) {
        this.goValidate(WUPControlTypes.ValidateFromCases.onInput);
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
    this.gotReinit();
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
      this.gotReinit();
    });
  }
}
