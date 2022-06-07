/* eslint-disable no-use-before-define */
import WUPBaseElement, { WUP } from "./baseElement";
import IBaseControl from "./controls/baseControl.i";
import { nestedProperty, scrollIntoView } from "./indexHelpers";

export const enum SubmitActions {
  /** Disable any action */
  none = 0,
  /** Scroll to first error (if exists) and focus control */
  goToError = 1,
  /** Validate until first error is found (otherwise validate all) */
  validateUntiFirst = 1 << 1,
  /** Collect to model only changed values */
  collectChanged = 1 << 2,
  /** Reset isDirty and assign $value to $initValue for controls (on success only) */
  reset = 1 << 3,
}

declare global {
  namespace WUPForm {
    export interface SubmitEvent<T> extends Event {
      $model: Partial<T>;
      $relatedForm: WUPFormElement<T>;
      $relatedEvent: MouseEvent | KeyboardEvent;
      $submitter: HTMLElement | null;
    }

    export interface EventMap extends WUP.EventMap {
      /** Fires after value change on controls */
      $change: Event; // todo implement
      /** Fires before $submit is happened; can be prevented via e.preventDefault() */
      $willSubmit: (MouseEvent | KeyboardEvent) & { submitter: HTMLElement };
      /** Fires by user-submit when validation succesfull and model is collected */
      $submit: SubmitEvent<any>;
    }

    export interface Defaults {
      /** Actions that enabled on submit event; You can point several like: `goToError | collectChanged`
       * @defaultValue goToError | validateUntiFirst | reset */
      submitActions: SubmitActions;
    }

    export interface Options extends Defaults {
      /** Focus first possible element when it's appended to layout */
      autoFocus?: boolean;
      /** Disallow edit/copy value; adds attr [disabled] for styling */
      disabled?: boolean;
      /** Disallow copy value; adds attr [readonly] for styling (changes/replace option readOnly of controls) */
      readOnly?: boolean;
      /** Enable/disable browser-autocomplete (changes/replace option autoComplete of controls)
       *  @defaultValue false */
      autoComplete?: boolean;
    }

    export interface JSXProps<T extends WUPBaseElement> extends WUP.JSXProps<T> {
      /** @deprecated Disallow edit/copy value. Use [disabled] for styling */
      disabled?: boolean;
      /** @deprecated Disallow edit value */
      readOnly?: boolean;
      /** @deprecated Focus on init */
      autoFocus?: boolean;
      /** @deprecated Enable/disable browser-autocomplete */
      autoComplete?: boolean;

      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$willSubmit') instead */
      onWillSubmit?: never;
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$submit') instead */
      onSubmit?: never;
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$change') instead */
      onChange?: never;
    }
  }
}

// eslint-disable-next-line no-use-before-define
const formStore: WUPFormElement[] = [];

/** Default Form-HTMLElement that collect values from controls
 * @example
 *  // init form
 *  const form = document.createElement("wup-form");
 *  form.$options.autoComplete = false;
 *  form.$initModel = { email: "test-me@google.com" };
 *  form.addEventListener("$submit", (e) => console.warn(e.$model));
 *  // init control
 *  const el = document.createElement("wup-text");
 *  el.$options.name = "email";
 *  el.$options.validations = { required: true, email: true };
 *  form.appendChild(el);
 *  const btn = form.appendChild(document.createElement("button"));
 *  btn.textContent = "Submit";
 *  btn.type = "Submit";
 *  document.body.appendChild(form);
 *  // or HTML
 *  <wup-form autoComplete autoFocus>
 *    <wup-text name="email" />
 *    <button type="submit">Submit</submit>
 *  </wup-form>;
 * @tutorial Troubleshooting/rules:
 * * options like $initModel, $model overrides $initValue, $value in each control that matches by $options.name
 * * In react ref-parent fired after ref-children. So if you want to override $initValue use empty setTimeout on ref-control
 * @example
 * <wup-form
      ref={(el) => {
        if (el) {
          el.$initModel = { email: "test-me@google.com" };
        }
      }}
    >
      <wup-text
        ref={(el) => {
          if (el) {
            setTimeout(() => {
              el.$options.name = "email";
              el.$initValue = "";
            });
          }
        }}
        <button type="Submit">Submit</button>
      />
  </wup-form>
 */
export default class WUPFormElement<
  Model extends Record<string, any> = any,
  Events extends WUPForm.EventMap = WUPForm.EventMap
