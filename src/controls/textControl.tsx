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
      "id" | "onChange" | "onBlur" | "aria-invalid" | "aria-required" | "value" | "disabled"
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
  static returnEmptyValue: string | null | undefined = null;

  /** @inheritdoc */
  static emptyValue = null;

  /** @inheritdoc */
  static defaultInitValue = "";

  /** @inheritdoc */
  static defaultValidations = new TextControlValidations();

  constructor(props: TextControlProps) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.getRenderedInput = this.getRenderedInput.bind(this);
    this.renderInput = this.renderInput.bind(this);
  }

  handleChange(e: Core.DomChangeEvent) {
    this.gotChange(e.target.value.trimStart());
  }

  handleBlur(e: Core.DomFocusEvent) {
    // todo trimming is wrong for textArea
    this.gotBlur(e.target.value.trim());
  }

  /** Override this method for customizing input-rendering */
  renderInput(defProps: Core.HTMLAttributes<HTMLInputElement>, value: string): Core.Element {
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
      "aria-required": this.isRequired,
      disabled: this.props.disabled
    } as Core.HTMLAttributes<HTMLInputElement>;
    return this.renderInput(defProps, value);
  }
}
