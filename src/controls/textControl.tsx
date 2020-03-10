/* eslint-disable max-classes-per-file */
import Core from "../core";
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
  min?: number;
  max?: number;
}

export interface TextControlProps extends BaseControlProps<string, TextControl> {
  validations?: TextControlValidationProps;
  htmlInputProps?: Pick<
    Core.HTMLAttributes<HTMLInputElement>,
    Exclude<
      keyof Core.HTMLAttributes<HTMLInputElement>,
      "id" | "onChange" | "onBlur" | "aria-invalid" | "aria-required" | "value"
    >
  >;
}

export type TextInputState = BaseControlState<string>;

export class TextControl extends BaseControl<string, TextControlProps, TextInputState> {
  /** @inheritdoc */
  static isEmpty<TValue>(v: TValue): boolean {
    return v == null || ((v as unknown) as string) === "";
  }

  /** @inheritdoc */
  static emptyValue = null;

  /** @inheritdoc */
  static defaultInitValue = "";

  /** @inheritdoc */
  static defaultValidations = new TextControlValidations();

  handleChange = (e: Core.DomChangeEvent) => {
    this.gotChange(e.target.value.trimStart());
  };

  handleBlur = (e: Core.DomFocusEvent) => {
    // todo trimming is wrong for textArea
    const newValue = e.target.value.trim();
    if (newValue !== this.state.value) {
      this.gotChange(newValue);
    }
    this.gotBlur(newValue);
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
