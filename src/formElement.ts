import WUPBaseElement, { AttributeMap, AttributeTypes } from "./baseElement";
import IBaseControl from "./controls/baseControl.i";
import { nestedProperty, promiseWait, scrollIntoView } from "./indexHelpers";
import WUPSpinElement from "./spinElement";
import { WUPcssButton } from "./styles";

export const enum SubmitActions {
  /** Disable any action */
  none = 0,
  /** Scroll to first error (if exists) and focus control */
  goToError = 1,
  /** Validate until first error is found (otherwise validate all) */
  validateUntilFirst = 1 << 1,
  /** Collect to model only changed values */
  collectChanged = 1 << 2,
  /** Reset isDirty and assign $value to $initValue for controls (on success only) */
  reset = 1 << 3,
  /** Lock the whole form during the pending state (set $isPending = true or provide `promise` to submitEvent.waitFor);
   * Otherwise user can submit several times in a short time;
   * If promise resolves during the short-time pending state won't be set, otherwise it takes at least 300ms via helper {@link promiseWait} */
  lockOnPending = 1 << 4,
}

const tagName = "wup-form";
declare global {
  namespace WUP.Form {
    interface SubmitDetails {
      /** Model collected from controls */
      model: Record<string | number, any>;
      /** Form related to submit event; equal to event.target */
      relatedForm: WUPFormElement;
      /** Event that produced submit event */
      relatedEvent: MouseEvent | KeyboardEvent;
      /** Element that that produced submit event */
      submitter: HTMLElement | null;
      /** Point a promise as callback to allow form show pending state during the promise */
      waitFor?: Promise<unknown>;
    }

    interface EventMap extends WUP.Base.EventMap {
      /** Fires before $submit is happened; can be prevented via `e.preventDefault()` */
      $willSubmit: CustomEvent<Pick<SubmitDetails, "relatedEvent" | "relatedForm" | "submitter">>;
      /** Fires by user-submit when validation successful and model is collected */
      $submit: CustomEvent<SubmitDetails>;
      /** Fires when submit is end (after http-response) */
      $submitEnd: CustomEvent<{ success: boolean }>;
    }

    interface Options {
      /** Actions that enabled on submit event; You can point several like: `goToError | collectChanged`
       * @defaultValue goToError | validateUntilFirst | reset | lockOnPending */
      submitActions: SubmitActions;
      /** Enable to tore data in localStorage to prevent losing till submitted;
       * @defaultValue false
       * @tutorial Troubleshooting
       * * It doesn't save values that are complex objects. So `wup-select.$options.items = [{text: "N1",value: {id:1,name:'Nik'} }]` is skipped
       * * Point string-value if default storage-key doesn't fit: based on `url+control.names` @see{@link WUPFormElement.storageKey}
       * @defaultValue false */
      autoStore: boolean | string;
      /** Focus first possible element when it's appended to layout
       * @defaultValue false */
      autoFocus: boolean;
      /** Disallow edit/copy value; adds attr [disabled] for styling
       * @defaultValue false */
      disabled: boolean;
      /** Disallow copy value; adds attr [readonly] for styling
       * @defaultValue false */
      readOnly: boolean;
      /** Enable/disable browser-autocomplete; if control has no autocomplete option then it's inherited from form
       *  @defaultValue false */
      autoComplete: boolean;
    }

    interface JSXProps<T extends WUPFormElement>
      extends Omit<WUP.Base.JSXProps<T>, "autoStore">,
        WUP.Base.OnlyNames<Options> {
      "w-submitActions"?: SubmitActions | number;
      "w-autoStore"?: boolean | string;
      "w-autoFocus"?: boolean | "";
      "w-autoComplete"?: boolean | "";

      /** @deprecated use [disabled] instead since related to CSS-styles */
      "w-disabled"?: boolean | "";
      disabled?: boolean | "";
      /** @deprecated use [disabled] instead since related to CSS-styles */
      "w-readonly"?: boolean | "";
      readonly?: boolean | "";

      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$change') instead */
      onChange?: never; // NiceToHave: controls doesn't fire form.$onChange method - need to implement chaining
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$willSubmit') instead */
      onWillSubmit?: never;
      /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$submit') instead */
      onSubmit?: never;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPFormElement; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Wrapper of FormHTMLElement that collect values from controls
       *  @see {@link WUPFormElement} */
      [tagName]: WUP.Form.JSXProps<WUPFormElement>; // add element to tsx/jsx intellisense
    }
  }
}

