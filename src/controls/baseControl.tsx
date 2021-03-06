/* eslint-disable max-classes-per-file */
import Core from "../core";
import { Validations, Validation, ValidationMessages } from "./validation";
import FormsStore from "../forms/formsStore";
import { Form } from "../forms/form";
import detectFocusLeft from "../helpers/detectFocusLeft";
import { BaseComponent, BaseComponentProps } from "../baseComponent";

export abstract class BaseControlValidations<ValueType> implements Validations<ValueType> {
  [key: string]: Validation<ValueType, any>;
  abstract required: Validation<ValueType, any>;
}

export interface BaseControlValidationProps {
  [key: string]: any;
  required?: boolean | string;
}

export interface BaseControlProps<TValue> extends BaseComponentProps {
  htmlInputProps?: Pick<
    // todo maybe delete this: placeholder???
    Core.HTMLAttributes<HTMLInputElement>,
    Exclude<
      keyof Core.HTMLAttributes<HTMLInputElement>,
      "onChange" | "onBlur" | "aria-invalid" | "aria-required" | "value" | "disabled"
    >
  >;
  label?: string;
  /** Prop-key for form-model, if you want to set html attribute @see htmlInputProps */
  name?: string;
  /** Value that attached to control */
  initValue?: TValue;
  /** Validation rules for the control */
  validations?: BaseControlValidationProps;
  /** Event happens when value is changed */
  onChanged?: <TControl>(value: TValue, control: TControl) => void;
  /** Event happens when control completely lost focus */
  onFocusLeft?: <TControl>(value: TValue, control: TControl) => void;
  /** Html attribute */
  disabled?: boolean;
}

export interface BaseControlState<T> {
  value: T;
  error?: string;
}

let _id = 0;
export abstract class BaseControl<
  TValue,
  Props extends BaseControlProps<TValue>,
  State extends BaseControlState<TValue>
