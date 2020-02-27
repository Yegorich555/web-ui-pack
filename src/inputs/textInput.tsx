/* eslint-disable max-classes-per-file */
import Core from "../core";
import BasicInput, { BasicInputValidations } from "./basicInput";
import { MessageRequired } from "./validation";

export class TextInputValidations extends BasicInputValidations<string> {
  required = {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    test: TextInput.isEmpty,
    msg: MessageRequired
  };
}

export default class TextInput extends BasicInput<string> {
  /** @inheritdoc */
  static isEmpty(v: string): boolean {
    return v == null || v === "";
  }

  static defaultInitValue = "";
  static defaultValidations = new TextInputValidations();

  renderInput(id: string | number, value: string): Core.Element {
    return <input id={id as string} value={value} />;
  }
}

TextInput.defaultValidations.required.msg = "This message is overrided";
TextInput.defaultValidations.required.test = v => v == null;
TextInput.defaultValidations.required.test("str");
