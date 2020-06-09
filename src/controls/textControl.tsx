/* eslint-disable max-classes-per-file */
import {
  BaseControl,
  BaseControlValidations,
  BaseControlProps,
  BaseControlState,
  BaseControlValidationProps
} from "./baseControl";
import { ValidationMessages } from "./validation";

export class TextControlValidations extends BaseControlValidations<string> {
  required = {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    test: (v?: string) => !TextControl.isEmpty(v),
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

export interface TextControlValidationProps extends BaseControlValidationProps {
  /** Min length */
  min?: number;
  /** Max length */
  max?: number;
}

export interface TextControlProps extends BaseControlProps<string> {
  /** @inheritdoc */
  validations?: TextControlValidationProps;
}

export type TextControlState = BaseControlState<string>;

export class TextControl extends BaseControl<string, TextControlProps, TextControlState> {
  /** @inheritdoc */
  static isEmpty<TValue>(v: TValue): boolean {
    return v == null || ((v as unknown) as string) === "";
  }

  /** @inheritdoc */
  static returnEmptyValue: string | null | undefined = null;

  /** @inheritdoc */
  static defaultInitValue = "";

  /** @inheritdoc */
  static defaultValidations = new TextControlValidations();
}
