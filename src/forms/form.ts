/* eslint-disable no-use-before-define */
import WUPBaseElement, { JSXCustomProps, WUP } from "../baseElement";
import IBaseControl from "../controls/baseControl.i";
import { nestedProperty, scrollIntoView } from "../indexHelpers";

export namespace WUPFormTypes {
  export const enum SubmitActions {
    /** Disable any action */
    none = 0,
    /** Scroll to first error (if exists) and focus control */
    goToError = 1,
    /** Validate until first error is found (otherwise validate all) */
    validateUntiFirst = 1 << 1,
    /** Collect to model only changed values */
    collectChanged = 1 << 2,
  }

  export type SubmitEvent<T> = Event & {
    model: Partial<T>;
    relatedForm: WUPFormElement<T>;
    relatedEvent: MouseEvent | KeyboardEvent;
    submitter: HTMLElement | null;
  };

  export interface EventMap extends WUP.EventMap {
    /** Fires after value change on controls */
    $change: Event; // todo implement
    /** Fires before $submit is happened; can be prevented via e.preventDefault() */
    $willSubmit: (MouseEvent | KeyboardEvent) & { submitter: HTMLElement };
    /** Fires by user-submit when validation succesfull and model is collected */
    $submit: SubmitEvent<any>;
  }

  export type Defaults = {
    /** Actions that enabled on submit event; You can point several like: `goToError | collectChanged`
     * @defaultValue goToError | validateUntiFirst */
    submitActions: SubmitActions;
  };

  export type Options = Defaults & {
    /** Focus first possible element when it's appended to layout */
    autoFocus?: boolean;
    /** Disallow edit/copy value; adds attr [disabled] for styling */
    disabled?: boolean;
    /** Disallow copy value; adds attr [readonly] for styling */
    readOnly?: boolean;
    /** Enable/disable browser-autocomplete;
     *  @defaultValue false */
    autoComplete?: boolean;
  };

  export type JSXControlProps<T extends WUPBaseElement> = JSXCustomProps<T> & {
    /** @deprecated Disallow edit/copy value. Use [disabled] for styling */
    disabled?: boolean;
    /** @deprecated Disallow edit value */
    readOnly?: boolean;
    /** @deprecated Focus on init */
    autoFocus?: boolean;
    /** @deprecated Focus on init */
    autoComplete?: boolean;

    /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$willSubmit') instead */
    onWillSubmit?: never;
    /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$submit') instead */
    onSubmit?: never;
    /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$change') instead */
    onChange?: never;
  };
}

// eslint-disable-next-line no-use-before-define
const formStore: WUPFormElement[] = [];

export default class WUPFormElement<
  Model extends Record<string, any> = any,
  Events extends WUPFormTypes.EventMap = WUPFormTypes.EventMap
