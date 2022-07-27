import WUPBaseElement, { WUP } from "../baseElement";
import WUPFormElement from "../formElement";
import isEqual from "../helpers/isEqual";
import nestedProperty from "../helpers/nestedProperty";
import onFocusLostEv from "../helpers/onFocusLost";
import stringPrettify from "../helpers/stringPrettify";
import { onFocusGot } from "../indexHelpers";
// eslint-disable-next-line import/named
import WUPPopupElement, { ShowCases } from "../popup/popupElement";
import { WUPcssIcon } from "../styles";
import IBaseControl from "./baseControl.i";

/** Cases of validation for WUP Controls */
export const enum ValidationCases {
  /** Wait for first user-change > wait for valid > wait for invalid >> show error;
   *  When invalid: wait for valid > hide error > wait for invalid > show error
   *  Also you can check $options.validateDebounceMs */
  onChangeSmart = 1,
  /** Validate when user changed value (via type,select etc.); Also you can check $options.validateDebounceMs */
  onChange = 1 << 1,
  /** Validate when control losts focus */
  onFocusLost = 1 << 2,
  /** Validate if control has value and gets focus (recommended option for password with $options.validationShowAll) */
  onFocusWithValue = 1 << 3,
  /** Validate when got state 'isReady' and initValue is not empty */
  onInit = 1 << 4,
}

/** Actions when user pressed ESC or button-clear */
export const enum ClearActions {
  /** Disable action */
  none = 0,
  /** Make control empty; pressing Esc again rollback action (it helps to avoid accidental action) */
  clear = 1 << 1,
  /** Return to init value; pressing Esc again rollback action (it helps to avoid accidental action) */
  resetToInit = 1 << 2,
}

/** Points on what called validation */
export const enum ValidateFromCases {
  /** When element appended to layout */
  onInit,
  /** When control gets focus */
  onFocus,
  /** When control loses focus (including document.activeElement) */
  onFocusLost,
  /** When user type text (or change value via input) in <input /> */
  onInput,
  /** When form.submit is called (via button submit or somehow else); It's impossible to disable */
  onSubmit,
  /** When $validate() is called programmatically */
  onManualCall,
}

export namespace WUPBaseIn {
  export type Generics<ValueType, ValidationKeys, ExtraDefaults = {}, ExtraOptions = {}> = {
    Validation: (value: ValueType | undefined, setValue: ValidationKeys[keyof ValidationKeys]) => false | string;
    CustomValidation: (value: ValueType | undefined) => false | string;
    Defaults: {
      /** Rules defined for control */
      validationRules: {
        [K in keyof ValidationKeys]?: (value: ValueType, setValue: ValidationKeys[K]) => false | string;
      };
      /** When to validate control and show error. Validation by onSubmit impossible to disable
       *  @defaultValue onChangeSmart | onFocusLost | onFocusWithValue | onSubmit
       */
      validationCase: ValidationCases;
      /** Wait for pointed time before show error (it's sumarized with $options.debounce); WARN: hide error without debounce
       *  @defaultValue 500
       */
      validateDebounceMs: number;
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
            [K in keyof ValidationKeys]?: ValidationKeys[K] | ((value: ValueType | undefined) => false | string);
          }
        | { [k: string]: (value: ValueType | undefined) => false | string };
      /** Show all validation-rules with checkpoints as list instead of single error */
      validationShowAll?: boolean;
    } & ExtraOptions;
  };

  export type GenDef<T = string> = Generics<T, WUPBase.ValidationMap>["Defaults"];
  export type GenOpt<T = string> = Generics<T, WUPBase.ValidationMap>["Options"];
}

type StoredItem = HTMLLIElement & { _wupVld: (v: any) => string | false };
type StoredRefError = HTMLElement & { _wupVldItems?: StoredItem[] };

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
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$change') instead */
      onChange?: never;
    }

    interface EventMap extends WUP.EventMap {
      /** Called on value change */
      $change: Event;
    }
  }
}

