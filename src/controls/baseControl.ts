import WUPBaseElement from "../baseElement";
import WUPFormElement from "../formElement";
import isEqual from "../helpers/isEqual";
import nestedProperty from "../helpers/nestedProperty";
import onFocusLostEv from "../helpers/onFocusLost";
import onFocusGot from "../helpers/onFocusGot";
import { stringPrettify } from "../helpers/string";
import WUPPopupElement from "../popup/popupElement";
import { ShowCases } from "../popup/popupElement.types";
import { WUPcssIcon } from "../styles";
import IBaseControl from "./baseControl.i";

export const enum SetValueReasons {
  /** When `control.$value = 'some value'` */
  manual = 1,
  /** When clearing happened (by Esc or ClearButton click) */
  clear,
  /** When user changes on UI */
  userInput,
  /** When user selected existed option on UI and don't need to call selectMenuItem again (for combobox) */
  userSelect,
}

/** Cases of validation for WUP Controls */
export const enum ValidationCases {
  none = 0,
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
  /** When value changed */
  onChange,
  /** When form.submit is called (via button submit or somehow else); It's impossible to disable */
  onSubmit,
  /** When $validate() is called programmatically */
  onManualCall,
}

type StoredItem = HTMLLIElement & { _wupVld: (v: any) => string | false };
type StoredRefError = HTMLElement & { _wupVldItems?: StoredItem[] };

declare global {
  namespace WUP.BaseControl {
    interface EventMap extends WUP.Base.EventMap {
      /** Called on value change */
      $change: CustomEvent & { detail: SetValueReasons };
    }

    interface ValidityMap {
      /** If $value is empty shows message 'This field is required` */
      required: boolean;
    }

    interface Defaults<T = any, VM = ValidityMap> {
      /** When to validate control and show error. Validation by onSubmit impossible to disable
       *  @defaultValue onChangeSmart | onFocusLost | onFocusWithValue | onSubmit */
      validationCase: ValidationCases;
      /** Wait for pointed time after valueChange before showError (it's sumarized with $options.debounce); WARN: hide error without debounce
       *  @defaultValue 500 */
      validateDebounceMs: number;
      /** Debounce option for onFocustLost event (for validationCases.onFocusLost); More details @see onFocusLostOptions.debounceMs in helpers/onFocusLost;
       * @defaultValue 100ms */
      focusDebounceMs?: number;
      /** Behavior that expected for clearing value inside control (via pressEsc or btnClear)
       * @defaultValue clear | resetToInit (both means: resetToInit if exists, 2nd time - clear etc.) */
      clearActions: ClearActions;
      /** Rules defined for control;
       * * all functions must return error-message when value === undefined
       * * all functions must return error-message if setValue is `true/enabled` or value doesn't fit a rule
       * * value can be undefined only when a rule named as 'required' or need to collect error-messages @see $options.validationShowAll
       * @example
       * ```
       * WUPTextControl.$defaults.validationRules.isNumber = (v === undefined || !/^[0-9]*$/.test(v)) && "Please enter a valid number";
       *
       * const el = document.body.appendChild(document.createElement("wup-text"));
       * el.$options.validations = {
          isNumber: true,
        };
       * ``` */
      validationRules: {
        [K in keyof VM]: (this: IBaseControl, value: T, setValue: VM[K], control: IBaseControl) => false | string;
      };
      /** Rules enabled for current control (related to $defaults.validationRules)
       * @example
       * ```
       * const el = document.body.appendChild(document.createElement("wup-text"));
         el.$options.validations = {
           min: 10, // set min 10symbols for $default.validationRules.min
           custom: (value: string | undefined) => (value === un\defined || value === "test-me") && "This is custom error", // custom validation for single element
         };
       * ```
       * @tutorial Troubleshooting
       ** If setup validations via attr it doesn't affect on $options.validations directly. Instead use el.validations getter instead */
      validations?:
        | { [K in keyof VM]?: VM[K] | ((value: T | undefined) => false | string) }
        | { [k: string]: (value: T | undefined) => false | string };
      /** Storage for saving value
       * @see {@link WUP.BaseControl.Options.storekey}
       * @defaultValue "local" */
      storage?: "local" | "session" | "url";
    }
    interface Options<T = any, VM = ValidityMap> extends Defaults<T, VM> {
      /** Title/label of control; if label is missed it's parsed from option [name]. To skip point `label=''` (empty string) */
      label?: string;
      /** Property/key of model (collected by form); For name `firstName` >> `model.firstName`; for `nested.firstName` >> `model.nested.firstName` etc. */
      name?: string;
      /** Focus element when it's appended to layout */
      autoFocus?: boolean;
      /** Name to autocomplete by browser; Point `true` to inherit from $options.name or some string
       *  if control has no autocomplete option then it's inherited from form
       * @defaultValue false */
      autoComplete?: string | boolean;
      /** Disallow edit/copy value; adds attr [disabled] for styling */
      disabled?: boolean;
      /** Disallow copy value; adds attr [readonly] for styling */
      readOnly?: boolean;
      /** Show all validation-rules with checkpoints as list instead of single error */
      validationShowAll?: boolean;
      /** Storage key for auto saving value in storage;
       * @tutorial rules
       * * Point empty string or `true` to inherit from $options.name
       * * Expected value can be converted toString & parsed from string itself.
       * Override valueFromUrl & valueToUrl to change serializing (for complex objects, arrays etc.)
       * @see {@link WUP.BaseControl.Defaults.storage} */
      skey?: boolean | string;
    }

    interface Attributes
      extends Pick<
        Options,
        "label" | "name" | "autoFocus" | "disabled" | "readOnly" | "autoComplete" | "skey" | "storage"
      > {
      /** default value in string/boolean or number representation (depends on `control.prototype.parse()`) */
      initValue?: string | boolean | number;
      /** Rules enabled for current control. Point global obj-key with validations (use `window.myValidations` where `window.validations = {required: true}` ) */
      validations?: string;
      /** @readonly Use [invalid] for styling */
      readonly invalid?: boolean;
    }

    interface JSXProps<C = WUPBaseControl> extends WUP.Base.JSXProps<C>, Attributes {
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$change') instead */
      onChange?: never;
    }
  }
}