> extends WUPBaseElement<Events> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPFormElement;

  /** Options that need to watch for changes; use gotOptionsChanged() */
  static observedOptions = new Set<keyof WUPFormTypes.Options>(["disabled", "readOnly", "autoComplete"]);

  /* Array of attribute names to listen for changes */
  static get observedAttributes(): Array<keyof WUPFormTypes.Options> {
    return ["disabled", "readOnly", "autoComplete"];
  }

  /** Find form related to control,register and apply initModel if initValue undefined */
  static $tryConnect(control: IBaseControl & HTMLElement): WUPFormElement | undefined {
    const form = formStore.find((f) => f.contains(control));

    if (form) {
      form.$controls.push(control);

      const k = control.$options.name;
      if (k && form._initModel) {
        control.$initValue = nestedProperty.get(form._initModel, k);
      }
      if (form._opts.readOnly !== undefined) {
        control.$options.readOnly = form._opts.readOnly;
      }
    }

    return form;
  }

  /** Map model to control-values */
  static $modelToControls<T>(m: T, controls: IBaseControl[], prop: keyof Pick<IBaseControl, "$value" | "$initValue">) {
    controls.forEach((c) => {
      const key = c.$options.name;
      if (key) {
        // todo we need to ignore case when model = { v1: "t1" }, but reset control with name 'v2'
        c[prop] = nestedProperty.get(m, key);
      }
    });
  }

  /** Collect model from control-values */
  static $modelFromControls<T>(
    controls: IBaseControl[],
    prop: keyof Pick<IBaseControl, "$value" | "$initValue">,
    isOnlyChanged?: boolean
  ): Partial<T> {
    const m: Partial<T> = {};
    if (isOnlyChanged) {
      controls.forEach((c) => c.$options.name && c.$isChanged && nestedProperty.set(m, c.$options.name, c[prop]));
    } else {
      controls.forEach((c) => c.$options.name && nestedProperty.set(m, c.$options.name, c[prop]));
    }
    return m;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPFormTypes.Defaults = {
    submitActions: WUPFormTypes.SubmitActions.goToError | WUPFormTypes.SubmitActions.validateUntiFirst,
  };

  $options: WUPFormTypes.Options = {
    ...this.#ctr.$defaults,
  };

  protected override _opts = this.$options;

  /** All controls assigned to form */
  $controls: IBaseControl<any>[] = [];

  /** Model related to every control inside (with $options.name); @see BaseControl...$value */
  get $model(): Partial<Model> {
    return this.#ctr.$modelFromControls(this.$controls, "$value");
  }

  set $model(m: Partial<Model>) {
    this.#ctr.$modelToControls(m, this.$controls, "$value");
  }

  _initModel?: Partial<Model>;
  /** Default/init model related to every control inside; @see BaseControl...$initValue */
  get $initModel(): Partial<Model> {
    if (!this._initModel) {
      this._initModel = this.#ctr.$modelFromControls(this.$controls, "$initValue");
    }
    return this._initModel;
  }

  set $initModel(m: Partial<Model>) {
    if (m !== this._initModel) {
      this._initModel = m;
      this.#ctr.$modelToControls(m, this.$controls, "$initValue");
    }
  }

  $refForm = document.createElement("form");
  /** Use this to append elements; fired single time when element isConnected/appended to layout but not ready yet */

  /** Fired on submit before validation */
  protected gotSubmit(e: KeyboardEvent | MouseEvent, submitter: HTMLElement) {
    (e as Events["$willSubmit"]).submitter = submitter;
    this.dispatchEvent("$willSubmit", e);
    if (e.defaultPrevented) {
      return;
    }
    e.preventDefault();

    // validate
    let errCtrl: IBaseControl | undefined;
    if (this._opts.submitActions & WUPFormTypes.SubmitActions.validateUntiFirst) {
      errCtrl = this.$controls.find((c) => c.$validate());
    } else {
      this.$controls.forEach((c) => {
        const err = c.$validate();
        if (err && !errCtrl) {
          errCtrl = c;
        }
      });
    }

    // analyze - go to error
    if (errCtrl) {
      if (this._opts.submitActions & WUPFormTypes.SubmitActions.goToError) {
        const el = errCtrl;
        scrollIntoView(el, { offsetTop: -30, onlyIfNeeded: true }).then(() => el.focus());
      }
      return;
    }

    // collect values to model
    const onlyChanged = this._opts.submitActions & WUPFormTypes.SubmitActions.collectChanged;
    const m = this.#ctr.$modelFromControls(this.$controls, "$value", onlyChanged);

    // fire events
    const ev = new Event("$submit", { cancelable: false, bubbles: true }) as WUPFormTypes.SubmitEvent<Model>;
    ev.model = m;
    ev.relatedForm = this;
    ev.relatedEvent = e;
    ev.submitter = submitter;

    console.warn("got model", m, this.$controls);
    setTimeout(() => {
      // todo how to wait for response and show pending ?
      this.dispatchEvent("$submit", ev);
    });
  }

  /** Fired on Init and every time as options/attributes changed */
  protected gotReinit(propsChanged: Array<keyof WUPFormTypes.Options> | null) {
    this._opts.disabled = this.getBoolAttr("disabled", this._opts.disabled);
    this._opts.readOnly = this.getBoolAttr("readOnly", this._opts.readOnly);
    this._opts.autoFocus = this.getBoolAttr("autoFocus", this._opts.autoFocus);
    this._opts.autoComplete = this.getBoolAttr("autoComplete", this._opts.autoComplete);

    const { readOnly } = this._opts;
    if (propsChanged ? propsChanged.includes("readOnly") : readOnly !== undefined) {
      this.$controls.forEach((c) => (c.$options.readOnly = readOnly)); // apply on init or if only changed
    }

    this.#isStopAttrListen = true;
    this.$refForm.setAttribute("autocomplete", this._opts.autoComplete ? "on" : "off");
    this.setBoolAttr("disabled", this._opts.disabled);
    this.setBoolAttr("readOnly", this._opts.readOnly);
    this.#isStopAttrListen = false;
  }

  protected override gotReady() {
    super.gotReady();
    this.gotReinit(null);

    this.appendEvent(
      this,
      "keydown",
      (e) =>
        !e.defaultPrevented && e.key === "Enter" && this.gotSubmit(e, e.target instanceof HTMLElement ? e.target : this)
    );
    this.appendEvent(this, "click", (e) => {
      if (!e.defaultPrevented) {
        let t = e.target as HTMLElement | null;
        while (t instanceof HTMLElement && t !== this) {
          if ((t as HTMLButtonElement).type === "submit") {
            this.gotSubmit(e, t);
            return;
          }
          t = t.parentElement;
        }
      }
    });
  }

  protected override gotOptionsChanged(e: WUP.OptionEvent) {
    super.gotOptionsChanged(e);
    this.gotReinit(e.props as Array<keyof WUPFormTypes.Options>);
  }

  #isStopAttrListen = false;
  #attrTimer?: number;
  #attrChanged?: string[];
  protected override gotAttributeChanged(name: string, oldValue: string, newValue: string): void {
    if (this.#isStopAttrListen) {
      return;
    }
    super.gotAttributeChanged(name, oldValue, newValue);
    // debounce filter
    if (this.#attrTimer) {
      this.#attrChanged!.push(name);
      return;
    }
    this.#attrChanged = [name];
    this.#attrTimer = window.setTimeout(() => {
      this.#attrTimer = undefined;
      this.gotReinit(this.#attrChanged as Array<keyof WUPFormTypes.Options>);
      this.#attrChanged = undefined;
    });
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.setAttribute("role", "form");
    formStore.push(this);
    setTimeout(() => this._opts.autoFocus && this.focus()); // timeout requires to wait for apply options
  }

  protected override disconnectedCallback() {
    super.disconnectedCallback();
    formStore.splice(formStore.indexOf(this), 1);
  }
}

const tagName = "wup-form";
customElements.define(tagName, WUPFormElement);

declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPFormElement;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPFormTypes.JSXControlProps<WUPFormElement>;
    }
  }
}

// testcase: check if set model={v: 1} shouldn't reset control with other names
