import WUPBaseElement, { WUP } from "./baseElement";
import IBaseControl from "./controls/baseControl.i";
import { nestedProperty, promiseWait, scrollIntoView } from "./indexHelpers";
import WUPSpinElement from "./spinElement";

/* c8 ignore next */
/* istanbul ignore next */
!WUPSpinElement && console.error("!"); // It's required otherwise import is ignored by webpack

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
  /** Lock the whole form during the pending state (set $isPending = true or provide `promise` to submitEvent.waitFor);
   * Otherwise user can submit several times in a short time;
   * If promise resolves during the short-time pending state won't be set, otherwise it takes at least 300ms via helper {@link promiseWait} */
  lockOnPending = 1 << 4,
}

declare global {
  namespace WUPForm {
    export interface SubmitEvent<T extends Record<string, any>> extends Event {
      /** Model collected from controls */
      $model: Partial<T>;
      /** Form related to submit event */
      $relatedForm: WUPFormElement<T>;
      /** Event that produced submit event */
      $relatedEvent: MouseEvent | KeyboardEvent;
      /** Element that that produced submit event */
      $submitter: HTMLElement | null;
      /** Point a promise as callback to allow form show pending state during the promise */
      $waitFor?: Promise<unknown>;
    }

    export interface EventMap extends WUPBase.EventMap {
      /** Fires before $submit is happened; can be prevented via e.preventDefault() */
      $willSubmit: Omit<SubmitEvent<any>, "$model">;
      /** Fires by user-submit when validation succesfull and model is collected */
      $submit: SubmitEvent<any>;
    }

    export interface Defaults {
      /** Actions that enabled on submit event; You can point several like: `goToError | collectChanged`
       * @defaultValue goToError | validateUntiFirst | reset | lockOnPending */
      submitActions: SubmitActions;
    }

    export interface Options extends Defaults {
      /** Focus first possible element when it's appended to layout */
      autoFocus?: boolean;
      /** Disallow edit/copy value; adds attr [disabled] for styling */
      disabled?: boolean;
      /** Disallow copy value; adds attr [readonly] for styling */
      readOnly?: boolean;
      /** Enable/disable browser-autocomplete; if control has no autocomplete option then it's inherrited from form
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

const formStore: WUPFormElement[] = [];

/** Default Form-HTMLElement that collect values from controls
 * @example
 *  // init form
 *  const form = document.createElement("wup-form");
 *  form.$options.autoComplete = false;
 *  form.$initModel = { email: "test-me@google.com" };
 *  form.addEventListener("$submit", (e) => console.warn(e.$model) );
 *  form.$onSubmit = async (e)=>{ await postHere(e.$model); } // equal to form.addEventListener
 *  // init control
 *  const el = document.createElement("wup-text");
 *  el.$options.name = "email";
 *  el.$options.validations = { required: true, email: true };
 *  form.appendChild(el);
 *  const btn = form.appendChild(document.createElement("button"));
 *  btn.textContent = "Submit";
 *  btn.type = "submit";
 *  document.body.appendChild(form);
 *  // or HTML
 *  <wup-form autoComplete autoFocus>
 *    <wup-text name="email" />
 *    <button type="submit">Submit</submit>
 *  </wup-form>;
 * @tutorial Troubleshooting/rules:
 * * options like $initModel, $model overrides control.$initValue, control.$value (every control that matches by $options.name)
 * * In React ref-parent called after ref-children. So if you want to set control.$initValue over form.$initModel use empty setTimeout on ref-control
 * @example
 * <wup-form
      ref={(el) => {
        if (el) {
          el.$initModel = { email: "test-me@google.com" };
          el.$onSubmit = async (ev)=>{
             await postHere();
          }
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
        <button type="submit">Submit</button>
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
  static get observedOptions(): Array<keyof WUPForm.Options> {
    return ["disabled", "readOnly", "autoComplete"];
  }

  /* Array of attribute names to listen for changes */
  static get observedAttributes(): Array<LowerKeys<WUPForm.Options>> {
    return ["disabled", "readonly", "autocomplete"];
  }

  static get $styleRoot(): string {
    return `:root {
      --btn-submit-bg: var(--base-btn-bg);
      --btn-submit-text: var(--base-btn-text);
      --btn-submit-focus: var(--base-btn-focus);
    }`;
  }

  static get $style(): string {
    return `${super.$style}
        :host { position: relative; }
        :host [type='submit'] {
          box-shadow: none;
          border: 1px solid var(--btn-submit-bg);
          border-radius: var(--border-radius);
          box-sizing: border-box;
          padding: 0.5em;
          margin: 1em 0;
          min-width: 10em;
          cursor: pointer;
          font: inherit;
          font-weight: bold;
          background: var(--btn-submit-bg);
          color: var(--btn-submit-text);
        }
        :host [type='submit']:focus {
          outline: 2px solid var(--btn-submit-focus);
        }
        @media (hover: hover) {
          :host [type='submit']:hover {
             box-shadow: inset 0 0 0 99999px rgba(0,0,0,0.2);
          }
        }
        :host [type='submit'][disabled] {
          opacity: 0.3;
          cursor: not-allowed;
          -webkit-user-select: none;
          user-select: none;
        }
        :host [type='submit'][aria-busy] {
          cursor: wait;
        }`;
  }

  /** Find form related to control,register and apply initModel if initValue undefined */
  static $tryConnect(control: IBaseControl & HTMLElement): WUPFormElement | undefined {
    const form = formStore.find((f) => f.contains(control));
    form?.$controls.push(control);
    return form;
  }

  /** Map model to control-values */
  static $modelToControls<T extends Record<string, any>>(
    m: T,
    controls: IBaseControl[],
    prop: keyof Pick<IBaseControl, "$value" | "$initValue">
  ): void {
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
    prevModel: Partial<T>,
    controls: IBaseControl[],
    prop: keyof Pick<IBaseControl, "$value" | "$initValue">,
    isOnlyChanged?: boolean
  ): Partial<T> {
    if (isOnlyChanged) {
      controls.forEach(
        (c) => c.$options.name && c.$isChanged && nestedProperty.set(prevModel, c.$options.name, c[prop])
      );
    } else {
      controls.forEach((c) => c.$options.name && nestedProperty.set(prevModel, c.$options.name, c[prop]));
    }
    return prevModel;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPForm.Defaults = {
    submitActions:
      SubmitActions.goToError | SubmitActions.validateUntiFirst | SubmitActions.reset | SubmitActions.lockOnPending,
  };

  $options: WUPForm.Options = {
    ...this.#ctr.$defaults,
  };

  protected override _opts = this.$options;

  /** All controls related to form */
  $controls: IBaseControl<any>[] = [];

  /** Returns related to form controls with $options.name != null */
  get $controlsAttached(): IBaseControl<any>[] {
    return this.$controls.filter((c) => c.$options.name != null);
  }

  _model?: Partial<Model>;
  /** Model related to every control inside (with $options.name); @see BaseControl...$value */
  get $model(): Partial<Model> {
    return Object.assign(this._model || {}, this.#ctr.$modelFromControls({}, this.$controls, "$value"));
  }

  set $model(m: Partial<Model>) {
    /* istanbul ignore else */
    if (m !== this._model) {
      this._model = m;
      this.#ctr.$modelToControls(m, this.$controls, "$value");
    }
  }

  _initModel?: Partial<Model>;
  /** Default/init model related to every control inside; @see BaseControl...$initValue */
  get $initModel(): Partial<Model> {
    // it's required to avoid case when model has more props than controls
    return this.#ctr.$modelFromControls(this._initModel || {}, this.$controls, "$initValue");
  }

  set $initModel(m: Partial<Model>) {
    /* istanbul ignore else */
    if (m !== this._initModel) {
      this._initModel = m;
      this.#ctr.$modelToControls(m, this.$controls, "$initValue");
    }
  }

  /** Pending state (spinner + lock form if SubmitActions.lockOnPending enabled) */
  get $isPending(): boolean {
    return this.#stopPending !== undefined;
  }

  set $isPending(v: boolean) {
    /* istanbul ignore else */
    if (v !== this.$isPending) {
      this.changePending(v);
    }
  }

  /** Returns true if all nested controls are valid */
  get $isValid(): boolean {
    return this.$controlsAttached.every((c) => c.$isValid);
  }

  /** Returns true if some of controls value is changed by user */
  get $isChanged(): boolean {
    return this.$controls.some((c) => c.$options.name && c.$isChanged);
  }

  /** Dispatched on submit. Return promise to lock form and show spinner */
  $onSubmit?: (ev: WUPForm.SubmitEvent<Model>) => void | Promise<unknown>;

  /** Called on every spin-render */
  renderSpin(target: HTMLElement): WUPSpinElement {
    const spin = document.createElement("wup-spin");
    spin.$options.fit = true;
    spin.$options.overflowFade = false;
    spin.$options.overflowTarget = target as HTMLButtonElement;
    return spin;
  }

  #stopPending?: () => void;
  /** Change pending state */
  protected changePending(v: boolean): void {
    if (v === !!this.#stopPending) {
      return;
    }

    if (v) {
      const wasDisabled = this._opts.disabled;
      if (this._opts.submitActions & SubmitActions.lockOnPending) {
        this.$options.disabled = true;
      }
      const btns: Array<HTMLButtonElement & { _wupDisabled: boolean }> = [];
      const spins: Array<WUPSpinElement> = [];
      this.querySelectorAll("[type='submit']").forEach((b) => {
        spins.push(this.appendChild(this.renderSpin(b as HTMLButtonElement)));
        (b as HTMLButtonElement & { _wupDisabled: boolean })._wupDisabled = (b as HTMLButtonElement).disabled;
        (b as HTMLButtonElement).disabled = true;
        btns.push(b as HTMLButtonElement & { _wupDisabled: boolean });
      });

      this.#stopPending = () => {
        this.#stopPending = undefined;
        this.$options.disabled = wasDisabled;
        btns.forEach((b) => (b.disabled = b._wupDisabled));
        spins.forEach((s) => s.remove());
      };
    } else {
      this.#stopPending!();
    }
  }

  /** Called on submit before validation */
  protected gotSubmit(e: KeyboardEvent | MouseEvent, submitter: HTMLElement): void {
    e.preventDefault();

    const willEv = new Event("$willSubmit", { bubbles: true, cancelable: true }) as Events["$willSubmit"];
    // willEv.$model = null;
    willEv.$relatedEvent = e;
    willEv.$relatedForm = this as WUPFormElement<any>;
    willEv.$submitter = submitter;

    this.dispatchEvent(willEv);
    if (willEv.defaultPrevented) {
      return;
    }

    // validate
    let errCtrl: IBaseControl | undefined;
    const arrCtrl = this.$controlsAttached;
    if (this._opts.submitActions & SubmitActions.validateUntiFirst) {
      errCtrl = arrCtrl.find((c) => c.$validate());
    } else {
      arrCtrl.forEach((c) => {
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
    const m = this.#ctr.$modelFromControls({}, this.$controls, "$value", !!onlyChanged);
    // fire events
    const ev = new Event("$submit", { cancelable: false, bubbles: true }) as WUPForm.SubmitEvent<Model>;
    ev.$model = m;
    ev.$relatedForm = this;
    ev.$relatedEvent = e;
    ev.$submitter = submitter;

    const needReset = this._opts.submitActions & SubmitActions.reset;
    setTimeout(() => {
      this.dispatchEvent(ev);
      const p1 = this.$onSubmit?.call(this, ev);
      // SubmitEvent constructor doesn't exist on some browsers: https://developer.mozilla.org/en-US/docs/Web/API/SubmitEvent/SubmitEvent
      const ev2 = new (window.SubmitEvent || Event)("submit", { submitter, cancelable: false, bubbles: true });
      /* istanbul ignore else */
      if (!window.SubmitEvent) {
        (ev2 as any).submitter = submitter;
      }
      this.dispatchEvent(ev2);

      promiseWait(Promise.all([p1, ev.$waitFor]), 300, (v: boolean) => this.changePending(v)).then(() => {
        if (needReset) {
          arrCtrl.forEach((v) => (v.$isDirty = false));
          this.$initModel = this.$model;
        }
      });
    });
  }

  #hasControlChanges?: boolean;
  protected override gotChanges(propsChanged: Array<keyof WUPForm.Options | LowerKeys<WUPForm.Options>> | null): void {
    super.gotChanges(propsChanged);

    this._opts.disabled = this.getBoolAttr("disabled", this._opts.disabled);
    this._opts.readOnly = this.getBoolAttr("readonly", this._opts.readOnly);
    this._opts.autoComplete = this.getBoolAttr("autoComplete", this._opts.autoComplete);
    this._opts.autoFocus = this.getBoolAttr("autoFocus", this._opts.autoFocus);

    this.setAttr("readonly", this._opts.readOnly, true);
    this.setAttr("disabled", this._opts.disabled, true);

    const p = propsChanged;
    if (this.#hasControlChanges || p?.includes("disabled")) {
      this.$controls.forEach((c) => c.gotFormChanges(propsChanged));
      this.#hasControlChanges = undefined;
    }
  }

  protected override gotOptionsChanged(e: WUP.OptionEvent<Record<string, any>>): void {
    const p = e.props as Array<keyof WUPForm.Options>;
    if (p.includes("autoComplete") || p.includes("readOnly")) {
      this.#hasControlChanges = true;
    }

    super.gotOptionsChanged(e);
  }

  protected override gotAttributeChanged(name: string, oldValue: string, newValue: string): void {
    if (name === "autocomplete" || name === "readonly") {
      this.#hasControlChanges = true;
    }

    super.gotAttributeChanged(name, oldValue, newValue);
  }

  protected override gotReady(): void {
    super.gotReady();

    this.appendEvent(
      this,
      "keydown",
      (e) =>
        e.key === "Enter" &&
        !e.defaultPrevented &&
        this.gotSubmit(e, e.target instanceof HTMLElement ? e.target : this),
      { passive: false }
    );
    this.appendEvent(
      this,
      "click",
      (e) => {
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
      },
      { passive: false }
    );
  }

  protected override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("role", "form");
    formStore.push(this);
  }

  protected override disconnectedCallback(): void {
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

// todo show success result in modal window
