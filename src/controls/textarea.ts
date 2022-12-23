import WUPTextControl, { WUPTextIn } from "./text";
import { WUPcssScrollSmall } from "../styles";

const tagName = "wup-textarea";
export namespace WUPTextareaIn {
  export interface Def {}
  export interface Opt {}
  export type Generics<
    ValueType = string,
    ValidationKeys extends WUPText.ValidationMap = WUPTextarea.ValidationMap,
    Defaults = Def,
    Options = Opt
  > = WUPTextIn.Generics<ValueType, ValidationKeys, Defaults & Def, Options & Opt>;
  // type Validation<T = string> = Generics<T>["Validation"];
  export type GenDef<T = string> = Generics<T>["Defaults"];
  export type GenOpt<T = string> = Generics<T>["Options"];
}

declare global {
  namespace WUPTextarea {
    interface ValidationMap extends WUPText.ValidationMap {}
    interface EventMap extends WUPText.EventMap {}
    interface Defaults<T = string> extends WUPTextareaIn.GenDef<T> {}
    interface Options<T = string> extends WUPTextareaIn.GenOpt<T> {}
    interface JSXProps<T extends WUPTextareaControl> extends WUPText.JSXProps<T> {}
  }

  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPTextareaControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPTextarea.JSXProps<WUPTextareaControl>;
    }
  }
}

/** Form-control with text-input
 * @example
  const el = document.createElement("wup-textarea");
  el.$options.name = "textarea";
  el.$options.validations = {
    required: true,
    max: 250
  };

  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-textarea name="textarea" validations="myValidations"/>
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <textarea />
 *      <strong>{$options.label}</strong>
 *   </span>
 *   <button clear/>
 * </label>
 */
export default class WUPTextareaControl<
  ValueType = string,
  EventMap extends WUPTextarea.EventMap = WUPTextarea.EventMap
> extends WUPTextControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextareaControl;

  // static get observedOptions(): Array<string> {
  //   const arr = super.observedOptions as Array<keyof WUPTextarea.Options>;
  //   arr.push("reverse");
  //   return arr;
  // }

  // static get $styleRoot(): string {
  //   return ``;
  // }

  static get $style(): string {
    return `${super.$style}
        :host textarea {
          min-height: 4em;
          resize: none;
          display: block; ${/* it removes extra space below */ ""}
          white-space: pre-wrap;
          overflow: auto;
          margin: var(--ctrl-padding);
          padding: 0;
          margin-left: 0;
          margin-right: 0;
        }
        ${WUPcssScrollSmall(":host textarea")}`;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPTextarea.Defaults = {
    ...WUPTextControl.$defaults,
  };

  $options: WUPTextarea.Options<ValueType> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  $refInput = document.createElement("textarea") as HTMLInputElement & HTMLTextAreaElement;

  constructor() {
    super();
    this.$refInput.placeholder = " ";
  }

  protected override renderControl(): void {
    super.renderControl();
  }

  protected override gotChanges(propsChanged: Array<keyof WUPTextarea.Options> | null): void {
    super.gotChanges(propsChanged as any);
  }

  protected override gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    super.gotKeyDown(e);
    if (e.key === "Enter") {
      e.submitPrevented = true;
    }
  }
}

customElements.define(tagName, WUPTextareaControl);

// todo mouse-cursor-point doesn't work
