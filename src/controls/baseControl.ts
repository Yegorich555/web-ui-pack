/* eslint-disable no-use-before-define */
import WUPBaseElement, { JSXCustomProps, WUP } from "../baseElement";
import isEqual from "../helpers/isEqual";
import onEvent from "../helpers/onEvent";
import onFocusLostEv from "../helpers/onFocusLost";
// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases } from "../popup/popupElement";

/** Cases of validation for WUP Controls */
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

/** Options for userKeyPress event */
export const enum PressEscActions {
  /** Disable action */
  none = 0,
  /** Make control is empty; pressing Esc again rollback action (it helps to avoid accidental action) */
  clear = 1 << 1,
  /** Return to init value; pressing Esc again rollback action (it helps to avoid accidental action) */
  resetToInit = 1 << 2,
}

export namespace WUPBaseControlTypes {
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
      /** Focus element when it's appended to layout */
      autoFocus?: boolean;
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

    /** @deprecated Disallow edit/copy value. Use [disabled] for styling */
    disabled?: boolean;
    /** @deprecated Disallow edit value */
    readOnly?: boolean;
    /** @deprecated Focus on init */
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
    return ["label", "name", "autoFillName", "disabled", "readOnly", "autoFocus"];
  }

  static get styleRoot(): string {
    return `:root {
        --ctrl-padding: 1.4em 1em 0.6em 1em;
        --ctrl-focus: #00778d;
        --ctrl-focus-label: #00778d;
        --ctrl-selected: var(--ctrl-focus-label);
        --ctrl-label: #5e5e5e;
        --cltr-icon: var(--ctrl-label);
        --ctrl-back: #fff;
        --ctrl-border-radius: var(--border-radius, 6px);
        --ctrl-err: #ad0000;
        --ctrl-err-back: #fff4fa;
        --ctrl-invalid-border: red;
        --wup-icon-remove: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M674.515 93.949a45.925 45.925 0 0 0-65.022 0L384.001 318.981 158.509 93.487a45.928 45.928 0 0 0-65.022 0c-17.984 17.984-17.984 47.034 0 65.018l225.492 225.494L93.487 609.491c-17.984 17.984-17.984 47.034 0 65.018s47.034 17.984 65.018 0l225.492-225.492 225.492 225.492c17.984 17.984 47.034 17.984 65.018 0s17.984-47.034 0-65.018L449.015 383.999l225.492-225.494c17.521-17.521 17.521-47.034 0-64.559z'/%3E%3C/svg%3E");
      }
      `;
  }

  static get style(): string {
    // WARN: 'contain:style' is tricky rule
    return `
      :host {
        contain: style;
        display: block;
        margin-bottom: 20px;
        position: relative;
        border-radius: var(--ctrl-border-radius);
        background: var(--ctrl-back);
        cursor: pointer;
      }
      :host strong,
      :host legend {
        color: var(--ctrl-label);
      }
      :host:focus-within,
      :host:focus-within > [menu] {
        outline: 1px solid var(--ctrl-focus);
      }
      :host:focus-within strong,
      :host:focus-within legend,
      :host input:focus + * {
        color: var(--ctrl-focus-label);
      }
      :host[disabled] {
        opacity: 0.8;
        cursor: not-allowed;
        -webkit-user-select: none;
        user-select: none;
      }
      :host[disabled] > * {
        pointer-events: none;
      }
      :host[invalid],
      :host[invalid] > [menu] {
        box-shadow: 0 0 3px 0 var(--ctrl-invalid-border);
        outline-color: var(--ctrl-invalid-border);
      }
      @media (hover: hover) {
        :host:hover,
        :host:hover > [menu] {
          box-shadow: 0 0 3px 1px var(--ctrl-focus);
        }
        :host[invalid]:hover,
        :host[invalid]:hover > [menu] {
          box-shadow: 0 0 3px 1px var(--ctrl-invalid-border);
        }
      }
      :host label {
        display: flex;
        align-items: center;
        box-sizing: border-box;
        font: inherit;
        cursor: inherit;
        padding: var(--ctrl-padding);
        padding-top: 0;
        padding-bottom: 0;
      }
      :host label::before,
      :host label::after {
        box-sizing: content-box;
        cursor: pointer;
        flex: 0 0 auto;
        padding: var(--ctrl-padding);
        padding-left: 0;
        padding-right: 0;
        align-self: stretch;
      }
      :host label::before {
        margin-right: 0.5em;
      }
      :host label::after {
        margin-left: 0.5em;
      }
      :host input {
        padding: 0;
        margin: 0;
        cursor: inherit;
      }
      :host input + * {
        cursor: inherit;
      }
      :host input:required + *::after,
      :host fieldset[aria-required] > legend::after {
        content: "*";
        font-size: larger;
        font-weight: bolder;
        line-height: 0;
      }
      :host [error] {
        cursor: pointer;
        font-size: small;
        color: var(--ctrl-err);
        background: var(--ctrl-err-back);
        margin: -4px 0;
      }
    `;
  }

  /** Default function to compare values/changes;
   *  Redefine it or define valueOf for values; By default values compared by valueOf if it's possible
   */
  static isEqual(v1: unknown, v2: unknown): boolean {
    return isEqual(v1, v2);
  }

  /** Provide logic to check if control is empty (by comparison with value) */
  static isEmpty(v: unknown): boolean {
    return v === "" || v === undefined;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPBaseControlTypes.Options = {
    pressEsc: PressEscActions.clear | PressEscActions.resetToInit,
    validityDebounceMs: 500,
    validationCase: ValidationCases.onChangeSmart | ValidationCases.onFocusLost,
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

    if (this._opts.validationCase & ValidationCases.onFocusLost) {
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

          const isEscClear = this._opts.pressEsc & PressEscActions.clear;
          if (this._opts.pressEsc & PressEscActions.resetToInit) {
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
      // todo autofocus only when appended to layout ???
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

    if (this._opts.validationCase & ValidationCases.onInit) {
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
      this._opts.validationCase & ValidationCases.onChangeSmart
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
    if (c & ValidationCases.onChange || c & ValidationCases.onChangeSmart) {
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
