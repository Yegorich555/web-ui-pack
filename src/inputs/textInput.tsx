/* eslint-disable max-classes-per-file */
import Core from "../core";
import BaseInput, { BaseInputValidations, BaseInputProps, BaseInputState, BaseInputValidationProps } from "./baseInput";
import { ValidationMessages } from "./validation";

export class TextInputValidations extends BaseInputValidations<string> {
  required = {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    test: TextInput.isEmpty,
    msg: ValidationMessages.required
  };
  min = {
    test: (v: string, setV: number) => v.length >= setV,
    msg: ValidationMessages.minText
  };
  max = {
    test: (v: string, setV: number) => v.length <= setV,
    msg: ValidationMessages.maxText
  };
}

export interface TextInputValidationProps extends BaseInputValidationProps {
  min?: number;
  max?: number;
}

export interface TextInputProps extends BaseInputProps<string> {
  validations?: TextInputValidationProps;
  htmlInputProps?: Pick<
    Core.HTMLAttributes<HTMLInputElement>,
    Exclude<
      keyof Core.HTMLAttributes<HTMLInputElement>,
      "id" | "onChange" | "onBlur" | "aria-invalid" | "aria-required" | "value"
    >
  >;
}

export type TextInputState = BaseInputState<string>;

export default class TextInput extends BaseInput<string, TextInputProps, TextInputState> {
  /** @inheritdoc */
  static isEmpty<ValueType>(v: ValueType): boolean {
    return v == null || ((v as unknown) as string) === "";
  }

  /** @inheritdoc */
  static defaultInitValue = "";

  /** @inheritdoc */
  static defaultValidations = new TextInputValidations();

  handleChange = (e: Core.DomChangeEvent) => {
    this.gotChange(e.target.value, e);
  };

  handleBlur = (e: Core.DomFocusEvent) => {
    this.gotBlur(e.target.value, e);
  };

  /** Override this method for customizing input-rendering */
  renderInput(defProps: Core.HTMLAttributes<HTMLInputElement>, value: string): Core.Element {
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <input {...defProps} value={value} />;
  }

  /** @inheritdoc */
  getRenderedInput(id: string | number, value: string): Core.Element {
    const defProps = {
      ...this.props.htmlInputProps,
      id,
      onChange: this.handleChange,
      onBlur: this.handleBlur,
      "aria-invalid": !!this.state.error,
      "aria-required": this.isRequired
    } as Core.HTMLAttributes<HTMLInputElement>;
    return this.renderInput(defProps, value);
  }
}

TextInput.defaultValidations.required.msg = "This message is overrided";
TextInput.defaultValidations.required.test = v => v == null;
TextInput.defaultValidations.required.test("str");
