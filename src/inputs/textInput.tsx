/* eslint-disable max-classes-per-file */
import Core from "../core";
import BaseInput, {
  BaseInputValidations,
  BaseInputProps,
  BaseInputState,
  BaseInputValidationProps,
  RenderInputProps
} from "./baseInput";
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
  validations: TextInputValidationProps;
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

  // todo check is blur when click on label
  handleBlur = (e: Core.DomFocusEvent) => {
    console.warn("blur");
    this.gotBlur(e.target.value, e);
  };

  /** @inheritdoc */
  renderInput(props: RenderInputProps, value: string): Core.Element {
    return (
      <input
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
        maxLength={this.props.validations?.max}
        value={value}
        onChange={this.handleChange}
        onBlur={this.handleBlur}
      />
    );
  }
}

TextInput.defaultValidations.required.msg = "This message is overrided";
TextInput.defaultValidations.required.test = v => v == null;
TextInput.defaultValidations.required.test("str");
