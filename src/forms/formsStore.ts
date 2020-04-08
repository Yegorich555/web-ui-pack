import { Form } from "./form";
import { BaseControl } from "../controls/baseControl";
import isComponentChild from "../helpers/isComponentChild";

const hashSet = new Set<Form<any>>();

export default class FormsStore {
  static get forms(): Set<Form<any>> {
    return hashSet;
  }
  static registerForm<T>(form: Form<T>): void {
    hashSet.add(form);
  }
  static removeForm<T>(form: Form<T>): void {
    hashSet.delete(form);
  }
  /**
   * Only inputs that has props.name can be added
   */
  static tryRegisterInput<T>(input: BaseControl<T, any, any>): Form<unknown> | undefined {
    // eslint-disable-next-line no-restricted-syntax
    for (const form of hashSet) {
      if (isComponentChild(form.props.children, input)) {
        // todo we can check duplicates of names
        form.inputs.push(input);
        return form;
      }
    }

    console.warn(
      `Form for control with name='${input.props.name}' is not defined. If you use Control without Form remove useless props.name`
    );

    return undefined;
  }

  static tryRemoveInput<T>(input: BaseControl<T, any, any>): void {
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