const formStore: WUPFormElement[] = [];

/** Wrapper of FormHTMLElement that collect values from controls
 * @example
 *  // init form
 *  const form = document.createElement("wup-form");
 *  form.$options.autoComplete = false;
 *  form.$initModel = { email: "test-me@google.com" };
 *  form.addEventListener("$submit", (e) => console.warn(e.detail.model) );
 *  form.$onSubmit = async (e)=>{ await postHere(e.detail.model); } // equal to form.addEventListener
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
 *  <wup-form w-autocomplete w-autofocus>
 *    <wup-text w-name="email" />
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
  TOptions extends WUP.Form.Options = WUP.Form.Options,
  Events extends WUP.Form.EventMap = WUP.Form.EventMap
> extends WUPBaseElement<TOptions, Events> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPFormElement;

  static get $styleRoot(): string {
    return `:root {
      --btn-submit-text: var(--base-btn-text);
      --btn-submit-bg: var(--base-btn-bg);
      --btn-submit-focus: var(--base-btn-focus);
    }
    [wupdark] {
      --btn-submit-text: var(--base-btn-text);
      --btn-submit-bg: var(--base-btn-bg);
      --btn-submit-focus: var(--base-btn-focus);
    }`;
  }

  static get $style(): string {
    return `${super.$style}
        :host {
          position: relative;
          display: block;
          max-width: 500px;
          margin: auto;
        }
        ${WUPcssButton(":host button[type=submit]")}
        :host button[type=submit] {
          --base-btn-text: var(--btn-submit-text);
          --base-btn-bg: var(--btn-submit-bg);
          --base-btn-focus: var(--btn-submit-focus);
          display: block;
        }`;
  }

  static get mappedAttributes(): Record<string, AttributeMap> {
    const m = super.mappedAttributes;
    m.autostore.type = AttributeTypes.string;
    return m;
  }

  /** Find form related to control,register and apply initModel if initValue undefined */
  static $tryConnect(control: IBaseControl & HTMLElement): WUPFormElement | undefined {
    const form = formStore.find((f) => f.contains(control));
    form?.$controls.push(control);
    return form;
  }

  /** Map model to control-values */
  static $modelToControls<T extends Record<string, any>>(
    m: T | undefined,
    controls: IBaseControl[],
    prop: keyof Pick<IBaseControl, "$value" | "$initValue">
  ): void {
    const out = { hasProp: undefined };
    controls.forEach((c) => {
      const key = c.$options.name;
      if (key) {
        const v = m && nestedProperty.get(m, key, out);
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

  static get observedAttributes(): Array<string> {
    const a = super.observedAttributes;
    a.push("disabled", "readonly"); // support for `readonly` & `w-readonly`
    return a;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUP.Form.Options = {
    submitActions:
      SubmitActions.goToError | SubmitActions.validateUntilFirst | SubmitActions.reset | SubmitActions.lockOnPending,
    autoComplete: false,
    autoFocus: false,
    autoStore: false,
    disabled: false,
    readOnly: false,
  };

  /** Fires before $submit is happened; can be prevented via `e.preventDefault()` */
  $onWillSubmit?: (ev: WUP.Form.EventMap["$willSubmit"]) => void;
  /** Dispatched on submit. Return promise to lock form and show spinner on http-request */
  $onSubmit?: (ev: WUP.Form.EventMap["$submit"]) => void | Promise<unknown>;
  /** Fires when submit is end (after http-response) */
  $onSubmitEnd?: (ev: WUP.Form.EventMap["$submitEnd"]) => void;
  /** Dispatched on submit */
  // It's not required but called: $onsubmit?: (ev: WUP.Form.SubmitEvent<Model>) => void;

  /** All controls related to form */
  $controls: IBaseControl<any>[] = [];

  /** Returns related to form controls with $options.name != null */
  get $controlsAttached(): IBaseControl<any>[] {
    return this.$controls.filter((c) => c.$options.name != null);
  }

  _model?: Partial<Model>;
  /** Model related to every control inside (with $options.name);
   *  @see {@link BaseControl.prototype.$value} */
  get $model(): Partial<Model> {
    return Object.assign(this._model || {}, this.#ctr.$modelFromControls({}, this.$controls, "$value"));
  }

  set $model(m: Partial<Model>) {
    if (m !== this._model) {
      this._model = m;
      this.#ctr.$modelToControls(m, this.$controls, "$value");
    }
  }

  _initModel?: Partial<Model>;
  /** Default/init model related to every control inside;
   *  @see {@link BaseControl.prototype.$initValue} */
  get $initModel(): Partial<Model> | undefined {
    // it's required to avoid case when model has more props than controls
    return this.#ctr.$modelFromControls(this._initModel || {}, this.$controls, "$initValue");
  }

  set $initModel(m: Partial<Model> | undefined) {
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
    if (v !== this.$isPending) {
      this.changePending(v);
    }
  }

  /** Returns true if all nested controls (with name) are valid */
  get $isValid(): boolean {
    return this.$controlsAttached.every((c) => c.$isValid);
  }

  /** Returns true if some of controls value is changed by user */
  get $isChanged(): boolean {
    return this.$controls.some((c) => c.$options.name && c.$isChanged);
  }

  /** Called on every spin-render */
  renderSpin(target: HTMLElement): WUPSpinElement {
    WUPSpinElement.$use();
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
    e.preventDefault(); // prevent default keyboard or mouse event because it's handled in custom event

    const willEv = this.fireEvent("$willSubmit", {
      bubbles: true,
      cancelable: true,
      detail: {
        relatedEvent: e,
        relatedForm: this,
        submitter,
      },
    });
    if (willEv.defaultPrevented) {
      return;
    }

    // validate
    let errCtrl: IBaseControl | undefined;
    let arrCtrl = this.$controlsAttached;
    if (this._opts.submitActions & SubmitActions.validateUntilFirst) {
      errCtrl = arrCtrl.find((c) => c.validateBySubmit() && c.canShowError);
    } else {
      arrCtrl.forEach((c) => {
        const err = c.validateBySubmit();
        if (err && !errCtrl && c.canShowError) {
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

    // collect changes only from valid controls: because some controls has canShowError: false
    arrCtrl = arrCtrl.filter((c) => c.canShowError);

    // collect values to model
    const onlyChanged = this._opts.submitActions & SubmitActions.collectChanged;
    const m = this.#ctr.$modelFromControls({}, arrCtrl, "$value", !!onlyChanged);
    // fire events
    const ev: WUP.Form.EventMap["$submit"] = new CustomEvent("$submit", {
      cancelable: false,
      bubbles: true,
      detail: {
        model: m,
        relatedEvent: e,
        relatedForm: this,
        submitter,
      },
    });

    const needReset = this._opts.submitActions & SubmitActions.reset;
    setTimeout(() => {
      const p1 = this.$onSubmit?.call(this, ev);
      this.dispatchEvent(ev);
      // SubmitEvent constructor doesn't exist on some browsers: https://developer.mozilla.org/en-US/docs/Web/API/SubmitEvent/SubmitEvent
      const ev2 = new (window.SubmitEvent || Event)("submit", { submitter, cancelable: false, bubbles: true });
      /* istanbul ignore else */
      if (!window.SubmitEvent) {
        (ev2 as any).submitter = submitter;
      }
      this.dispatchEvent(ev2);

      let success = false;
      promiseWait(Promise.all([p1, ev.detail.waitFor]), 300, (v: boolean) => this.changePending(v))
        .then(() => {
          this._opts.autoStore && this.storageSave(null); // clear storage after submit
          if (needReset) {
            arrCtrl.forEach((v) => (v.$isDirty = false));
            this.$initModel = this.$model;
          }
          success = true;
        })
        .finally(() => {
          this.fireEvent("$submitEnd", { detail: { success }, cancelable: false, bubbles: true });
        });
    });
  }

  /** Auto-safe debounce timeout */
  #autoStoreT?: ReturnType<typeof setTimeout>;
  #autoStoreRemEv?: () => void;
  protected override gotChanges(propsChanged: Array<keyof WUP.Form.Options> | null): void {
    super.gotChanges(propsChanged);

    this.setAttr("readonly", this._opts.readOnly, true);
    this.setAttr("disabled", this._opts.disabled, true);

    if (this._opts.autoStore) {
      this.#autoStoreRemEv = this.appendEvent(this, "$change", () => {
        if (this._preventStorageSave) {
          return;
        }
        this.#autoStoreT && clearTimeout(this.#autoStoreT);
        this.#autoStoreT = setTimeout(() => this._opts.autoStore && this.storageSave(), 700);
      });

      // works only on init
      !propsChanged &&
        setTimeout(() => {
          const m = this.storageGet();
          if (m) {
            this._preventStorageSave = true;
            this.$model = { ...this._initModel, ...m, ...this._model };
            setTimeout(() => delete this._preventStorageSave);
          }
        }, 2); // timeout required to wait for init controls
    } else if (this.#autoStoreRemEv) {
      this.#autoStoreRemEv.call(this);
      this.#autoStoreRemEv = undefined;
    }

    const p = propsChanged;
    if (p && (p.includes("disabled") || p.includes("autoComplete") || p.includes("readOnly"))) {
      this.$controls.forEach((c) => c.gotFormChanges(propsChanged));
    }
  }

  protected override gotReady(): void {
    super.gotReady();

    this.appendEvent(
      this,
      "keydown",
      (e) =>
        e.key === "Enter" &&
        !e.defaultPrevented &&
        !(e as any).submitPrevented && // textarea related
        !e.shiftKey &&
        !e.ctrlKey &&
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
    // todo set aria-labelledby="t1" where t1 id of related header (can be outside/inside form)
    this.setAttribute("role", "form");
    formStore.push(this);
  }

  /** Returns storage key based on url+control-names or `$options.autoStore` if `string` */
  get storageKey(): string {
    const sn = this._opts.autoStore;
    return typeof sn === "string"
      ? sn
      : `${window.location.pathname}?${this.$controls
          .map((c) => c.$options.name)
          .filter((v) => v)
          .sort()
          .join(",")}`;
  }

  /** Get & parse value from storage according to option `autoStore`, $model */
  storageGet(): Partial<Model> | null {
    try {
      const key = this.storageKey;
      const sv = window.localStorage.getItem(key);
      if (sv) {
        const m = JSON.parse(sv) as Partial<Model>;
        let hasVals = false;
        this.$controls.forEach((c) => {
          const n = c.$options.name;
          if (!n) {
            return;
          }
          const v = m[n];
          if (v === undefined) {
            return;
          }
          const parsed = typeof v === "string" ? c.parse(v) : v;
          nestedProperty.set(m, n, parsed);
          if (n.includes(".")) {
            delete m[n];
          }
          hasVals = true;
        });
        if (!hasVals) {
          return null;
        }
        return m;
      }
    } catch (err) {
      this.throwError(err); // re-throw error when storage is full
    }
    return null;
  }

  _preventStorageSave?: boolean;
  /** Save/remove model (only changes) to storage according to option `autoStore`, $model
   * @returns model saved to localStorage or Null if removed */
  storageSave(model: null | Record<string, any> = {}): Partial<Model> | null {
    try {
      const storage = window.localStorage;
      if (model == null) {
        storage.removeItem(this.storageKey);
        return null;
      }

      const m: Partial<Model> = {}; // plain model without nested objects
      let hasChanges = false;
      this.$controls.forEach((c) => {
        // ignore password controls and controls without names
        if (c.$options.name && c.tagName !== "WUP-PWD") {
          const v = c.$value;
          if (c.$isChanged && v !== undefined) {
            if (typeof v === "object" && !v.toJSON && !Array.isArray(v)) {
              return; // skip complex objects that not serializable: otherwise it can throw err on parse
            }
            m[c.$options.name as keyof Model] = v; // get only changed values
            hasChanges = true;
          }
        }
      });
      if (hasChanges) {
        storage.setItem(this.storageKey, JSON.stringify(m));
        return m;
      }
      storage.removeItem(this.storageKey);
    } catch (err) {
      this.throwError(err); // re-throw error when storage is full
    }
    return null;
  }

  protected override disconnectedCallback(): void {
    super.disconnectedCallback();
    formStore.splice(formStore.indexOf(this), 1);
  }
}

customElements.define(tagName, WUPFormElement);

// todo show success/error result in <wup-alert> at the left/right angle + add autoSubmit option
// todo method $submit() to call it manually
