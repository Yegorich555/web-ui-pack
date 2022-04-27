/* eslint-disable no-unused-expressions */
import WUPBaseElement, { JSXCustomProps, WUP } from "./baseElement";
import isEqual from "./helpers/isEqual";

export interface TextControlOptions<T = string> {
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
  /** Default/init value */
  initValue?: T;
}

interface WUPBaseControl<T> {
  $value: T | undefined;
  readonly $isChanged: boolean;
  readonly $isValid: boolean;
  // readOnly $validate(): boolean;
}

/**
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <input />
 *      <strong>{$options.label}</strong>
 *   </span>
 * </label>
 */
export default class WUPTextControl<T = string> extends WUPBaseElement implements WUPBaseControl<T> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  // @ts-ignore
  protected get ctr(): typeof WUPTextControl {
    return this.constructor as typeof WUPTextControl;
  }

  static observedOptions = new Set<keyof TextControlOptions>(["label", "name", "autoFillName", "disabled", "readOnly"]);

  /* Array of attribute names to monitor for changes */
  static get observedAttributes() {
    return ["label", "name", "autoFillName", "disabled", "readOnly"];
  }

  static get style(): string {
    return `
      :host {

      }
     `;
  }

  static isEqual(v1: unknown, v2: unknown): boolean {
    return isEqual(v1, v2);
  }

  static $defaults: TextControlOptions<string> = {};
  $options: TextControlOptions<string> = { ...this.ctr.$defaults };
  protected override _opts = this.$options;

  /** References to nested HTMLElements */
  $refs = {
    label: document.createElement("label"),
    input: document.createElement("input"),
    title: document.createElement("strong"),
  };

  get #initValue(): T | undefined {
    return this._opts.initValue as any;
  }

  #value: T | undefined;
  get $value(): T | undefined {
    return this.#value; // todo implement parse from rawValue
  }

  set $value(v: T | undefined) {
    if (!isEqual(this.#value, v)) {
      this.#value = v;
      this.$refs.input.value = v ? (v as any).toString() : "";
    }
  }

  get $isChanged() {
    return this.ctr.isEqual(this.$value, this.#initValue);
  }

  get $isValid() {
    throw new Error("not implemented");
    return true;
  }

  constructor() {
    super();

    const r = this.$refs.input;
    r.placeholder = " ";
  }

  #reinit() {
    console.warn("reinit");

    this._opts.label = this.getAttribute("label") ?? this._opts.label;
    this._opts.name = this.getAttribute("name") ?? this._opts.name;
    this._opts.autoFillName = this.getAttribute("autoFillName") ?? this._opts.autoFillName;
    this._opts.disabled = this.getAttribute("disabled") != null ? true : this._opts.disabled;
    this._opts.readOnly = this.getAttribute("readOnly") != null ? true : this._opts.readOnly;

    this.$refs.title.textContent = this._opts.label || null;
    const r = this.$refs.input;
    r.type = "text"; // todo configurable option

    if (this._opts.autoFillName === "") {
      r.autocomplete = "disabled";
    } else {
      const n = this._opts.autoFillName || (this._opts.name as string);
      if (!n) {
        r.removeAttribute("name");
        r.removeAttribute("autocomplete");
      } else {
        r.name = n;
        r.autocomplete = n;
      }
    }

    r.disabled = this._opts.disabled as boolean;
    r.readOnly = this._opts.readOnly as boolean;
    r.autofocus = this.getAttribute("autoFocus") != null;

    this.#isStopAttrListen = true;
    this._opts.disabled ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
    this._opts.readOnly ? this.setAttribute("readOnly", "") : this.removeAttribute("readOnly");
    this.#isStopAttrListen = false;
  }

  protected override gotReady() {
    super.gotReady();
    this.#reinit();
    // todo set attr invalid
  }

  protected override connectedCallback() {
    super.connectedCallback();

    this.$refs.input.id = this.ctr.uniqueId;
    this.$refs.label.setAttribute("for", this.$refs.input.id);

    const s = this.$refs.label.appendChild(document.createElement("span"));
    s.appendChild(this.$refs.input);
    s.appendChild(this.$refs.title);
    this.appendChild(this.$refs.label);
  }

  protected override gotOptionsChanged(e: WUP.OptionEvent) {
    super.gotOptionsChanged(e);
    this.#reinit();
  }

  #isStopAttrListen = false;
  #attrTimer?: number;
  protected override gotAttributeChanged(name: string, oldValue: string, newValue: string): void {
    if (this.#isStopAttrListen) {
      return;
    }
    super.gotAttributeChanged(name, oldValue, newValue);
    // debounce filter
    this.#attrTimer && clearTimeout(this.#attrTimer);
    this.#attrTimer = window.setTimeout(() => this.#reinit());
  }
}

const tagName = "wup-text-ctrl";
customElements.define(tagName, WUPTextControl);

declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPTextControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: JSXCustomProps<WUPTextControl> &
        Partial<{
          /** @deprecated Title/label for control */
          label: string;
          /** @deprecated Property key of model; For name 'firstName' >> model['firstName'] */
          name: string;
          /** @deprecated Name to autocomplete by browser; by default it's equal to [name]; to disable autocomplete point empty string */
          autoFillName: string;

          /** Disallow edit/copy value */
          disabled: boolean;
          /** Disallow edit value */
          readOnly: boolean;
          /** Focus on init */
          autoFocus: boolean;

          /** @readonly Use [invalid] for styling */
          readonly invalid: boolean;
        }>;
    }
  }
}

// todo style for attr readOnly