export default abstract class WUPBaseControl<ValueType = any, Events extends WUPBase.EventMap = WUPBase.EventMap>
  extends WUPBaseElement<Events>
  implements IBaseControl<ValueType>
{
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPBaseControl;

  static observedOptions = new Set<string>(["label", "name", "autoComplete", "disabled", "readOnly", "validations"]);

  // todo use const instead of getter
  /* Array of attribute names to listen for changes */
  static get observedAttributes(): Array<string> {
    return ["label", "name", "autocomplete", "disabled", "readonly", "initvalue"];
  }

  /** Text announced by screen-readers; @defaultValue `Error for` */
  static get $ariaError(): string {
    return "Error for";
  }

  /** Css-variables related to component */
  static get $styleRoot(): string {
    return `:root {
        --ctrl-padding: 1.5em 1em 0.5em 1em;
        --ctrl-focus: var(--base-focus);
        --ctrl-focus-label: var(--base-focus);
        --ctrl-selected: var(--ctrl-focus-label);
        --ctrl-label: #5e5e5e;
        --ctrl-icon: var(--ctrl-label);
        --ctrl-icon-size: 1em;
        --ctrl-back: var(--base-back);
        --ctrl-border-radius: var(--border-radius);
        --ctrl-err-text: #ad0000;
        --ctrl-err-back: #fff4fa;
        --ctrl-err-icon-valid: green;
        --ctrl-invalid-border: red;
        --wup-icon-cross: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M674.515 93.949a45.925 45.925 0 0 0-65.022 0L384.001 318.981 158.509 93.487a45.928 45.928 0 0 0-65.022 0c-17.984 17.984-17.984 47.034 0 65.018l225.492 225.494L93.487 609.491c-17.984 17.984-17.984 47.034 0 65.018s47.034 17.984 65.018 0l225.492-225.492 225.492 225.492c17.984 17.984 47.034 17.984 65.018 0s17.984-47.034 0-65.018L449.015 383.999l225.492-225.494c17.521-17.521 17.521-47.034 0-64.559z'/%3E%3C/svg%3E");
        --wup-icon-check: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath stroke='black' stroke-width='40' d='M37.691 450.599 224.76 635.864c21.528 21.32 56.11 21.425 77.478 0l428.035-426.23c21.47-21.38 21.425-56.11 0-77.478s-56.11-21.425-77.478 0L263.5 519.647 115.168 373.12c-21.555-21.293-56.108-21.425-77.478 0s-21.425 56.108 0 77.478z'/%3E%3C/svg%3E");
        --wup-icon-dot: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='20'/%3E%3C/svg%3E");
      }`;
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
        max-height: 3em;
        overflow: auto;
        overflow: overlay;
      }
      :host [error] ul {
        margin:0; padding:2px 4px 2px;
      }
      :host [error] li {
        display: flex;
        align-items: center;
        margin-left: -5px;
      }
      :host [error] li:before {
        content: '';
        --ctrl-icon-img: var(--wup-icon-dot);
        --ctrl-icon: var(--ctrl-err-text);
        ${WUPcssIcon}
      }
      :host [error] li[valid] {
        color: var(--ctrl-err-icon-valid);
      }
      :host [error] li[valid]:before {
        content: '';
        --ctrl-icon-img: var(--wup-icon-check);
        --ctrl-icon: var(--ctrl-err-icon-valid);
      }
      :host:focus-within [error] {
        max-height: none;
      }
      @media (hover: hover) {
        :host:hover {
          z-index: 90011;
        }
        :host:hover [error] {
          max-height: none;
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
      }`;
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
    validateDebounceMs: 500,
    validationCase: ValidationCases.onChangeSmart | ValidationCases.onFocusLost | ValidationCases.onFocusWithValue,
    validationRules: {
      required: (v, setV) => setV === true && this.$isEmpty(v) && "This field is required",
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
   *  If control not $isDirty and not changed $value is updated according to $initValue */
  get $initValue(): ValueType | undefined {
    return this.#initValue;
  }

  set $initValue(v: ValueType | undefined) {
    if (!this.$isReady || (!this.#ctr.$isEqual(v, this.#initValue) && !this.$isDirty && !this.$isChanged)) {
      this.$value = v; // setValue if it's empty and not isDirty
    }
    this.#initValue = v;
    if (!(this as any)._noDelInitValueAttr) {
      this._isStopChanges = true;
      this.removeAttribute("initvalue");
      this._isStopChanges = false;
    }
  }

  #isDirty = false;
  /** True if control is touched by user */
  get $isDirty(): boolean {
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
  /** Returns true if control is valid; it'c cache-value. To refresh - call $validate() */
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

  /** Returns if related form or control disabled (true even if form.$options.disabled && !control.$options.disabled) */
  get $isDisabled(): boolean {
    return this.$form?.$options.disabled || this._opts.disabled || false;
  }

  /** Returns if related form or control readonly (true even if form.$options.readOnly && !control.$options.readOnly) */
  get $isReadOnly(): boolean {
    return this.$form?.$options.readOnly || this._opts.readOnly || false;
  }

  /** Returns autoComplete name if related form or control option is enabled (and control.$options.autoComplete !== false ) */
  get $autoComplete(): string | false {
    const af = this._opts.autoComplete ?? (this.$form?.$options.autoComplete || false);
    return (af === true ? this._opts.name : af) || false;
  }

  /** Check validity and show error if canShowError is true (by default)
   * @returns errorMessage or false (if valid) */
  $validate(canShowError = true): string | false {
    // todo $validate mustIgnore debounce
    return this.goValidate(ValidateFromCases.onManualCall, canShowError);
  }

  $showError(err: string): void {
    return this.goShowError(err, this.$refInput);
  }

  $hideError(): void {
    return this.goHideError();
  }

  #refDetails?: HTMLElement;
  /** Add (replace) description of control to be anounced by screen-readers */
  $ariaDetails(text: string | null): void {
    // this.setAttr.call(this.$refInput, "aria-description", text); // watchfix: Safari VoiceOver doesn't support aria-description: https://a11ysupport.io/tests/tech__aria__aria-description
    let el = this.#refDetails;
    if (!text) {
      if (el) {
        el.remove();
        this.#refDetails = undefined;
      }
    } else {
      if (!el) {
        el = document.createElement("span");
        el.className = this.#ctr.classNameHidden;
        this.#refDetails = this.$refTitle.parentElement!.appendChild(el);
      }
      el.textContent = text;
    }
  }

  /** Announce text by screenReaders if element is focused */
  $ariaSpeak(text: string): void {
    // don't use speechSynthesis because it's announce despite on screen-reader settings - can be disabled
    // text && speechSynthesis && speechSynthesis.speak(new SpeechSynthesisUtterance(text)); // watchfix: https://stackoverflow.com/questions/72907960/web-accessibility-window-speechsynthesis-vs-role-alert
    if (text) {
      const el = document.createElement("section");
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-atomic", true);
      el.className = this.#ctr.classNameHidden;
      this.appendChild(el);
      setTimeout(() => (el.textContent = text), 100); // otherwise reader doesn't announce section
      setTimeout(() => el.remove(), 200);
    }
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

  /** Array of removeEventListener() that called ReInit */
  protected disposeLstInit: Array<() => void> = [];

  protected override gotChanges(propsChanged: Array<keyof WUPBase.Options | any> | null): void {
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

    if (this._opts.validationCase & ValidationCases.onFocusWithValue) {
      this.disposeLstInit.push(
        onFocusGot(this, () => !this.$isEmpty && this.goValidate(ValidateFromCases.onFocus), {
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
    const n = !label && this._opts.name ? stringPrettify(this._opts.name) : null;
    this.setAttr.call(i, "aria-label", n);

    // set other props
    this.setAttr("disabled", this._opts.disabled, true);
    this.setAttr("readOnly", this._opts.readOnly, true);
    this.setAttr.call(this.$refInput, "aria-required", !!this.validations?.required);

    // lowercase for attribute-changes otherwise it's wrong
    if (!propsChanged || propsChanged.includes("initvalue")) {
      const attr = this.getAttribute("initvalue");
      if (attr) {
        (this as any)._noDelInitValueAttr = true;
        this.$initValue = this.parseValue(attr);
        delete (this as any)._noDelInitValueAttr;
      } else if (propsChanged) {
        this.$initValue = undefined; // removed attr >> remove initValue
      }
    }
    // retrieve value from model
    if (this.$initValue === undefined && this.$form && this._opts.name) {
      if (!propsChanged || propsChanged.includes("name")) {
        this.$initValue = nestedProperty.get(this.$form._initModel as any, this._opts.name);
      }
    }

    this.gotFormChanges(propsChanged);
  }

  /** Called on control/form Init and every time as control/form options changed. Method contains changes related to form `disabled`,`readonly` etc. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gotFormChanges(propsChanged: Array<keyof WUPForm.Options> | Array<keyof WUPBase.Options | any> | null): void {
    const i = this.$refInput;
    i.disabled = this.$isDisabled as boolean;
    i.readOnly = this.$isReadOnly;
    i.autocomplete = this.$autoComplete || "off";
  }

  /** Use this to append elements; called single time when element isConnected/appended to layout but not ready yet
   * Attention: this.$refInput is already defined */
  protected abstract renderControl(): void;
  /** Called when need to parse inputValue or attr [initValue] */
  protected abstract parseValue(text: string): ValueType | undefined;

  protected override gotReady(): void {
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
  }

  protected override gotRender(): void {
    super.gotRender();
    this.$refInput.type = "text";
    this.renderControl();
  }

  protected override connectedCallback(): void {
    super.connectedCallback();
    this.$form = WUPFormElement.$tryConnect(this);
  }

  protected override gotRemoved(): void {
    super.gotRemoved();
    this.$form?.$controls.splice(this.$form.$controls.indexOf(this), 1);
  }

  /** Returns validations enabled by user */
  protected get validations(): WUPBase.Options["validations"] | undefined {
    const vls = (nestedProperty.get(window, this.getAttribute("validations") || "") ||
      this._opts.validations) as WUPBase.Options["validations"];
    return vls;
  }

  /** Returns validations functions ready for checking */
  protected get validationsRules(): Array<(v: ValueType | undefined) => string | false> {
    const vls = this.validations;

    if (!vls) {
      return [];
    }

    const check = (v: ValueType | undefined, k: string | number): string | false => {
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
        err = r(v as unknown as string, vl as boolean);
      }

      if (err !== false) {
        return err;
      }

      return false;
    };

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const arr = Object.keys(vls)
      .sort((k1, k2) => {
        if (k1 === "required") return -1;
        if (k2 === "required") return 1;
        return 0;
      })
      .map((key) => ({ [key]: (v: ValueType | undefined) => check.call(self, v, key) }[key])); // make object to create named function

    return arr;
  }

  #wasValid?: boolean;
  protected _validTimer?: number;
  /** Method called to check control based on validation rules and current value */
  protected goValidate(fromCase: ValidateFromCases, canShowError = true): string | false {
    const vls = this.validationsRules;
    if (!vls.length) {
      this.#isValid = true;
      return false;
    }

    const v = this.$value;
    let errMsg = "";
    this.#isValid = !this.validationsRules.some((fn) => {
      const err = fn(v);
      if (err) {
        errMsg = err;
        return true;
      }
      return false;
    });
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

    if (errMsg) {
      if (canShowError || this.$refError) {
        this._validTimer = window.setTimeout(
          () => this.goShowError(errMsg, this.$refInput),
          this._opts.validateDebounceMs
        );
      }
      return errMsg;
    }

    this.goHideError();
    return false;
  }

  /** Show (append/update) all validation-rules with checkpoints to existed error-element */
  protected renderValidations(parent: WUPPopupElement | HTMLElement, skipRules = ["required"]): void {
    const vls = this.validationsRules.filter((vl) => !skipRules.includes(vl.name));
    if (!vls.length) {
      return;
    }

    let p: StoredRefError = parent as StoredRefError;
    if (!p._wupVldItems) {
      p = parent as StoredRefError;
      p._wupVldItems = [];
      const ul = p.appendChild(document.createElement("ul"));
      ul.setAttribute("aria-hidden", true);
      for (let i = 0; i < vls.length; ++i) {
        const li = ul.appendChild(document.createElement("li")) as StoredItem;
        li._wupVld = vls[i];
        p._wupVldItems.push(li);
        const err = vls[i](undefined);
        if (err) {
          li.textContent = err;
        } else {
          // eslint-disable-next-line no-loop-func
          setTimeout(() => {
            const n = this._opts.name ? `.[${this._opts.name}]` : "";
            throw new Error(
              `${this.tagName}${n}. Can't get error message for validationRule [${vls[i].name}]. Calling rule with value [undefined] must return error message`
            );
          });
        }
      }
    }

    const v = this.$value;
    p._wupVldItems.forEach((li) => this.setAttr.call(li, "valid", li._wupVld(v) === false, true));
  }

  protected renderError(): WUPPopupElement {
    const p = document.createElement("wup-popup");
    p.$options.showCase = ShowCases.always;
    p.$options.target = this;
    p.$options.placement = [
      WUPPopupElement.$placements.$bottom.$start.$resizeWidth,
      WUPPopupElement.$placements.$top.$start.$resizeWidth,
    ];
    p.$options.maxWidthByTarget = true;
    p.setAttribute("error", "");
    // p.setAttribute("role", "alert");
    p.setAttribute("aria-live", "off");
    p.setAttribute("aria-atomic", true); // necessary to make Voiceover on iOS read the error messages after more than one invalid submission
    p.id = this.#ctr.$uniqueId;
    p.addEventListener("click", this.focus);

    const hiddenLbl = p.appendChild(document.createElement("span"));
    hiddenLbl.className = this.#ctr.classNameHidden;
    p.appendChild(document.createElement("span"));
    this.$refError = this.appendChild(p);

    return p;
  }

  #refErrTarget?: HTMLElement;
  /** Method called to show error and set invalid state on input; point null to show all validation rules with checkpoints */
  protected goShowError(err: string | null, target: HTMLElement): void {
    // possible when user goes to another page and focusout > validTimeout happened
    if (!this.isConnected) {
      return;
    }
    if (!this.$refError) {
      this.$refError = this.renderError();
    }

    this._opts.validationShowAll && this.renderValidations(this.$refError);

    if (err !== null) {
      this.#refErrTarget = target;
      (target as HTMLInputElement).setCustomValidity?.call(target, err);
      this.setAttribute("invalid", "");
      const lbl = this.$refTitle.textContent;
      this.$refError.firstElementChild!.textContent = lbl ? `${this.#ctr.$ariaError} ${lbl}:` : "";
      const el = this.$refError.children.item(1)!;
      el.textContent = err;

      const renderedErr = (this.$refError as StoredRefError)._wupVldItems?.find((li) => li.textContent === err);
      this.setAttr.call(el, "className", renderedErr ? this.#ctr.classNameHidden : null);

      target.setAttribute("aria-describedby", this.$refError.id); // watchfix: nvda doesn't read aria-errormessage: https://github.com/nvaccess/nvda/issues/8318
      if (!this.$isFocused) {
        this.$refError!.setAttribute("role", "alert"); // force to announce error when focus is already missed
        renderedErr?.scrollIntoView();
      }
    }
  }

  /** Method called to hide error and set valid state on input */
  protected goHideError(): void {
    if (this.$refError) {
      const p = this.$refError;
      p.addEventListener("$hide", p.remove);
      p.$hide(); // hide with animation
      this.$refError = undefined;

      (this.#refErrTarget as HTMLInputElement).setCustomValidity?.call(this.#refErrTarget, "");
      this.#refErrTarget!.removeAttribute("aria-describedby");
      this.removeAttribute("invalid");
      this.#refErrTarget = undefined;
    }
  }

  /** Fire this method to update value & validate; returns null when not $isReady, true if changed */
  protected setValue(v: ValueType | undefined, canValidate = true): boolean | null {
    const was = this.#value;
    this.#value = v;
    if (!this.$isReady) {
      return null;
    }

    this.$isDirty = true;
    const isChanged = !this.#ctr.$isEqual(v, was);

    if (!isChanged) {
      return false;
    }

    const c = this._opts.validationCase;
    if (this.$isReady && canValidate && (c & ValidationCases.onChange || c & ValidationCases.onChangeSmart)) {
      if (this.#wasValid == null && c & ValidationCases.onChangeSmart) {
        this.#value = was;
        this.goValidate(ValidateFromCases.onInput, false); // to define if previous value was valid or not
        this.#value = v;
      }
      this.goValidate(ValidateFromCases.onInput);
    }
    this.fireEvent("$change", { cancelable: false, bubbles: true });
    return true;
  }

  #prevValue = this.#value;
  /* Called when user pressed Esc-key or button-clear */
  protected clearValue(canValidate = true): void {
    const was = this.#value;

    let v: ValueType | undefined;
    if (this._opts.clearActions & ClearActions.resetToInit) {
      if (this.$isChanged) {
        v = this.$initValue;
      } else if (!(this._opts.clearActions & ClearActions.clear && !this.$isEmpty)) {
        v = this.#prevValue;
      }
    } else if (this._opts.clearActions & ClearActions.clear) {
      v = this.$isEmpty ? this.#prevValue : undefined;
    }

    this.setValue(v, canValidate);
    this.#prevValue = was;
  }

  /** Called when user pressed key */
  protected gotKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this.clearValue();
    }
  }

  protected override dispose(): void {
    super.dispose();
    this.disposeLstInit.forEach((f) => f()); // remove possible previous event listeners
    this.disposeLstInit.length = 0;
  }
}

// testcase: $initModel & attr [name] (possible it doesn't work)
// testcase: required & hasInitValue. Removing value must provide error
// testcase: has invalid initValue. Changing must provide error (event smartOption)
// testcase: all empty controls (or with single value) must be have the same height - 44px (check, switch can be different height)

// todo NumberInput - set role 'spinbutton'
// todo details about validations/customMessages
