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

export type TextInputValidationProps = BaseInputValidationProps;
export type TextInputProps = BaseInputProps<string>;
export type TextInputState = BaseInputState<string>;

export default class TextInput extends BaseInput<string, TextInputProps, TextInputState> {
  /** @inheritdoc */
  static isEmpty(v: string): boolean {
    return v == null || v === "";
  }

  /** @inheritdoc */
  static defaultInitValue = "";

  /** @inheritdoc */
  static defaultValidations = new TextInputValidations();

  /** @inheritdoc */
  renderInput(id: string | number, value: string): Core.Element {
    return <input id={id as string} value={value} />;
  }
}

TextInput.defaultValidations.required.msg = "This message is overrided";
TextInput.defaultValidations.required.test = v => v == null;
TextInput.defaultValidations.required.test("str");