/** Base abstract form-control */
export default abstract class WUPBaseControl<
    ValueType = any,
    Events extends WUP.BaseControl.EventMap = WUP.BaseControl.EventMap
  >
  extends WUPBaseElement<Events>
  implements IBaseControl<ValueType>
{
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPBaseControl;

  /** Text announced by screen-readers when control cleared; @defaultValue `cleared` */
  static $ariaCleared = "cleared";
  /** Text announced by screen-readers; @defaultValue `Error for` */
  static $ariaError = "Error for";

  /* Array of options names to listen for changes */
  static get observedOptions(): Array<string> {
    return <Array<keyof WUP.BaseControl.Options>>[
      "label",
      "name",
      "autoComplete",
      "disabled",
      "readOnly",
      "validations",
      "skey",
    ];
  }

  /* Array of attribute names to listen for changes */
  static get observedAttributes(): Array<string> {
    return <Array<LowerKeys<WUP.BaseControl.Attributes>>>[
      "label", //
      "name",
      "autocomplete",
      "disabled",
      "readonly",
      "initvalue",
      "skey",
      "storage",
    ];
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
        --ctrl-bg: var(--base-bg);
        --ctrl-border: #e6e6e6;
        --ctrl-border-radius: var(--border-radius);
        --ctrl-err-text: #ad0000;
        --ctrl-err-bg: #fff4fa;
        --ctrl-err-icon-valid: green;
        --ctrl-invalid-border: red;
        --wup-icon-cross: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M674.515 93.949a45.925 45.925 0 0 0-65.022 0L384.001 318.981 158.509 93.487a45.928 45.928 0 0 0-65.022 0c-17.984 17.984-17.984 47.034 0 65.018l225.492 225.494L93.487 609.491c-17.984 17.984-17.984 47.034 0 65.018s47.034 17.984 65.018 0l225.492-225.492 225.492 225.492c17.984 17.984 47.034 17.984 65.018 0s17.984-47.034 0-65.018L449.015 383.999l225.492-225.494c17.521-17.521 17.521-47.034 0-64.559z'/%3E%3C/svg%3E");
        --wup-icon-check: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='768'%3E%3Cpath d='M37.691 450.599 224.76 635.864c21.528 21.32 56.11 21.425 77.478 0l428.035-426.23c21.47-21.38 21.425-56.11 0-77.478s-56.11-21.425-77.478 0L263.5 519.647 115.168 373.12c-21.555-21.293-56.108-21.425-77.478 0s-21.425 56.108 0 77.478z'/%3E%3C/svg%3E");
        --wup-icon-dot: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='20'/%3E%3C/svg%3E");
      }`;
    // NiceToHave: change icons to fonts: wupfont
  }

  /** StyleContent related to component */
  static get $style(): string {
    // WARN: 'contain:style' is tricky rule
    return `${super.$style}
      :host {
        contain: style;
        display: block;
        margin-bottom: 20px;
        box-shadow: 0 0 0 1px var(--ctrl-border);
        border-radius: var(--ctrl-border-radius);
        background: var(--ctrl-bg);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;${
          /* issue: https://stackoverflow.com/questions/25704650/disable-blue-highlight-when-touch-press-object-with-cursorpointer */ ""
        }
      }
      :host strong,
      :host legend {
        color: var(--ctrl-label);
        pointer-events: none;
      }
      :host:focus-within,
      :host:focus-within > [menu] {
        z-index: 90010;
        box-shadow: 0 0 0 1px var(--ctrl-focus);
      }
      :host:focus-within strong,
      :host:focus-within legend {
        color: var(--ctrl-focus-label);
        pointer-events: initial;
      }
      [disabled] :host,
      :host[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
        -webkit-user-select: none;
        user-select: none;
      }
      [disabled] :host > *,
      :host[disabled] > * {
        pointer-events: none;
      }
      :host[invalid],
      :host[invalid] > [menu] {
        box-shadow: 0 0 3px 1px var(--ctrl-invalid-border);
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
      :host input,
      :host textarea {
        padding: 0;
        margin: 0;
        cursor: inherit;
      }
      :host [contenteditable=true] {
        margin: var(--ctrl-padding);
        margin-left: 0;
        margin-right: 0;
        cursor: inherit;
      }
      :host strong {
        cursor: inherit;
      }
      :host strong:empty {
        display: none;
      }
      :host [aria-required="true"] + strong:after,
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
        background: var(--ctrl-err-bg);
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
      @media (hover: hover) and (pointer: fine) {
        /*:host:hover {
          z-index: 90011;
        }
        :host:hover [error] {
          max-height: none;
        }*/
        :host:hover,
        :host:hover>[menu],
        :host[hovered],
        :host[hovered]>[menu] {
          box-shadow: 0 0 3px 1px var(--ctrl-focus);
        }
        :host[invalid]:hover,
        :host[invalid]:hover>[menu],
        :host[invalid][hovered],
        :host[invalid][hovered]>[menu] {
          box-shadow: 0 0 3px 1px var(--ctrl-invalid-border);
        }${
          //  :host:hover label:before,
          //  :host:hover label:after {
          //     background-color: var(--ctrl-focus-label);
          //  }
          ""
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

  static $defaults: WUP.BaseControl.Defaults = {
    clearActions: ClearActions.clear | ClearActions.resetToInit,
    validateDebounceMs: 500,
    validationCase: ValidationCases.onChangeSmart | ValidationCases.onFocusLost | ValidationCases.onFocusWithValue,
    validationRules: {
      required: (v, setV) => setV === true && this.$isEmpty(v) && "This field is required",
    },
  };

  $options: WUP.BaseControl.Options<any> = {
    ...this.#ctr.$defaults,
  };

  protected override _opts = this.$options;

  /** Called on value change */
  $onChange?: (e: CustomEvent & { detail: SetValueReasons }) => void;

  #value?: ValueType;
  /** Current value of control; You can change it without affecting on $isDirty state */
  get $value(): ValueType | undefined {
    return this.#value;
  }

  set $value(v: ValueType | undefined) {
    const was = this.#isDirty;
    this.setValue(v, SetValueReasons.manual);
    this.#isDirty = was;
  }

  #initValue?: ValueType;
  /** Default/init value; used to define isChanged & to reset by keyEsc/buttonClear;
   *  If control not $isDirty and not changed $value is updated according to $initValue */
  get $initValue(): ValueType | undefined {
    return this.#initValue;
  }

  set $initValue(v: ValueType | undefined) {
    const was = this.#initValue;
    const canUpdate = !this.$isReady || (!this.$isDirty && !this.$isChanged);
    this.#initValue = v;
    if (canUpdate && !this.#ctr.$isEqual(v, was)) {
      // WARN: comparing required for SelectControl when during the parse it waits for promise
      this.$value = v; // WARN: it's fire $change event despite on value set from $initValue
    }
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

  _isValid?: boolean;
  /** Returns true if control is valid */
  get $isValid(): boolean {
    if (this._isValid == null) {
      this.goValidate(ValidateFromCases.onInit, true);
    }

    return this._isValid as boolean;
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

  /** Check validity and show error if silent is false (by default)
   * @returns errorMessage or false (if valid) */
  $validate(silent = false): string | false {
    return this.goValidate(ValidateFromCases.onManualCall, silent);
  }

  /** Check validity and show error
   * @returns errorMessage or false (if valid) */
  validateBySubmit(): string | false {
    return this.goValidate(ValidateFromCases.onSubmit);
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
  $ariaSpeak(text: string, delayMs = 100): void {
    // don't use speechSynthesis because it's announce despite on screen-reader settings - can be disabled
    // text && speechSynthesis && speechSynthesis.speak(new SpeechSynthesisUtterance(text)); // watchfix: https://stackoverflow.com/questions/72907960/web-accessibility-window-speechsynthesis-vs-role-alert
    /* istanbul ignore else */
    if (text) {
      const el = document.createElement("section");
      el.setAttribute("aria-live", "off");
      el.setAttribute("aria-atomic", true);
      el.className = this.#ctr.classNameHidden;
      el.id = this.#ctr.$uniqueId;
      const i = this.$refInput;
      const an = "aria-describedby";
      i.setAttribute(an, `${i.getAttribute(an) || ""} ${el.id}`.trimStart());
      this.appendChild(el);
      setTimeout(() => (el.textContent = text), delayMs); // otherwise reader doesn't announce section
      setTimeout(() => {
        el.remove();
        const a = i.getAttribute(an);
        /* istanbul ignore else */
        if (a != null) {
          const aNext = a.replace(el.id, "").replace("  ", " ").trim();
          aNext ? i.setAttribute(an, aNext) : i.removeAttribute(an);
        }
      }, 500);
    }
  }

  $form?: WUPFormElement;

  /** Reference to nested HTMLElement */
  $refLabel = document.createElement("label");
  /** Reference to nested HTMLElement */
  $refInput = document.createElement("input") as HTMLInputElement;
  /** Reference to nested HTMLElement tied with $options.label */
  $refTitle = document.createElement("strong");
  /** Reference to nested HTMLElement tied with errorMessage */
  $refError?: WUPPopupElement;

  // constructor() {
  //   super();
  // }

  protected override gotChanges(propsChanged: Array<keyof WUP.BaseControl.Options | any> | null): void {
    super.gotChanges(propsChanged);

    this._opts.label = this.getAttr("label");
    this._opts.name = this.getAttr("name");

    this._opts.autoComplete = this.getAttr("autocomplete", "boolOrString", this._opts.autoComplete);
    this._opts.disabled = this.getAttr("disabled", "bool");
    this._opts.readOnly = this.getAttr("readonly", "bool", this._opts.readOnly);
    this._opts.autoFocus = this.getAttr("autofocus", "bool", this._opts.autoFocus);
    this._opts.skey = this.getAttr("skey", "boolOrString", this._opts.skey);
    this._opts.storage = this.getAttr("storage", "string", this._opts.storage) as "local";

    const i = this.$refInput;
    // set label
    const label = (this._opts.label ?? (this._opts.name && stringPrettify(this._opts.name))) || null;
    this.$refTitle.textContent = label;
    const n = !label && this._opts.name ? stringPrettify(this._opts.name) : null;
    this.setAttr.call(i, "aria-label", n);

    // set other props
    this.setAttr("disabled", this._opts.disabled, true);
    this.setAttr("readonly", this._opts.readOnly, true);
    this.setAttr.call(this.$refInput, "aria-required", !!this.validations?.required);

    // lowercase for attribute-changes otherwise it's wrong
    if (!propsChanged || propsChanged.includes("initvalue")) {
      const attr = this.getAttribute("initvalue");
      if (attr !== null) {
        (this as any)._noDelInitValueAttr = true;
        try {
          this.$initValue = this.parse(attr);
        } catch (err) {
          this.throwError(err);
        }
        delete (this as any)._noDelInitValueAttr;
      } else if (propsChanged) {
        this.$initValue = undefined; // removed attr >> remove initValue
      }
    }
    // retrieve value from model
    if (this.$initValue === undefined && this.$form && this._opts.name && !this.hasAttribute("initvalue")) {
      if (!propsChanged || propsChanged.includes("name")) {
        this.$initValue = nestedProperty.get(this.$form._initModel as any, this._opts.name);
      }
    }
    // retrieve value from store
    if (this.$initValue === undefined && this._opts.skey) {
      this.$initValue = this.storageGet();
    }

    this.gotFormChanges(propsChanged);
  }

  /** Called on control/form Init and every time as control/form options changed. Method contains changes related to form `disabled`,`readonly` etc. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gotFormChanges(propsChanged: Array<string> | null): void {
    const i = this.$refInput;
    i.disabled = this.$isDisabled;
    i.readOnly = this.$isReadOnly;
    i.autocomplete = this.$autoComplete || "off";
    this.$refError && !this.canShowError && this.goHideError(); // hide error if user can't touch the control
  }

  /** Returns true on !$isDisabled */
  get canShowError(): boolean {
    return !this.$isDisabled; // && !this.$isReadOnly;
  }

  /** Use this to append elements; called single time when element isConnected/appended to layout but not ready yet
   * Attention: this.$refInput is already defined */
  protected abstract renderControl(): void;
  /** Called when need to parse inputValue or attr [initValue] */
  abstract parse(text: string): ValueType | undefined;

  protected override gotReady(): void {
    super.gotReady();

    const onFocusGotHandler = (e: FocusEvent): void => {
      const arr = this.gotFocus(e);
      const r = onFocusLostEv(this, () => {
        this.gotFocusLost();
        arr.forEach((f) => f());
        r();
        this.disposeLst.splice(this.disposeLst.indexOf(r), 1);
      });
      this.disposeLst.push(r);
    };

    this.$isFocused && setTimeout(onFocusGotHandler); // case if append element and focus immediately

    const r = onFocusGot(this, onFocusGotHandler, { debounceMs: this._opts.focusDebounceMs });
    this.disposeLst.push(r);

    // appendEvent removed by dispose()
    this.appendEvent(
      this,
      "mousedown", // to prevent blur-focus effect for input by label click
      (e) => {
        if (this.$isDisabled) {
          return;
        }
        const el = e.target as Partial<HTMLElement>;
        !(
          el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          this.$refInput === el ||
          this.includes.call(this.$refInput, el)
        ) && e.preventDefault();
        // this required because default focus-effect was prevented
        this.appendEvent(this, "mouseup", () => !this.$isFocused && this.focus(), { once: true });
      },
      { passive: false } // otherwise preventDefault doesn't work
    );

    if (this._opts.validationCase & ValidationCases.onInit) {
      !this.$isEmpty && this.goValidate(ValidateFromCases.onInit);
    }
  }

  protected override gotRender(): void {
    super.gotRender();
    this.renderControl();
  }

  protected override connectedCallback(): void {
    delete this._errName;
    delete this._errMsg;
    delete this._wasValidNotEmpty;

    super.connectedCallback();
    this.$form = WUPFormElement.$tryConnect(this);
    this.#isDirty = false; // reset state after re-appended
  }

  protected override gotRemoved(): void {
    super.gotRemoved();
    this.$form?.$controls.splice(this.$form.$controls.indexOf(this), 1);
  }

  /** Returns validations enabled by user & defaults */
  protected get validations(): WUP.BaseControl.Options["validations"] | undefined {
    const def = this.#ctr.$defaults.validations;
    const opt = this.getAttr<WUP.BaseControl.Options["validations"]>("validations", "ref");
    return def ? { ...def, ...opt } : opt;
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
      if (typeof vl === "function") {
        err = vl(v as any);
      } else {
        const rules = this.#ctr.$defaults.validationRules;
        const r = rules[k as "required"];
        if (!r) {
          const n = this._opts.name ? `.[${this._opts.name}]` : "";
          throw new Error(`${this.tagName}${n}. Validation rule [${k}] is not found`);
        }
        err = r.call(this, v as unknown as string, vl as boolean, this);
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

  /** Current name of failed validation */
  _errName?: string;
  _wasValidNotEmpty?: boolean;
  protected _validTimer?: ReturnType<typeof setTimeout>;
  /** Method called to check control based on validation rules and current value */
  protected goValidate(fromCase: ValidateFromCases, silent = false): string | false {
    this._errName = undefined;
    const vls = this.validationsRules;
    if (!vls.length) {
      this._isValid = true;
      if (!this.$isEmpty) {
        this._wasValidNotEmpty = true;
      }
      return false;
    }

    const v = this.$value;
    let errMsg = "";
    const isEmpty = this.$isEmpty;
    this._isValid = !vls.some((fn) => {
      // process empty value only on rule 'required'; for others skip if value is empty
      const skipRule = isEmpty && fn.name[0] !== "_" && fn.name !== "required"; // undefined only for 'required' rule; for others: skip if value = undefined
      const err = !skipRule && fn(v);
      if (err) {
        this._errName = fn.name;
        errMsg = err;
        return true;
      }
      return false;
    });
    this._validTimer && clearTimeout(this._validTimer);

    let canShowError = (!silent || this.$refError) && this.canShowError;

    if (fromCase === ValidateFromCases.onChange && this._opts.validationCase & ValidationCases.onChangeSmart) {
      if (errMsg && !this._wasValidNotEmpty && !this.$refError) {
        canShowError = false;
      }
    }

    if (this._isValid && !isEmpty) {
      this._wasValidNotEmpty = true;
    }

    if (errMsg) {
      if (canShowError) {
        // don't wait for debounce if we need to update an error
        const waitMs = this.$refError || fromCase !== ValidateFromCases.onChange ? 0 : this._opts.validateDebounceMs;
        const saved = this._errName;
        const act = (): void => {
          this.goShowError(errMsg, this.$refInput);
          this._errName = saved;
        };
        this._validTimer = waitMs ? setTimeout(act, waitMs) : (act(), undefined);
      }
      return errMsg;
    }

    this.goHideError();
    return false;
  }

  /** Show (append/update) all validation-rules with checkpoints to existed error-element */
  protected renderValidations(parent: WUPPopupElement | HTMLElement, skipRules = ["required"]): void {
    const vls = this.validationsRules.filter((vl) => !skipRules.includes(vl.name) && vl.name[0] !== "_");
    if (!vls.length) {
      return;
    }

    let p: StoredRefError = parent as StoredRefError;
    /* istanbul ignore else */
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
    p.$options.offset = [-2, 0];
    p.setAttribute("error", "");
    // p.setAttribute("role", "alert");
    p.setAttribute("aria-live", "off");
    p.setAttribute("aria-atomic", true); // necessary to make Voiceover on iOS read the error messages after more than one invalid submission
    p.id = this.#ctr.$uniqueId;

    const hiddenLbl = p.appendChild(document.createElement("span"));
    hiddenLbl.className = this.#ctr.classNameHidden;
    p.appendChild(document.createElement("span"));
    this.$refError = this.appendChild(p);
    return p;
  }

  /** Current error message */
  _errMsg?: string;
  #refErrTarget?: HTMLElement;
  /** Method called to show error and set invalid state on input; point null to show all validation rules with checkpoints */
  protected goShowError(err: string, target: HTMLElement): void {
    if (this._errMsg === err) {
      return;
    }
    // possible when user goes to another page and focusout > validTimeout happened
    if (!this.isConnected) {
      return;
    }
    this._errName = undefined;
    this._errMsg = err;

    if (!this.$refError) {
      this.$refError = this.renderError();
    }

    this._opts.validationShowAll && this.renderValidations(this.$refError);

    /* istanbul ignore else */
    if (err !== null) {
      this.#refErrTarget = target;
      (target as HTMLInputElement).setCustomValidity?.call(target, err);
      this.setAttribute("invalid", "");
      const lbl = this.$refTitle.textContent;
      this.$refError.firstElementChild!.textContent = lbl ? `${this.#ctr.$ariaError} ${lbl}:` : "";
      const el = this.$refError.children.item(1)!;
      el.textContent = err;

      const renderedErr = (this.$refError as StoredRefError)._wupVldItems?.find((li) => li.textContent === err);
      this.setAttr.call(el, "class", renderedErr ? this.#ctr.classNameHidden : null);

      target.setAttribute("aria-describedby", this.$refError.id); // watchfix: nvda doesn't read aria-errormessage: https://github.com/nvaccess/nvda/issues/8318
      if (!this.$isFocused) {
        this.$refError!.setAttribute("role", "alert"); // force to announce error when focus is already missed
        renderedErr?.scrollIntoView();
      }
    }
  }

  /** Method called to hide error and set valid state on input */
  protected goHideError(): void {
    this._errMsg = undefined;
    if (this.$refError) {
      const p = this.$refError;
      p.addEventListener("$hide", p.remove, { passive: true, once: true });
      p.$hide(); // hide with animation
      this.$refError = undefined;

      (this.#refErrTarget as HTMLInputElement).setCustomValidity?.call(this.#refErrTarget, "");
      this.#refErrTarget!.removeAttribute("aria-describedby");
      this.removeAttribute("invalid");
      this.#refErrTarget = undefined;
    }
  }

  /** Called to serialize value from URL; override it if you have unexpected object */
  valueFromUrl(str: string): ValueType | undefined {
    return str === "null" ? (null as ValueType) : this.parse(str);
  }

  /** Called to serialize value to URL & must return '' if need to remove */
  valueToUrl(v: ValueType | null): string {
    if (v == null) {
      return "null";
    }
    return v.toString();
    // todo test bool "1" or delete
  }

  /** Get & parse value from storage according to options `skey`, `storage` and `name` */
  protected storageGet(): ValueType | undefined {
    const key = this._opts.skey === true ? this._opts.name : this._opts.skey;
    if (key) {
      let v: string | null;
      // todo for session & localStorage use JSON.stringify & JSON.parse to be universal for all types of value
      switch (this._opts.storage) {
        case "session":
          v = window.sessionStorage.getItem(key);
          break;
        case "url":
          v = new URLSearchParams(window.location.search).get(decodeURIComponent(key));
          v = v != null ? decodeURIComponent(v) : v;
          break;
        default:
          v = window.localStorage.getItem(key);
          break;
      }
      if (v != null) {
        return this.valueFromUrl(v);
      }
    }
    return this.$initValue;
  }

  /** Save value to storage storage according to options `skey`, `storage` and `name` */
  protected storageSet(v: ValueType | undefined, key: string): void {
    try {
      if (key) {
        let strg: Storage | Pick<Storage, "removeItem" | "setItem">;
        switch (this._opts.storage) {
          case "session":
            strg = window.sessionStorage;
            break;
          case "url":
            {
              const url = new URL(window.location.href);
              strg = {
                removeItem: (k) => {
                  url.searchParams.delete(k);
                  window.history.replaceState(null, "", url); // OR window.history.pushState(null, null, url);
                },
                setItem: (k, val) => {
                  url.searchParams.set(k, val);
                  window.history.replaceState(null, "", url); // OR window.history.pushState(null, null, url);
                },
              };
            }
            break;
          default:
            strg = window.localStorage;
            break;
        }
        // todo test when value: null
        if (this.#ctr.$isEmpty(v)) {
          strg.removeItem(key);
        } else {
          const sv = this.valueToUrl(v!);
          sv === "" ? strg.removeItem(key) : strg.setItem(key, sv);
        }
      }
    } catch (err) {
      this.throwError(err); // re-throw error when storage is full
    }
  }

  /** Fire this method to update value & validate; returns null when not $isReady, true if changed */
  protected setValue(v: ValueType | undefined, reason: SetValueReasons): boolean | null {
    const prev = this.#value;
    this.#value = v;
    if (!this.$isReady) {
      return null;
    }

    this.$isDirty = true;
    const isChanged = !this.#ctr.$isEqual(v, prev);
    if (!isChanged) {
      return false;
    }

    this._isValid = undefined;
    const canVld = reason !== SetValueReasons.manual;
    (canVld || this.$refError) && this.validateAfterChange();
    // save to storage
    const sk = this._opts.skey === true ? this._opts.name : this._opts.skey;
    sk && this.storageSet(v, sk);
    setTimeout(() => this.fireEvent("$change", { cancelable: false, bubbles: true, detail: reason }));
    return true;
  }

  /** Called after value is changed */
  protected validateAfterChange(): void {
    const c = this._opts.validationCase;
    if (c & ValidationCases.onChange || c & ValidationCases.onChangeSmart) {
      this.goValidate(ValidateFromCases.onChange);
    }
  }

  #prevValue = this.#value;
  /* Called when user pressed Esc-key or button-clear */
  protected clearValue(): void {
    const was = this.#value;

    let v: ValueType | undefined;
    /* istanbul ignore else */
    if (this._opts.clearActions & ClearActions.resetToInit) {
      if (this.$isChanged) {
        v = this.$initValue;
      } else if (!(this._opts.clearActions & ClearActions.clear && !this.$isEmpty)) {
        v = this.#prevValue;
      }
    } else if (this._opts.clearActions & ClearActions.clear) {
      v = this.$isEmpty ? this.#prevValue : undefined;
    }

    this.setValue(v, SetValueReasons.clear);
    this.#prevValue = was;

    this.$isEmpty ? this.$ariaSpeak(this.#ctr.$ariaCleared) : this.$refInput.select();
  }

  /** Called when element got focus; must return array of RemoveFunctions called on FocusLost */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected gotFocus(ev: FocusEvent): Array<() => void> {
    this.$refError?.$refresh();

    const c = this._opts.validationCase;
    if (c & ValidationCases.onFocusWithValue && !this.$isEmpty) {
      this.goValidate(ValidateFromCases.onFocus);
    } else if (this._wasValidNotEmpty == null && c & ValidationCases.onChangeSmart) {
      this.goValidate(ValidateFromCases.onChange, true); // validate to define current state
    }

    const r = this.appendEvent(this, "keydown", (e) => !this.$isDisabled && !this.$isReadOnly && this.gotKeyDown(e), {
      passive: false,
    });
    return [r];
  }

  /** Called when element completely lost focus; despite on blur it has debounce filter */
  protected gotFocusLost(): void {
    if (this._opts.validationCase & ValidationCases.onFocusLost) {
      // const wasErr = !!this._errMsg;
      this.goValidate(ValidateFromCases.onFocusLost);
      // todo test & rollback it when error will be visible over popup: for selectControl the color is changed but error not visible and menu stays opened
      // this._errMsg && !wasErr && this.focus(); // user sees validation error at first time: return focus back once
    }
  }

  /** Called when user pressed key */
  protected gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    e.key === "Escape" && !e.shiftKey && !e.altKey && !e.ctrlKey && this.clearValue(); // WARN: Escape works wrong with NVDA because it enables NVDA-focus-mode
  }
}
