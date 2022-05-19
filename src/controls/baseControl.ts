/* eslint-disable no-use-before-define */
import WUPBaseElement, { JSXCustomProps, WUP } from "../baseElement";
import isEqual from "../helpers/isEqual";
import onEvent from "../helpers/onEvent";
import onFocusLostEv from "../helpers/onFocusLost";
// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases } from "../popup/popupElement";

export namespace WUPBaseControlTypes {
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
    /** When element appended to layout */
    onInit,
    /** When control loses focus (including document.activeElement) */
    onFocusLost,
    /** When user type text (or change value via input) in <input /> */
    onInput,
    /** When form.submit is fired (via button submit or somehow else); It's impossible to disable */
    onSubmit,
    /** When $validate() is fired programmatically */
    onManualCall,
  }

  export const enum PressEscActions {
    /** Disable action */
    none = 0,
    /** Make control is empty; pressing Esc again rollback action (it helps to avoid accidental action) */
    clear = 1 << 1,
    /** Return to init value; pressing Esc again rollback action (it helps to avoid accidental action) */
    resetToInit = 1 << 2,
  }

  export type ValidationMap = {
    required: boolean;
  };

  // eslint-disable-next-line @typescript-eslint/ban-types
  export type Generics<ValueType, ValidationKeys extends ValidationMap, ExtraOptions = {}> = {
    Validation: (value: ValueType, setValue: ValidationKeys[keyof ValidationKeys]) => false | string;
    CustomValidation: (value: ValueType) => false | string;
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
      /** When to validate control and show error. Validation by onSubmit impossible to disable
       *  @defaultValue onChangeSmart | onFocusLost | onSubmit
       */
      validationCase: ValidationCases;
      /** Rules defined in control */
      validationRules: {
        [K in keyof ValidationKeys]?: (value: ValueType, setValue: ValidationKeys[K]) => false | string;
      };
      /** Rules enabled for current control */
      validations?:
        | {
            [K in keyof ValidationKeys]?: ValidationKeys[K] | ((value: ValueType) => false | string);
          }
        | { [k: string]: (value: ValueType) => false | string };
      /** Wait for pointed time before show error (it's sumarized with $options.debounce); WARN: hide error without debounce
       *  @defaultValue 500
       */
      validityDebounceMs: number;
      /** Debounce option for onFocustLost event (for validationCases.onFocusLost); More details @see onFocusLostOptions.debounceMs in helpers/onFocusLost;
       * @defaultValue 100ms */
      focusDebounceMs?: number;
      /** Behavior that expected on press key 'Escape'
       * @defaultValue clear | resetToInit (both means: resetToInit if exists, 2nd time - clear etc.) */
      pressEsc: PressEscActions;
    } & ExtraOptions;
  };

  export type Options<T = string> = Generics<T, ValidationMap>["Options"];

  export type JSXControlProps<T extends WUPBaseControl> = JSXCustomProps<T> & {
    /** @deprecated Title/label for control; */
    label?: string;
    /** @deprecated Property key of model; For name 'firstName' >> model['firstName'] */
    name?: string;
    /** @deprecated Name to autocomplete by browser; by default it's equal to [name]; to disable autocomplete point empty string */
    autoFillName?: string;

    /** Disallow edit/copy value */
    disabled?: boolean;
    /** Disallow edit value */
    readOnly?: boolean;
    /** Focus on init */
    autoFocus?: boolean;

    /** @readonly Use [invalid] for styling */
    readonly invalid?: boolean;

    /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$validate') instead */
    onValidate?: never;
    /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$change') instead */
    onChange?: never;
  };

  export interface EventMap extends WUP.EventMap {
    /** Fires after every UI-change (changes by user - not programmatically) */
    $change: Event;
    /** Fires after popup is hidden */
    $validate: Event;
  }
}

export default abstract class WUPBaseControl<
  ValueType = any,
  Events extends WUPBaseControlTypes.EventMap = WUPBaseControlTypes.EventMap,
  OptionsType extends WUPBaseControlTypes.Options<ValueType> = WUPBaseControlTypes.Options<ValueType>
