/* eslint-disable no-use-before-define */
import WUPBaseElement, { JSXCustomProps, WUP } from "../baseElement";
import WUPFormElement from "../forms/form";
import isEqual from "../helpers/isEqual";
import onFocusLostEv from "../helpers/onFocusLost";
import { stringPrettify } from "../indexHelpers";
// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases } from "../popup/popupElement";
import IBaseControl from "./baseControl.i";

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

/** Actions when user pressed ESC or button-clear */
export const enum ClearActions {
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
  export type Generics<ValueType, ValidationKeys extends ValidationMap, ExtraDefaults = {}, ExtraOptions = {}> = {
    Validation: (value: ValueType, setValue: ValidationKeys[keyof ValidationKeys]) => false | string;
    CustomValidation: (value: ValueType) => false | string;
    Defaults: {
      /** Rules defined for control */
      validationRules: {
        [K in keyof ValidationKeys]?: (value: ValueType, setValue: ValidationKeys[K]) => false | string;
      };
      /** When to validate control and show error. Validation by onSubmit impossible to disable
       *  @defaultValue onChangeSmart | onFocusLost | onSubmit
       */
      validationCase: ValidationCases;
      /** Wait for pointed time before show error (it's sumarized with $options.debounce); WARN: hide error without debounce
       *  @defaultValue 500
       */
      validityDebounceMs: number;
      /** Debounce option for onFocustLost event (for validationCases.onFocusLost); More details @see onFocusLostOptions.debounceMs in helpers/onFocusLost;
       * @defaultValue 100ms */
      focusDebounceMs?: number;
      /** Behavior that expected on press key 'Escape'
       * @defaultValue clear | resetToInit (both means: resetToInit if exists, 2nd time - clear etc.) */
      pressEsc: ClearActions;
    } & ExtraDefaults;
    Options: Omit<Generics<ValueType, ValidationMap, ExtraDefaults>["Defaults"], "validationRules"> & {
      /** Title/label of control; if label is missed it's parsed from option [name]. To skip point `label=''` (empty string) */
      label?: string;
      /** Property/key of model (collected by form); For name `firstName` >> `model.firstName`; for `nested.firstName` >> `model.nested.firstName` etc. */
      name?: string;
      /** Focus element when it's appended to layout */
      autoFocus?: boolean;
      /** Name to autocomplete by browser; Point `true` to inherit from $options.name or some string
       * @defaultValue undefined/false (which means disabled) */
      autoComplete?: string | boolean;
      /** Disallow edit/copy value; adds attr [disabled] for styling */
      disabled?: boolean;
      /** Disallow copy value; adds attr [readonly] for styling */
      readOnly?: boolean;
      /** Rules enabled for current control */
      validations?:
        | {
            [K in keyof ValidationKeys]?: ValidationKeys[K] | ((value: ValueType) => false | string);
          }
        | { [k: string]: (value: ValueType) => false | string };
    } & ExtraOptions;
  };

  export type Defaults<T = string> = Generics<T, ValidationMap>["Defaults"];
  export type Options<T = string> = Generics<T, ValidationMap>["Options"];

  export type JSXControlProps<T extends WUPBaseControl> = JSXCustomProps<T> & {
    /** @deprecated Title/label for control; */
    label?: string;
    /** @deprecated Property key of model */
    name?: string;
    /** @deprecated Name to autocomplete by browser; */
    autoComplete?: string;

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
    Events extends WUPBaseControlTypes.EventMap = WUPBaseControlTypes.EventMap
  >
  extends WUPBaseElement<Events>
  implements IBaseControl<ValueType>
{
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPBaseControl;

  /** Options that need to watch for changes; use gotOptionsChanged() */
  static observedOptions = new Set<keyof WUPBaseControlTypes.Options>([
    "label",
    "name",
    "autoComplete",
    "disabled",
    "readOnly",
  ]);

  /* Array of attribute names to listen for changes */
  static get observedAttributes(): Array<keyof WUPBaseControlTypes.Options> {
    return ["label", "name", "autoComplete", "disabled", "readOnly", "autoFocus"];
  }

  static get $styleRoot(): string {
    return `:root {
        --ctrl-padding: 1.4em 1em 0.6em 1em;
        --ctrl-focus: #00778d;
        --ctrl-focus-label: #00778d;
        --ctrl-selected: var(--ctrl-focus-label);
        --ctrl-label: #5e5e5e;
        --cltr-icon: var(--ctrl-label);
        --ctrl-icon-size: 1em;
        --ctrl-back: #fff;
        --ctrl-border-radius: var(--border-radius, 6px);
        --ctrl-err: #ad0000;
        --ctrl-err-back: #fff4fa;
        --ctrl-invalid-border: red;
        --wup-icon-cross: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M674.515 93.949a45.925 45.925 0 0 0-65.022 0L384.001 318.981 158.509 93.487a45.928 45.928 0 0 0-65.022 0c-17.984 17.984-17.984 47.034 0 65.018l225.492 225.494L93.487 609.491c-17.984 17.984-17.984 47.034 0 65.018s47.034 17.984 65.018 0l225.492-225.492 225.492 225.492c17.984 17.984 47.034 17.984 65.018 0s17.984-47.034 0-65.018L449.015 383.999l225.492-225.494c17.521-17.521 17.521-47.034 0-64.559z'/%3E%3C/svg%3E");
      }
      `;
  }

  static get $style(): string {
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
        z-index: 90010;
        outline: 1px solid var(--ctrl-focus);
      }
      :host:focus-within strong,
      :host:focus-within legend,
      :host input:focus + * {
        color: var(--ctrl-focus-label);
      }
      :host:not(:focus-within) strong {
        pointer-events: none;
      }
      [disabled]>:host,
      :host[disabled] {
        opacity: 0.8;
        cursor: not-allowed;
        -webkit-user-select: none;
        user-select: none;
      }
      [disabled]>:host,
      :host[disabled] > * {
        pointer-events: none;
      }
      :host[invalid],
      :host[invalid] > [menu] {
        box-shadow: 0 0 3px 0 var(--ctrl-invalid-border);
        outline-color: var(--ctrl-invalid-border);
      }
      @media (hover: hover) {
        :host:hover {
           z-index: 90010;
        }
        :host:hover,
        :host:hover > [menu] {
          box-shadow: 0 0 3px 1px var(--ctrl-focus);
        }
        :host[invalid]:hover,
        :host[invalid]:hover > [menu] {
          box-shadow: 0 0 3px 1px var(--ctrl-invalid-border);
        }
        :host:hover label::before,
        :host:hover label::after {
          background-color: var(--ctrl-focus-label);
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
      :host input {
        padding: 0;
        margin: 0;
        cursor: inherit;
      }
      :host input + * {
        cursor: inherit;
      }
      :host input:required + *::after,
      :host input[aria-required="true"] + *::after,
      :host fieldset[aria-required="true"] > legend::after {
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
  static $isEqual(v1: unknown, v2: unknown): boolean {
    return isEqual(v1, v2);
  }

  /** Provide logic to check if control is empty (by comparison with value) */
  static $isEmpty(v: unknown): boolean {
    return v === "" || v === undefined;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPBaseControlTypes.Defaults = {
    pressEsc: ClearActions.clear | ClearActions.resetToInit,
    validityDebounceMs: 500,
    validationCase: ValidationCases.onChangeSmart | ValidationCases.onFocusLost,
    validationRules: {
      required: (v, setV) => setV && this.$isEmpty(v) && "This field is required",
    },
  };

  $options: WUPBaseControlTypes.Options<ValueType> = {
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
    const was = this.#isDirty;
    this.setValue(v);
    this.#isDirty = was;
  }

  #initValue?: ValueType;
  /** Default/init value; used to define isChanged & to reset by keyEsc/buttonClear;
   *  If control.$isDirty or not $isEmpty value isn't applied to */
  get $initValue(): ValueType | undefined {
    return this.#initValue;
  }

  set $initValue(v: ValueType | undefined) {
    if (!this.$isReady || (!this.#ctr.$isEqual(v, this.#initValue) && !this.$isDirty && this.$isEmpty)) {
      // setValue if it's empty and not isDirty
      this.$value = v;
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
    return this.#ctr.$isEmpty(this.#value);
  }

  /** Returns if value changed (by comparisson with $initValue via static.isEqual option)
   *  By default values compared by valueOf if it's possible
   */
  get $isChanged(): boolean {
    return !this.#ctr.$isEqual(this.$value, this.#initValue);
  }

  #isValid?: boolean;
  /** Returns true if control is valid; to fire validation use $validate() */
  get $isValid(): boolean {
    if (this.#isValid == null) {
      this.goValidate(WUPBaseControlTypes.ValidateFromCases.onInit, false);
    }

    return this.#isValid as boolean;
  }

  /** Returs if current control is active/focused */
  get $isFocused(): boolean {
    return this === document.activeElement || this.includes(document.activeElement);
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

  $form?: WUPFormElement;

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
  protected gotChanges() {
    this.disposeLstInit.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLstInit.length = 0;

    if (this._opts.validationCase & ValidationCases.onFocusLost) {
      this.disposeLstInit.push(
        onFocusLostEv(this, () => this.goValidate(WUPBaseControlTypes.ValidateFromCases.onFocusLost), {
          debounceMs: this._opts.focusDebounceMs,
        })
      );
    }

    this._opts.label = this.getAttribute("label") ?? this._opts.label;
    this._opts.name = this.getAttribute("name") ?? this._opts.name;
    this._opts.autoComplete = this.getAttribute("autoComplete") ?? this._opts.autoComplete;
    this._opts.disabled = this.getBoolAttr("disabled", this._opts.disabled);
    this._opts.readOnly = this.getBoolAttr("readOnly", this._opts.readOnly);
    this._opts.autoFocus = this.getBoolAttr("autoFocus", this._opts.autoFocus);

    const r = this.$refInput;
    const isPwd = this._opts.name?.includes("password");
    r.type = isPwd ? "password" : "text";

    // set autocomplete
    const af = this._opts.autoComplete; // https://stackoverflow.com/questions/11708092/detecting-browser-autofill
    const n = af === true ? (this._opts.name as string) : af;
    r.autocomplete = n || (isPwd ? "new-password" : "off"); // otherwise it doesn't disable autocomplete
    // r.name = n || (undefined as any as string);
    if (!r.autocomplete) {
      // testcase: form with email+password ignores autocomplete: "off" if previously it was saved
      // it can be ignored by browsers: try to fix > https://stackoverflow.com/questions/2530/how-do-you-disable-browser-autocomplete-on-web-form-field-input-tags
    }

    const label = (this._opts.label ?? (this._opts.name && stringPrettify(this._opts.name))) || null;
    this.$refTitle.textContent = label;
    if (!label && this._opts.name) {
      r.setAttribute("aria-label", stringPrettify(this._opts.name));
    } else {
      r.removeAttribute("aria-label");
    }

    // set other props
    const req = this._opts.validations?.required;
    req ? r.setAttribute("aria-required", "true") : r.removeAttribute("aria-required");
    r.disabled = this._opts.disabled as boolean;
    r.readOnly = this._opts.readOnly ?? (this.$form?.$options.readOnly as boolean);

    this.#isStopAttrListen = true;
    this.setBoolAttr("disabled", this._opts.disabled);
    this.setBoolAttr("readOnly", this._opts.readOnly);
    this.#isStopAttrListen = false;
  }

  /** Use this to append elements; fired single time when element isConnected/appended to layout but not ready yet */
  protected abstract renderControl(): void;

  protected override gotReady() {
    super.gotReady();
    this.gotChanges();

    // this.appendEvent removed by dispose()
    this.appendEvent(
      this,
      "mousedown", // to prevent blur-focus effect for input by label click
      (e) => {
        !(e.target instanceof HTMLInputElement) && e.preventDefault();
        setTimeout(() => !this.$isFocused && this.focus());
      }
    );

    this.appendEvent(this, "keydown", this.gotKeyDown);

    if (this._opts.validationCase & ValidationCases.onInit) {
      !this.$isEmpty && this.goValidate(WUPBaseControlTypes.ValidateFromCases.onInit);
    }
  }

  #isFirstConn = true;
  protected override connectedCallback() {
    super.connectedCallback();
    if (this.#isFirstConn) {
      this.#isFirstConn = false;
      this.$refInput.type = "text";
      this.renderControl();
    }
    this.$form = WUPFormElement.$tryConnect(this);
    setTimeout(() => this._opts.autoFocus && this.focus()); // timeout required to wait to apply options
  }

  protected disconnectedCallback() {
    super.disconnectedCallback();
    this.$form?.$controls.splice(this.$form.$controls.indexOf(this), 1);
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

    // todo validate required first ????
    Object.keys(vls).some((k) => {
      const vl = vls[k as "required"];

      let err: false | string;
      if (vl instanceof Function) {
        err = vl(v as any);
      } else {
        const rules = this.#ctr.$defaults.validationRules;
        const r = rules[k as "required"];
        if (!r) {
          const n = this._opts.name ? `.[${this._opts.name}]` : "";
          throw new Error(`${this.tagName}${n}. Validation rule [${vl}] is not found`);
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
      p.id = this.#ctr.$uniqueId;
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
  protected setValue(v: ValueType | undefined, canValidate = true) {
    const was = this.#value;
    this.#value = v;
    if (!this.$isReady) {
      return;
    }

    this.$isDirty = true;
    const isChanged = !this.#ctr.$isEqual(v, was);

    if (!isChanged) {
      return;
    }

    const c = this._opts.validationCase;
    if (this.$isReady && canValidate && (c & ValidationCases.onChange || c & ValidationCases.onChangeSmart)) {
      this.goValidate(WUPBaseControlTypes.ValidateFromCases.onInput);
    }
    this.fireEvent("$change", { cancelable: false });
  }

  /* Fired when user pressed Esc-key or button-clear */
  protected clearValue(canValidate = true) {
    const was = this.#value;

    const isEscClear = this._opts.pressEsc & ClearActions.clear;
    if (this._opts.pressEsc & ClearActions.resetToInit) {
      if (this.$isChanged) {
        this.setValue(this.$initValue, canValidate);
        this.#prevValue = was;
        return;
      }
    }
    isEscClear && this.setValue(this.$isEmpty ? this.#prevValue : undefined, canValidate);
    this.#prevValue = was;
  }

  #prevValue = this.#value;
  /** Fired when user pressed key */
  protected gotKeyDown(e: KeyboardEvent) {
    if (this._opts.pressEsc && e.key === "Escape") {
      this.clearValue();
    }
  }

  protected override gotOptionsChanged(e: WUP.OptionEvent) {
    super.gotOptionsChanged(e);
    this.gotChanges();
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
      this.gotChanges();
    });
  }

  protected override dispose() {
    super.dispose();
    this.disposeLstInit.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLstInit.length = 0;
  }
}

// todo implement password input
