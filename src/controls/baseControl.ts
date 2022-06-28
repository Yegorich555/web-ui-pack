import WUPBaseElement, { WUP } from "../baseElement";
import WUPFormElement from "../formElement";
import isEqual from "../helpers/isEqual";
import nestedProperty from "../helpers/nestedProperty";
import onFocusLostEv from "../helpers/onFocusLost";
import stringPrettify from "../helpers/stringPrettify";
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

export namespace WUPBaseIn {
  export type Generics<ValueType, ValidationKeys, ExtraDefaults = {}, ExtraOptions = {}> = {
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
      /** Behavior that expected for clearing value inside control (via pressEsc or btnClear)
       * @defaultValue clear | resetToInit (both means: resetToInit if exists, 2nd time - clear etc.) */
      clearActions: ClearActions;
    } & ExtraDefaults;
    Options: Omit<Generics<ValueType, WUPBase.ValidationMap, ExtraDefaults>["Defaults"], "validationRules"> & {
      /** Title/label of control; if label is missed it's parsed from option [name]. To skip point `label=''` (empty string) */
      label?: string;
      /** Property/key of model (collected by form); For name `firstName` >> `model.firstName`; for `nested.firstName` >> `model.nested.firstName` etc. */
      name?: string;
      /** Focus element when it's appended to layout */
      autoFocus?: boolean;
      /** Name to autocomplete by browser; Point `true` to inherit from $options.name or some string
       *  if control has no autocomplete option then it's inherrited from form
       * @defaultValue false */
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

  export type GenDef<T = string> = Generics<T, WUPBase.ValidationMap>["Defaults"];
  export type GenOpt<T = string> = Generics<T, WUPBase.ValidationMap>["Options"];
}

declare global {
  namespace WUPBase {
    interface ValidationMap {
      required: boolean;
    }
    interface Defaults<T = string> extends WUPBaseIn.GenDef<T> {}
    interface Options<T = string> extends WUPBaseIn.GenOpt<T> {}
    interface JSXProps<T extends WUPBaseControl> extends WUP.JSXProps<T> {
      /** @deprecated Title/label for control; */
      label?: string;
      /** @deprecated Property key of model */
      name?: string;
      /** @deprecated Name to autocomplete by browser; */
      autoComplete?: string;

      /** Disallow edit/copy value. Use [disabled] for styling */
      disabled?: boolean;
      /** Disallow edit value */
      readOnly?: boolean;
      /** @deprecated Focus on init */
      autoFocus?: boolean;

      /** @deprecated default value (expected formatted for input) */
      initValue?: string | boolean | number;
      /** @deprecated Rules enabled for current control. Point global obj-key with validations (set `window.validations.input1` for `window.validations.input1 = {required: true}` ) */
      validations?: string;

      /** @readonly Use [invalid] for styling */
      readonly invalid?: boolean;

      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$validate') instead */
      onValidate?: never;
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$change') instead */
      onChange?: never;
    }

    interface EventMap extends WUP.EventMap {
      /** Fires on value change */
      $change: Event;
      /** Fires on validation-call (depends on @see ValidationCases) */
      $validate: Event;
    }
  }
}

export default abstract class WUPBaseControl<ValueType = any, Events extends WUPBase.EventMap = WUPBase.EventMap>
  extends WUPBaseElement<Events>
  implements IBaseControl<ValueType>
{
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPBaseControl;

  static observedOptions = new Set<keyof WUPBase.Options>(["label", "name", "autoComplete", "disabled", "readOnly"]);

  /* Array of attribute names to listen for changes */
  static get observedAttributes(): Array<keyof WUPBase.Options | any> {
    return ["label", "name", "autoComplete", "disabled", "readOnly", "initValue"];
  }

  /** Css-variables related to component */
  static get $styleRoot(): string {
    return `:root {
        --ctrl-padding: 1.4em 1em 0.6em 1em;
        --ctrl-focus: var(--base-focus);
        --ctrl-focus-label: #00778d;
        --ctrl-selected: var(--ctrl-focus-label);
        --ctrl-label: #5e5e5e;
        --ctrl-icon: var(--ctrl-label);
        --ctrl-icon-size: 1em;
        --ctrl-back: var(--base-back);
        --ctrl-border-radius: var(--border-radius, 6px);
        --ctrl-err-text: #ad0000;
        --ctrl-err-back: #fff4fa;
        --ctrl-invalid-border: red;
        --wup-icon-cross: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M674.515 93.949a45.925 45.925 0 0 0-65.022 0L384.001 318.981 158.509 93.487a45.928 45.928 0 0 0-65.022 0c-17.984 17.984-17.984 47.034 0 65.018l225.492 225.494L93.487 609.491c-17.984 17.984-17.984 47.034 0 65.018s47.034 17.984 65.018 0l225.492-225.492 225.492 225.492c17.984 17.984 47.034 17.984 65.018 0s17.984-47.034 0-65.018L449.015 383.999l225.492-225.494c17.521-17.521 17.521-47.034 0-64.559z'/%3E%3C/svg%3E");
      }
      `;
  }

  /** StyleContent related to component */
  static get $style(): string {
    // WARN: 'contain:style' is tricky rule
    return `${super.$style}
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
        opacity: 0.6;
        cursor: not-allowed;
        -webkit-user-select: none;
        user-select: none;
      }
      [disabled]>:host > *,
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
        :host:hover label:before,
        :host:hover label:after {
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
      :host input:required + *:after,
      :host input[aria-required="true"] + *:after,
      :host fieldset[aria-required="true"] > legend:after {
        content: "*";
        font-size: larger;
        font-weight: bolder;
        line-height: 0;
      }
      :host [error] {
        cursor: pointer;
        font-size: small;
        color: var(--ctrl-err-text);
        background: var(--ctrl-err-back);
        margin: -4px 0;
      }
    `;
  }

  /** Default function to compare values/changes;
   *  Redefine it or define valueOf for values; By default values compared by valueOf if it's possible */
  static $isEqual(v1: unknown, v2: unknown): boolean {
    return isEqual(v1, v2);
  }

  /** Provide logic to check if control is empty (by comparison with value) */
  static $isEmpty(v: unknown): boolean {
    return v === "" || v === undefined;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPBase.Defaults = {
    clearActions: ClearActions.clear | ClearActions.resetToInit,
    validityDebounceMs: 500,
    validationCase: ValidationCases.onChangeSmart | ValidationCases.onFocusLost,
    validationRules: {
      required: (v, setV) => setV && this.$isEmpty(v) && "This field is required",
    },
  };

  $options: WUPBase.Options<ValueType> = {
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
    this.setValue(v, false);
    this.#isDirty = was;
  }

  #initValue?: ValueType;
  /** Default/init value; used to define isChanged & to reset by keyEsc/buttonClear;
   *  If control.$isDirty or not $isEmpty value isn't applied to */
  get $initValue(): ValueType | undefined {
    return this.#initValue;
  }

  set $initValue(v: ValueType | undefined) {
    if (!this.$isReady || (!this.#ctr.$isEqual(v, this.#initValue) && !this.$isDirty)) {
      // setValue if it's empty and not isDirty
      this.$value = v;
    }
    this.#initValue = v;
  }

  #isDirty = false;
  /** True if control is touched by user */
  get $isDirty() {
    return this.#isDirty;
  }

  set $isDirty(v: boolean) {
    this.#isDirty = v;
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
      this.goValidate(ValidateFromCases.onInit, false);
    }

    return this.#isValid as boolean;
  }

  /** Returns if current control is active/focused */
  get $isFocused(): boolean {
    return this === document.activeElement || this.includes(document.activeElement);
  }

  /** Returns if related form or control disabled */
  get $isDisabled(): boolean {
    return this.$form?.$options.disabled || this._opts.disabled || false;
  }

  /** Returns if related form or control readonly */
  get $isReadOnly(): boolean {
    return this.$form?.$options.readOnly || this._opts.readOnly || false;
  }

  get $autoComplete(): string | false {
    const af = this._opts.autoComplete ?? (this.$form?.$options.autoComplete || false);
    return (af === true ? this._opts.name : af) || false;
  }

  /** Check validity and show error if not swtich off; canShowError is true by default
   * @returns errorMessage or false (if valid) */
  $validate(canShowError = true): string | false {
    return this.goValidate(ValidateFromCases.onManualCall, canShowError);
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

  protected override gotChanges(propsChanged: Array<keyof WUPBase.Options | any> | null) {
    super.gotChanges(propsChanged);

    this.disposeLstInit.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLstInit.length = 0;

    if (this._opts.validationCase & ValidationCases.onFocusLost) {
      this.disposeLstInit.push(
        onFocusLostEv(this, () => this.goValidate(ValidateFromCases.onFocusLost), {
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

    const i = this.$refInput;
    // set label
    const label = (this._opts.label ?? (this._opts.name && stringPrettify(this._opts.name))) || null;
    this.$refTitle.textContent = label;
    if (!label && this._opts.name) {
      i.setAttribute("aria-label", stringPrettify(this._opts.name));
    } else {
      i.removeAttribute("aria-label");
    }

    // set other props
    const req = this._opts.validations?.required;
    req ? i.setAttribute("aria-required", "true") : i.removeAttribute("aria-required");
    this.setBoolAttr("disabled", this._opts.disabled);
    this.setBoolAttr("readOnly", this._opts.readOnly);

    if (!propsChanged || propsChanged.includes("initValue")) {
      const attr = this.getAttribute("initValue");
      this.$initValue = attr !== null ? this.parseValue(attr || "") : this.$initValue;
    }

    // retrieve $initValue from $initModel
    if (this.$initValue === undefined && this.$form && this._opts.name) {
      if (!propsChanged || propsChanged.includes("name")) {
        this.$initValue = nestedProperty.get(this.$form._initModel as any, this._opts.name);
      }
    }

    !propsChanged && this.gotFormChanges(null);
  }

  /** Fired on control/form Init and every time as control/form options changed. Method contains changes related to form `disabled`,`readonly` etc. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gotFormChanges(propsChanged: Array<keyof WUPForm.Options> | null) {
    const i = this.$refInput;
    i.disabled = this.$isDisabled as boolean;
    i.readOnly = this.$isReadOnly;
    i.autocomplete = this.$autoComplete || "off";
  }

  /** Use this to append elements; fired single time when element isConnected/appended to layout but not ready yet
   * Attention: this.$refInput is already defined */
  protected abstract renderControl(): void;
  /** Called when need to parse inputValue or attr [initValue] */
  protected abstract parseValue(text: string): ValueType | undefined;

  protected override gotReady() {
    super.gotReady();

    // appendEvent removed by dispose()
    this.appendEvent(
      this,
      "mousedown", // to prevent blur-focus effect for input by label click
      (e) => {
        if (this.$isDisabled) {
          return;
        }
        !(e.target instanceof HTMLInputElement) && e.preventDefault();
        // this required because default focus-effect was prevented
        this.appendEvent(this, "mouseup", () => !this.$isFocused && this.focus(), { once: true });
      }
    );

    this.appendEvent(this, "keydown", (e) => !this.$isDisabled && this.gotKeyDown(e));

    if (this._opts.validationCase & ValidationCases.onInit) {
      !this.$isEmpty && this.goValidate(ValidateFromCases.onInit);
    }

    // this.$form = WUPFormElement.$tryConnect(this);
  }

  protected override gotRender() {
    super.gotRender();
    this.$refInput.type = "text";
    this.renderControl();
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.$form = WUPFormElement.$tryConnect(this);
  }

  protected override gotRemoved() {
    super.gotRemoved();
    this.$form?.$controls.splice(this.$form.$controls.indexOf(this), 1);
  }

  #wasValid = false;
  protected _validTimer?: number;
  /** Method called to check control based on validation rules and current value */
  protected goValidate(fromCase: ValidateFromCases, canShowError = true): string | false {
    const vls =
      (nestedProperty.get(window, this.getAttribute("validations") || "") as WUPBase.Options["validations"]) ||
      this._opts.validations;

    if (!vls) {
      this.#isValid = true;
      return false;
    }

    let errMsg = "";
    const v = this.$value as unknown as string;

    const findErr = (k: string | number) => {
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
    };
    // validate [required] first
    (vls.required && findErr("required")) || Object.keys(vls).some(findErr);

    this.#isValid = !errMsg;
    this._validTimer && clearTimeout(this._validTimer);

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
      this.goValidate(ValidateFromCases.onInput);
    }
    this.fireEvent("$change", { cancelable: false, bubbles: true });
  }

  /* Fired when user pressed Esc-key or button-clear */
  protected clearValue(canValidate = true) {
    const was = this.#value;

    let v: ValueType | undefined;
    if (this._opts.clearActions & ClearActions.resetToInit && this.$isChanged) {
      v = this.$initValue;
    } else if (this._opts.clearActions & ClearActions.clear) {
      v = this.$isEmpty ? this.#prevValue : undefined;
    }
    this.setValue(v, canValidate);
    this.#prevValue = was;
  }

  #prevValue = this.#value;
  /** Fired when user pressed key */
  protected gotKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.clearValue();
    }
  }

  protected override dispose() {
    super.dispose();
    this.disposeLstInit.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLstInit.length = 0;
  }
}

// testcase: $initModel & attr [name] (possible it doesn't work)