> extends WUPBaseElement<Events> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPBaseControl;

  // todo check it & adjust
  /** Options that need to watch for changes; use gotOptionsChanged() */
  static observedOptions = new Set<keyof WUPBaseControlTypes.Options>([
    "label",
    "name",
    "autoFillName",
    "disabled",
    "readOnly",
  ]);

  /* Array of attribute names to listen for changes */
  static get observedAttributes(): Array<keyof WUPBaseControlTypes.Options> {
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
  static $defaults: WUPBaseControlTypes.Options = {
    pressEsc: WUPBaseControlTypes.PressEscActions.clear | WUPBaseControlTypes.PressEscActions.resetToInit,
    validityDebounceMs: 500,
    validationCase: WUPBaseControlTypes.ValidationCases.onChangeSmart | WUPBaseControlTypes.ValidationCases.onFocusLost,
    validationRules: {
      required: (v, setV) => setV && this.isEmpty(v) && "This field is required",
    },
  };

  $options: Omit<OptionsType, "validationRules"> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  #value?: ValueType;
  /** Current value of control; You can change it without affecting on $isDirty state */
  get $value(): ValueType | undefined {
    return this.#value;
  }

  set $value(v: ValueType | undefined) {
    const was = this.$isDirty;
    this.setValue(v);
    this.$isDirty = was;
  }

  #initValue?: ValueType;
  /** Default/init value; used to define isChanged & to reset by Esc;
   *  If control.$isDirty or not $isEmpty value isn't applied to */
  get $initValue(): ValueType | undefined {
    return this.#initValue;
  }

  set $initValue(v: ValueType | undefined) {
    if (!this.#ctr.isEqual(v, this.#initValue) && !this.$isDirty && this.$isEmpty) {
      // setValue if it's empty
      this.$isReady ? (this.$value = v) : setTimeout(() => (this.$value = v));
    }
    this.#initValue = v;
  }

  #isDirty = false;
  /** True if control is touched by user; Set 'false' if you want to reset state of control and assign initValue to value */
  get $isDirty() {
    return this.#isDirty;
  }

  set $isDirty(v: boolean) {
    this.#isDirty = v;
    if (!v) {
      this.$initValue = this.$value;
    }
  }

  /** Returns true if value is empty string or undefined */
  get $isEmpty(): boolean {
    return this.#ctr.isEmpty(this.#value);
  }

  /** Returns if value changed (by comparisson with $initValue via static.isEqual option)
   *  By default values compared by valueOf if it's possible
   */
  get $isChanged(): boolean {
    return !this.#ctr.isEqual(this.$value, this.#initValue);
  }

  #isValid?: boolean;
  /** Returns true if control is valid; to fire validation use $validate() */
  get $isValid(): boolean {
    if (this.#isValid == null) {
      this.goValidate(WUPBaseControlTypes.ValidateFromCases.onInit, false);
    }

    return this.#isValid as boolean;
  }

  /** Check validity and show error if not swtich off; canShowError is true by default
   * @returns errorMessage or false (if valid)
   */
  $validate(canShowError = true): string | false {
    return this.goValidate(WUPBaseControlTypes.ValidateFromCases.onManualCall, canShowError);
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

  /** Array of removeEventListener() that fired ReInit */
  protected disposeLstInit: Array<() => void> = [];

  /** Fired on Init and every time as options/attributes changed */
  protected gotReinit() {
    console.warn("reinit");

    this.disposeLstInit.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLstInit.length = 0;

    if (this._opts.validationCase & WUPBaseControlTypes.ValidationCases.onFocusLost) {
      this.disposeLstInit.push(
        onFocusLostEv(this, () => this.goValidate(WUPBaseControlTypes.ValidateFromCases.onFocusLost), {
          debounceMs: this._opts.focusDebounceMs,
        })
      );
    }

    if (this._opts.pressEsc) {
      let prevValue = this.$value;
      this.disposeLstInit.push(
        onEvent(this, "keydown", (e) => {
          if (e.key !== "Escape") {
            return;
          }

          const was = this.#value;

          const isEscClear = this._opts.pressEsc & WUPBaseControlTypes.PressEscActions.clear;
          if (this._opts.pressEsc & WUPBaseControlTypes.PressEscActions.resetToInit) {
            if (this.$isChanged) {
              this.#isDirty = false;
              this.setValue(this.$initValue);
              prevValue = was;
              return;
            }
          }
          if (isEscClear) {
            this.setValue(this.$isEmpty ? prevValue : undefined);
          }
          prevValue = was;
        })
      );
    }

    this._opts.label = this.getAttribute("label") ?? this._opts.label;
    this._opts.name = this.getAttribute("name") ?? this._opts.name;
    this._opts.autoFillName = this.getAttribute("autoFillName") ?? this._opts.autoFillName;
    this._opts.disabled = this.getAttribute("disabled") != null ? true : this._opts.disabled;
    this._opts.readOnly = this.getAttribute("readOnly") != null ? true : this._opts.readOnly;

    this.$refTitle.textContent = this._opts.label || null;
    const r = this.$refInput;
    if (r) {
      r.type = "text";

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
      r.disabled = this._opts.disabled as boolean;
      r.readOnly = this._opts.readOnly as boolean;
      // todo refactor this to manual autofocus ???
      r.autofocus = this.getAttribute("autoFocus") != null;
    }

    this.#isStopAttrListen = true;
    this._opts.disabled ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
    this._opts.readOnly ? this.setAttribute("readOnly", "") : this.removeAttribute("readOnly");
    this.#isStopAttrListen = false;
  }

  /** Use this to append elements; fired single time when element isConnected but not ready yet */
  protected abstract renderControl(): void;

  protected override gotReady() {
    super.gotReady();
    this.gotReinit();

    // this.appendEvent removed by dispose()
    this.appendEvent(
      this,
      "mousedown", // to prevent blur-focus effect for input by label click
      (e) => !(e.target instanceof HTMLInputElement) && e.preventDefault()
    );

    if (this._opts.validationCase & WUPBaseControlTypes.ValidationCases.onInit) {
      !this.$isEmpty && this.goValidate(WUPBaseControlTypes.ValidateFromCases.onInit);
    }
  }

  #isFirstConn = true;
  protected override connectedCallback() {
    super.connectedCallback();

    if (this.#isFirstConn) {
      this.#isFirstConn = false;
      this.renderControl();
    }
  }

  #wasValid = false;
  protected _validTimer?: number;
  /** Method called to check control based on validation rules and current value */
  protected goValidate(fromCase: WUPBaseControlTypes.ValidateFromCases, canShowError = true): string | false {
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
        err = vl(v as any);
      } else {
        const rules = this.#ctr.$defaults.validationRules;
        const r = rules[k as "required"];
        if (!r) {
          throw new Error(`${this.tagName} '${this.#ctr.$defaults.name}'. Validation rule [${vl}] is not found`);
        }
        err = r(v, vl as boolean);
      }

      if (err !== false) {
        errMsg = err;
        return true;
      }

      return false;
    });

    this.#isValid = !errMsg;
    this._validTimer && clearTimeout(this._validTimer);

    if (
      fromCase === WUPBaseControlTypes.ValidateFromCases.onInput &&
      this._opts.validationCase & WUPBaseControlTypes.ValidationCases.onChangeSmart
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
        this._validTimer = window.setTimeout(() => this.goShowError(errMsg), this._opts.validityDebounceMs);
      }
      return errMsg;
    }

    this.goHideError();
    return false;
  }

  /** Method called to show error */
  protected goShowError(err: string) {
    // possible when user goes to another page and focusout > validTimeout happened
    if (!this.isConnected) {
      return;
    }
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

  /** Fire this method to update value & validate */
  protected setValue(v: ValueType | undefined) {
    this.$isDirty = true;
    const isChanged = !this.#ctr.isEqual(v, this.#value);
    this.#value = v;
    if (!isChanged) {
      return;
    }

    const c = this._opts.validationCase;
    if (c & WUPBaseControlTypes.ValidationCases.onChange || c & WUPBaseControlTypes.ValidationCases.onChangeSmart) {
      this.goValidate(WUPBaseControlTypes.ValidateFromCases.onInput);
    }
    this.fireEvent("$change", { cancelable: false });
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

  protected override dispose() {
    super.dispose();
    this.disposeLstInit.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLstInit.length = 0;
  }
}

// todo option.clearBtn: boolean
