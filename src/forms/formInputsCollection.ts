import Form from "./form";
import BaseInput, { BaseInputState, BaseInputProps } from "../inputs/baseInput";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hashSet = new Set<Form<any>>();

export default class FormInputsCollection {
  static registerForm<T>(form: Form<T>): void {
    hashSet.add(form);
  }
  static removeForm<T>(form: Form<T>): void {
    hashSet.delete(form);
  }
  /**
   * Only inputs that has props.name can be added
   */
  static tryRegisterInput<T>(input: BaseInput<T, BaseInputProps<T>, BaseInputState<T>>): Form<unknown> | undefined {
    // eslint-disable-next-line no-restricted-syntax
    for (const form of hashSet) {
      if (form.isInputChildren(input)) {
        form.inputs.push(input);
        return form;
      }
    }
    return undefined;
  }
  static tryRemoveInput<T>(input: BaseInput<T, BaseInputProps<T>, BaseInputState<T>>): void {
    // eslint-disable-next-line no-restricted-syntax
    for (const form of hashSet) {
      const index = form.inputs.indexOf(input);
      if (index !== -1) {
        form.inputs.splice(index, 1);
        return;
      }
    }
  }
}
