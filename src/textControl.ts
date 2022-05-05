/* eslint-disable no-use-before-define */
import WUPBaseControl, { WUPControlTypes } from "./baseControl";
import { JSXCustomProps } from "./baseElement";

export type TextControlValidationMap = WUPControlTypes.ValidationMap & {
  min: number;
  max: number;
};

export type TextControlAll<
  ValueType = string, //
  ValidationKeys extends TextControlValidationMap = TextControlValidationMap,
  ControlType extends WUPTextControl<ValueType> = WUPTextControl<ValueType>
> = WUPControlTypes.Generics<ValueType, ValidationKeys, ControlType>;

export type TextControlValidation = TextControlAll["Validation"];
export type TextControlOptions = TextControlAll["Options"];

/**
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <input />
 *      <strong>{$options.label}</strong>
 *   </span>
 * </label>
 */
export default class WUPTextControl<
  T = string, //
  Events extends WUPControlTypes.EventMap = WUPControlTypes.EventMap
> extends WUPBaseControl<T, Events> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextControl;

  /** StyleContent related to component */
  static get style(): string {
    return `
      :host {

      }
     `;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  // @ts-expect-error - because validation 'required' is rewritten with incompatible ctrl
  static $defaults: TextControlOptions = {
    ...WUPBaseControl.$defaults,
    validationRules: {
      required: WUPBaseControl.$defaults.validationRules.required as TextControlValidation,
      min: (v, setV) => v.length < setV && `Min length is ${setV} characters`,
      max: (v, setV) => v.length > setV && `Max length is ${setV} characters`,
    },
  };

  // @ts-expect-error
  $options: Omit<TextControlOptions, "validationRules"> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  constructor() {
    super();

    this.$refInput.placeholder = " ";
  }

  protected gotInit() {
    this.$refInput.id = this.#ctr.uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    const s = this.$refLabel.appendChild(document.createElement("span"));
    s.appendChild(this.$refInput);
    s.appendChild(this.$refTitle);
    this.appendChild(this.$refLabel);

    this.appendEvent(this.$refInput, "input", this.onInput as any);
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
          /** @deprecated Title/label for control; */
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

          /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$validate') instead */
          onValidate: never;
          /** @deprecated SyntheticEvent is not supported. Use ref.addEventListener('$change') instead */
          onChange: never;
        }>;
    }
  }
}

const el = document.createElement(tagName);
el.$options.name = "testMe";
el.$options.validations = {
  required: true,
  max: 2,
  min: (v, ctrl) => v.length > 500 && "This is error",
  extra: (v) => "test Me",
};

// el.$validate();