> extends BaseComponent<Props, State> {
  // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
  // @ts-ignore
  ["constructor"]: typeof BaseControl;

  /** @inheritdoc */
  static excludedRenderProps: Readonly<Array<keyof BaseControlProps<unknown>>> = [
    "initValue",
    "name",
    "validations",
    "onChanged",
    "onFocusLeft",
    ...BaseComponent.excludedRenderProps
  ];

  /**
   * Options that common for every inherited control
   * if you need to redefine options for particular control just define this one in inherited control
   */
  static common = {
    /** Returns unique id-attribute for the error-message; requires only for accessibility */
    getUniqueIdError(): string {
      return `err${++_id}`;
    },
    /** Auto-validation when user changed value; Default: true */
    validateOnChange: true,
    /** Auto-validation when control lost focus; Default: true */
    validateOnFocusLeft: true,
    /** Timeout that used for preventing focus-debounce when labelOnClick > onBlur > onFocus happens */
    focusDebounce: 100,
    /** Check if value is Invalid; return false if isValid or string-error-message  */
    checkIsInvalid<TValue>(
      value: TValue,
      defaultValidations: BaseControlValidations<TValue>,
      propsValidations?: BaseControlValidationProps
    ): false | string {
      const validations = defaultValidations;

      if (!propsValidations) {
        return false;
      }
      // checking is invalid
      const setRules = propsValidations as BaseControlValidationProps;
      const debugName = this.constructor.name; // todo possible is wrong

      function isRuleFailed(ruleKey: keyof BaseControlValidationProps): boolean {
        const setV = setRules[ruleKey];
        if (setV == null || setV === false) {
          return false;
        }
        const definedValidation = validations[ruleKey];
        if (!definedValidation) {
          console.warn(
            `Props validations.${ruleKey} is set but isn't found in ${debugName}.defaultValidations`,
            setRules,
            validations
          );
          return false;
        }
        if (!definedValidation.test(value, setV)) {
          return true;
        }
        return false;
      }

      // validate for required first
      const failedRuleKey = isRuleFailed("required") ? "required" : Object.keys(setRules).find(isRuleFailed);
      if (!failedRuleKey) {
        return false;
      }

      // defining error message
      let error = "";
      const failedSetV = setRules[failedRuleKey] as keyof BaseControlValidationProps;
      if (typeof failedSetV === "string") {
        error = failedSetV;
      } else {
        const defaultMsg = validations[failedRuleKey].msg;
        if (typeof defaultMsg === "function") {
          error = (defaultMsg as (setV: unknown) => string)(failedSetV);
        } else {
          error = defaultMsg;
        }
      }
      return error || `Invalid field for key [${failedRuleKey}]`;
    }
  };

  /**
   * Returns true if the value is empty/null
   * Uses for validation.required, instance.isEmpty, instance.initValue etc.
   * @param v The value to check
   */
  static isEmpty<TValue>(v: TValue): boolean {
    return v == null;
  }

  /**
   * Default value that control must return if .isEmpty
   * If set 'null' TextControl will return 'null' instead of empty-string
   */
  static returnEmptyValue: any = null;
  /** Default value that assigned to input if no props.initValue, form.props.initModel specified */
  static defaultInitValue: any = null;
  /**
   * Validation rules that attached to the control. You can extend ones directly via
   * {control}.defaultValidations.required.msg = "Please fill this input"
   * {control}.defaultValidations.required.test = v=> v!=null
   * {control}.defaultValidations.myRule = {
   *     test: v && v.length === 5
   *     msg: 'Only 5 characters is allowed'
   *  }
   */
  static defaultValidations: BaseControlValidations<any> = {
    required: {
      test: (v?: any) => !BaseControl.isEmpty(v),
      msg: ValidationMessages.required
    }
  };

  /** @readonly Returns the currentValue. For changing @see BaseControl.setValue */
  get value(): Readonly<TValue> {
    const { value } = this.state;
    return this.constructor.isEmpty(value) ? this.constructor.returnEmptyValue : value;
  }

  /** @readonly Returns true if the currentValue is different from the initValue */
  get isChanged(): Readonly<boolean> {
    return this.state.value !== this.getInitValue(this.props);
  }

  /** @readonly Returns true if the currentValue is empty/null. @see constructor.isEmpty */
  get isEmpty(): Readonly<boolean> {
    return this.constructor.isEmpty(this.state.value);
  }

  /** @readonly Returns true if the props.validations.required is true */
  get isRequired(): Readonly<boolean> {
    return !!(this.props.validations?.required || false);
  }

  private _idError: Readonly<string> = this.constructor.common.getUniqueIdError();
  form?: Form<unknown>;

  toJSON(): this {
    const result = { ...this };
    result.form = this.form ? (("[formObject]" as unknown) as Form<unknown>) : undefined;
    return result;
  }

  state = {
    value: (this.constructor.defaultInitValue as unknown) as TValue
  } as State;

  constructor(props: Props) {
    super(props);
    // todo validate during the creation if initValue is wrong
    this.form = FormsStore.tryRegisterControl(this);

    this.getInitValue = this.getInitValue.bind(this);
    this.state.value = this.getInitValue(props);

    // Such bind is important for inheritance and using super...(): https://stackoverflow.com/questions/46869503/es6-arrow-functions-trigger-super-outside-of-function-or-class-error
    // this.gotChange = this.gotChange.bind(this);
    // this.gotBlur = this.gotBlur.bind(this);
    this.renderError = this.renderError.bind(this);
    this.setValue = this.setValue.bind(this);
    this.validate = this.validate.bind(this);
    this.onFocusLeft = this.onFocusLeft.bind(this);
    this.renderError = this.renderError.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleInputBlur = this.handleInputBlur.bind(this);
    this.renderInput = this.renderInput.bind(this);
    this.getInputValue = this.getInputValue.bind(this);
    this.getControlProps = this.getControlProps.bind(this);
  }

  getInitValue(props: Props): Readonly<TValue> {
    let definedValue: TValue | undefined;
    if (props.initValue !== undefined) {
      definedValue = props.initValue as TValue;
    } else if (props.name && this.form) {
      const v = this.form.getInitValue<TValue>(props.name as string);
      if (v !== undefined) {
        definedValue = v;
      }
    }
    if (definedValue !== undefined && !this.constructor.isEmpty(definedValue)) {
      return definedValue;
    }
    return (this.constructor.defaultInitValue as unknown) as TValue;
  }

  /**
   * Function is fired when value changed or re-validation is required
   * @return true if isValid
   */
  setValue(value: TValue, callback?: () => void, skipValidation?: boolean): boolean {
    const error = skipValidation
      ? this.state.error
      : this.constructor.common.checkIsInvalid(value, this.constructor.defaultValidations, this.props.validations) ||
        undefined;

    const isValueChanged = value !== this.state.value;
    if (isValueChanged || error !== this.state.error) {
      this.setState({ value, error }, () => {
        isValueChanged && this.props.onChanged && this.props.onChanged(value, this);
        callback && callback();
      });
    } else {
      callback && callback();
    }
    return !error;
  }

  /** Fire validation, update state and return true if isValid */
  validate(): boolean {
    return this.setValue(this.state.value);
  }

  /** Function is fired when control completely lost focus */
  onFocusLeft(inputValue: string | TValue): void {
    this.setValue(
      (inputValue as unknown) as TValue,
      () => this.props.onFocusLeft && this.props.onFocusLeft((inputValue as unknown) as TValue, this),
      !this.constructor.common.validateOnFocusLeft
    );
  }

  /** onChange event of the input */
  handleInputChange(e: Core.DomChangeEvent): void {
    const value = (e.target.value.trimStart() as unknown) as TValue;
    this.setValue(value, undefined, !this.constructor.common.validateOnChange);
  }

  /** onBlur event of the input */
  handleInputBlur(e: Core.DomFocusEvent): void {
    const value = e.target.value.trim();
    detectFocusLeft(this.domEl as HTMLElement, () => this.onFocusLeft(value), this.constructor.common.focusDebounce);
  }

  componentWillUnmount(): void {
    FormsStore.tryRemoveControl(this);
  }

  /** @inheritdoc */
  shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<State>, nextContext: any): boolean {
    // try to update init value if it's not changed
    if (nextProps !== this.props && !this.isChanged) {
      const value = this.getInitValue(nextProps);
      if (value !== this.state.value) {
        this.state.value = value;
        return true;
      }
    }
    // otherwise use base logic
    if (super.shouldComponentUpdate(nextProps, nextState, nextContext)) {
      return true;
    }
    // validations.required is tied with aria-required
    if (this.props.validations?.required !== nextProps.validations?.required) {
      return true;
    }
    return false;
  }

  renderError(error: string, errorId: string): Core.Element {
    /* todo: implement tooltip for this case */
    return (
      <div role="alert" id={errorId}>
        {error}
      </div>
    );
  }

  /** Override this method for providing truly string value for the input */
  getInputValue(value: TValue): string {
    return value == null ? "" : ((value as unknown) as string);
  }

  /** Override this method for customizing input-rendering */
  renderInput(defProps: Core.HTMLAttributes<HTMLInputElement>): Core.Element {
    return (
      <label htmlFor={defProps.id}>
        <span>{this.props.label}</span>
        <input {...defProps} />
      </label>
    );
  }

  /** Props of the div that is wrapper of the input and the top-element of the control */
  getControlProps(isRequired: boolean): Core.HTMLDivProps {
    return {
      ref: this.setDomEl,
      className: this.props.className,
      // @ts-ignore
      disabled: this.props.disabled,
      "data-required": isRequired || null,
      "data-invalid": !!this.state.error || null
    };
  }

  render(): Core.Element {
    const { isRequired } = this;
    return (
      <div {...this.getControlProps(isRequired)}>
        <fieldset disabled={this.props.disabled}>
          {this.props.label ? <legend aria-hidden="true">{this.props.label}</legend> : null}
          {/* wait: update for aria-errormessage when NVDA supports it: https://github.com/nvaccess/nvda/issues/8318 */}
          {this.renderInput({
            ...this.props.htmlInputProps,
            onChange: this.handleInputChange,
            onBlur: this.handleInputBlur,
            "aria-invalid": !!this.state.error,
            "aria-required": this.isRequired,
            "aria-describedby": this.state.error ? this._idError : null,
            value: this.getInputValue(this.state.value)
          } as Core.HTMLAttributes<HTMLInputElement>)}
        </fieldset>
        {this.state.error ? this.renderError(this.state.error, this._idError) : null}
      </div>
    );
  }
}