> extends WUPBaseElement<Events> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPFormElement;

  /** Options that need to watch for changes; use gotOptionsChanged() */
  static observedOptions = new Set<keyof WUPForm.Options>(["disabled", "readOnly", "autoComplete"]);

  /* Array of attribute names to listen for changes */
  static get observedAttributes(): Array<keyof WUPForm.Options> {
    return ["disabled", "readOnly", "autoComplete"];
  }

  /** Find form related to control,register and apply initModel if initValue undefined */
  static $tryConnect(control: IBaseControl & HTMLElement): WUPFormElement | undefined {
    const form = formStore.find((f) => f.contains(control));

    if (form) {
      form.$controls.push(control);

      const k = control.$options.name;
      if (k && form._initModel && control.$initValue === undefined) {
        control.$initValue = nestedProperty.get(form._initModel, k);
      }
      if (form._opts.readOnly !== undefined && control.$options.readOnly === undefined) {
        control.$options.readOnly = form._opts.readOnly;
      }
    }

    return form;
  }

  /** Map model to control-values */
  static $modelToControls<T>(m: T, controls: IBaseControl[], prop: keyof Pick<IBaseControl, "$value" | "$initValue">) {
    const out = { hasProp: undefined };
    controls.forEach((c) => {
      const key = c.$options.name;
      if (key) {
        const v = nestedProperty.get(m, key, out);
        if (out.hasProp) {
          c[prop] = v;
        }
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
  static $defaults: WUPForm.Defaults = {
    submitActions: SubmitActions.goToError | SubmitActions.validateUntiFirst | SubmitActions.reset,
  };

  $options: WUPForm.Options = {
    ...this.#ctr.$defaults,
  };

  protected override _opts = this.$options;

  /** All controls assigned to form */
  $controls: IBaseControl<any>[] = [];

  _model?: Partial<Model>;
  /** Model related to every control inside (with $options.name); @see BaseControl...$value */
  get $model(): Partial<Model> {
    return Object.assign(this._model || {}, this.#ctr.$modelFromControls(this.$controls, "$value"));
  }

  set $model(m: Partial<Model>) {
    if (m !== this._model) {
      this._model = m;
      this.#ctr.$modelToControls(m, this.$controls, "$value");
    }
  }

  _initModel?: Partial<Model>;
  /** Default/init model related to every control inside; @see BaseControl...$initValue */
  get $initModel(): Partial<Model> {
    // it's required to avoid case when model has more props than controls
    return Object.assign(this._initModel || {}, this.#ctr.$modelFromControls(this.$controls, "$initValue"));
  }

  set $initModel(m: Partial<Model>) {
    if (m !== this._initModel) {
      this._initModel = m;
      this.#ctr.$modelToControls(m, this.$controls, "$initValue");
    }
  }

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
    if (this._opts.submitActions & SubmitActions.validateUntiFirst) {
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
      if (this._opts.submitActions & SubmitActions.goToError) {
        const el = errCtrl;
        scrollIntoView(el, { offsetTop: -30, onlyIfNeeded: true }).then(() => el.focus());
      }
      return;
    }

    // collect values to model
    const onlyChanged = this._opts.submitActions & SubmitActions.collectChanged;
    const m = this.#ctr.$modelFromControls(this.$controls, "$value", !!onlyChanged);
    // fire events
    const ev = new Event("$submit", { cancelable: false, bubbles: true }) as WUPForm.SubmitEvent<Model>;
    ev.$model = m;
    ev.$relatedForm = this;
    ev.$relatedEvent = e;
    ev.$submitter = submitter;

    console.warn("got model", m, this.$controls);
    const needReset = this._opts.submitActions & SubmitActions.reset;
    setTimeout(() => {
      // todo how to wait for response and show pending ?
      this.dispatchEvent("$submit", ev);
      this.dispatchEvent("submit", new SubmitEvent("submit", { submitter, cancelable: false, bubbles: true }));

      if (needReset) {
        this.$controls.forEach((v) => (v.$isDirty = false));
        this.$initModel = this.$model;
      }
    });
  }

  protected override gotChanges(propsChanged: Array<keyof WUPForm.Options> | null) {
    super.gotChanges(propsChanged);

    this._opts.disabled = this.getBoolAttr("disabled", this._opts.disabled);
    this._opts.readOnly = this.getBoolAttr("readOnly", this._opts.readOnly);
    this._opts.autoFocus = this.getBoolAttr("autoFocus", this._opts.autoFocus);
    this._opts.autoComplete = this.getBoolAttr("autoComplete", this._opts.autoComplete);

    const { readOnly, autoComplete } = this._opts;
    if (propsChanged ? propsChanged.includes("readOnly") : readOnly !== undefined) {
      this.$controls.forEach((c) => (c.$options.readOnly = readOnly)); // on init OR if changed
    }
    if (propsChanged ? propsChanged.includes("autoComplete") : autoComplete !== undefined) {
      this.$controls.forEach((c) => (c.$options.autoComplete = autoComplete)); // on init OR if changed
    }

    this.setBoolAttr("disabled", this._opts.disabled);
    this.setBoolAttr("readOnly", this._opts.readOnly);
  }

  protected override gotReady() {
    super.gotReady();

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

  protected override connectedCallback() {
    super.connectedCallback();
    this.setAttribute("role", "form");
    formStore.push(this);
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
      [tagName]: WUPForm.JSXProps<WUPFormElement>;
    }
  }
}

// testcase: check if set model={v: 1} shouldn't reset control with other names
// todo setup style for btn-submit
