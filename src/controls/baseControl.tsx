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

export interface BaseControlProps<TValue, TControl> extends BaseComponentProps {
  /** Html attribute */
  id?: string | number;
  label?: string;
  /** prop-key for form-model. Changing doesn't have effect on initValue from form.initModel */
  name?: string;
  /** value that attached to control. This is InitProp - replacing after component-init doesn't have effect */
  initValue?: TValue;
  /** validation rules for the control */
  validations?: BaseControlValidationProps;
  /** Event happens when value is changed */
  onChanged?: (value: TValue, control: TControl) => void;
  /** Event happens when control completely lost focus */
  onFocusLeft?: (value: TValue, control: TControl) => void;
  disabled?: boolean;
}

export interface BaseControlState<T> {
  value: T;
  error?: string;
}
let _id = 0;

export abstract class BaseControl<
  TValue,
  Props extends BaseControlProps<TValue, any>,
  State extends BaseControlState<TValue>
> extends BaseComponent<Props, State> {
  // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
  // @ts-ignore
  ["constructor"]: typeof BaseControl;

  /** @inheritdoc */
  static excludedRenderProps: Readonly<Array<keyof BaseControlProps<unknown, unknown>>> = [
    "initValue", //
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
    getUniqueId(): string {
      return `uipack_${++_id}`;
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

  get initValue(): Readonly<TValue> {
    let definedValue: TValue | undefined;
    if (this.props.initValue !== undefined) {
      definedValue = this.props.initValue as TValue;
    } else if (this.props.name && this.form) {
      const v = this.form.getInitValue<TValue>(this.props.name as string);
      if (v !== undefined) {
        definedValue = v;
      }
    }
    if (definedValue !== undefined && !this.constructor.isEmpty(definedValue)) {
      return definedValue;
    }
    return (this.constructor.defaultInitValue as unknown) as TValue;
  }

  /** @readonly Returns the currentValue. For changing @see BaseControl.setValue */
  get value(): Readonly<TValue> {
    const { value } = this.state;
    return this.constructor.isEmpty(value) ? this.constructor.returnEmptyValue : value;
  }

  /** @readonly Returns true if the currentValue is different from the initValue */
  get isChanged(): boolean {
    return this.state.value !== this.initValue;
  }

  /** @readonly Returns true if the currentValue is empty/null. @see constructor.isEmpty */
  get isEmpty(): boolean {
    return this.constructor.isEmpty(this.state.value);
  }

  _id: string | number = this.constructor.common.getUniqueId();
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
    /* todo 
     initRequiredValues as id, initModel, initValue can be dynamic and in this case 
     we must detect changes and reinit logic
    */
    // todo validate during the creation if initValue is wrong
    this.form = FormsStore.tryRegisterControl(this);
    }
    this.state.value = this.initValue;

    // Such bind is important for inheritance and using super...(): https://stackoverflow.com/questions/46869503/es6-arrow-functions-trigger-super-outside-of-function-or-class-error
    this.gotChange = this.gotChange.bind(this);
    this.gotBlur = this.gotBlur.bind(this);
    this.renderError = this.renderError.bind(this);
    this.setValue = this.setValue.bind(this);
    this.validate = this.validate.bind(this);
    this.onFocusLeft = this.onFocusLeft.bind(this);
    this.renderError = this.renderError.bind(this);
  }

  get isRequired() {
    return !!(this.props.validations?.required || false);
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

  /** Input must fire this method after onChange of value is happened */
  gotChange(value: TValue): void {
    this.setValue(value, undefined, !this.constructor.common.validateOnChange);
  }

  /** Function is fired when control completely lost focus */
  onFocusLeft(value: TValue) {
    this.setValue(
      value,
      () => this.props.onFocusLeft && this.props.onFocusLeft(value, this),
      !this.constructor.common.validateOnFocusLeft
    );
  }

  /** Input must fire this method after focus is lost */
  gotBlur(value: TValue) {
    // todo check this for dropdown
    detectFocusLeft(this.domEl as HTMLElement, () => this.onFocusLeft(value), this.constructor.common.focusDebounce);
  }

  /** Implement this method and bind gotBlur and gotChange */
  abstract getRenderedInput(id: string | number, value: TValue): Core.Element;

  componentWillUnmount(): void {
    FormsStore.tryRemoveControl(this);
  }

  /** @inheritdoc */
  shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<State>, nextContext: any): boolean {
    if (super.shouldComponentUpdate(nextProps, nextState, nextContext)) {
      return true;
    }
    // validations.required is tied with aria-required
    if (this.props.validations?.required !== nextProps.validations?.required) {
      return true;
    }
    return false;
  }

  renderError(error: string): Core.Element {
    /* todo: implement tooltip for this case */
    return <span role="alert">{error}</span>;
  }

  render(): Core.Element {
    const { isRequired } = this;
    const id = (this.props.id || this._id) as string | number;
    return (
      <label
        ref={this.setDomEl}
        htmlFor={id as string}
        className={this.props.className}
        data-required={isRequired || null}
        // @ts-ignore
        disabled={this.props.disabled}
        data-invalid={!!this.state.error || null}
      >
        <span>{this.props.label}</span>
        {/* wait: update to aria-errormessage when NVDA supports it: https://github.com/nvaccess/nvda/issues/8318 */}
        <span>{this.getRenderedInput(id, this.state.value)}</span>
        {this.state.error ? this.renderError(this.state.error) : null}
      </label>
    );
  }
}
