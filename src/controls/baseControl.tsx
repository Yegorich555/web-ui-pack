/* eslint-disable max-classes-per-file */
import Core from "../core";
import { Validations, Validation, ValidationMessages } from "./validation";
import FormsStore from "../forms/formsStore";
import { Form } from "../forms/form";
import detectFocusLeft from "../helpers/detectFocusLeft";

export abstract class BaseControlValidations<ValueType> implements Validations<ValueType> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: Validation<ValueType, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract required: Validation<ValueType, any>;
}

export interface BaseControlValidationProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  required?: boolean | string;
}

export interface BaseControlProps<TValue, TControl> {
  /**
   * Html Id attribute. InitValue: impossible to replace this after component-init
   */
  id?: string | number;
  className?: string;
  label?: string;
  name?: string;
  initValue?: TValue;
  validations?: BaseControlValidationProps;
  /** Event happens when value is changed */
  onChanged?: (value: TValue, control: TControl) => void;
  /** Event happens when control completely lost focus */
  onFocusLeft?: (value: TValue, control: TControl) => void;
  autoFocus?: boolean;
}

export interface BaseControlState<T> {
  value: T;
  error?: string;
}
let _id = 0;

// todo PureComponent? or shouldComponentUpdate
export abstract class BaseControl<
  TValue,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Props extends BaseControlProps<TValue, any>,
  State extends BaseControlState<TValue>
> extends Core.Component<Props, State> {
  // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
  ["constructor"]: typeof BaseControl;

  /**
   * Options that common for every control
   * if you need to redefine options for particular control just redefine this one in inheritted control
   */
  static common = {
    getUniqueId(): string {
      return `uipack_${++_id}`;
    },
    /** Set 'true' if need to validate when user changed value */
    validateOnChange: true,
    /** Set 'true' if need to validate when control lost focus */
    validateOnFocusLeft: true,
    /** Timeout that used for preventing focus-debounce when labelOnClick > onBlur > onFocus happens */
    focusDebounce: 100
  };

  /**
   * Function that form uses in validation.required and collecting info
   * @param v checked value
   */
  static isEmpty<TValue>(v: TValue): boolean {
    return v == null;
  }

  /**
   * Default value that control must return if isEmpty
   * If setup 'null' textControl returns 'null' instead of empty-string
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static returnEmptyValue: any = null;

  /**
   * Default value that assigned to input if no props.initValue, form.props.initModel specified
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static defaultInitValue: any = null;

  get initValue(): TValue {
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

  get value(): TValue {
    const { value } = this.state;
    return this.constructor.isEmpty(value) ? this.constructor.returnEmptyValue : value;
  }

  /**
   * Validation rules that attached to the input. You can extend ones directly via
   * {theInput}.defaultValidations.required.msg = "Please fill this input"
   * {theInput}.defaultValidations.required.test = v=> v!=null
   * {theInput}.defaultValidations.myRule = {
   *     test: v && v.length === 5
   *     msg: 'Only 5 characters is allowed'
   *  }
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static defaultValidations: BaseControlValidations<any> = {
    required: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      test: (v?: any) => !BaseControl.isEmpty(v),
      msg: ValidationMessages.required
    }
  };

  id: string | number =
    this.props.id != null ? (this.props.id as string | number) : this.constructor.common.getUniqueId();
  // todo: isChanged = false;
  form?: Form<unknown>;
  domEl: HTMLLabelElement | undefined;
  setDomEl = (el: HTMLLabelElement): void => {
    this.domEl = el;
  };

  toJSON(): this {
    const result = { ...this };
    // @ts-ignore
    result.form = this.form ? "[formObject]" : undefined;
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
    if (this.props.name) {
      this.form = FormsStore.tryRegisterInput(this);
    }
    this.state.value = this.initValue;

    // Such bind is important for inheritance and using super...(): https://stackoverflow.com/questions/46869503/es6-arrow-functions-trigger-super-outside-of-function-or-class-error
    this.gotChange = this.gotChange.bind(this);
    this.gotBlur = this.gotBlur.bind(this);
  }

  get isRequired() {
    return !!(this.props.validations?.required || false);
  }

  static checkIsInvalid<TValue>(value?: TValue, propsValidations?: BaseControlValidationProps): false | string {
    const validations = this.defaultValidations;

    if (!propsValidations) {
      return false;
    }
    // checking is invalid
    const setRules = propsValidations as BaseControlValidationProps;
    const debugName = this.constructor.name;

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
    const failedSetV = setRules[failedRuleKey];
    // todo string for overriding default message can be setV
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

  /**
   * Function is fired when value changed or re-validation is required
   * @return true if isValid
   */
  setValue = (value: TValue, callback?: () => void, skipValidation?: boolean): boolean => {
    const error = skipValidation
      ? this.state.error
      : this.constructor.checkIsInvalid(value, this.props.validations) || undefined;

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
  };

  /** Fire validation, update state and return true if isValid */
  validate = (): boolean => {
    return this.setValue(this.state.value);
  };

  /** Input must fire this method after onChange of value is happened */
  gotChange(value: TValue): void {
    this.setValue(value, undefined, !this.constructor.common.validateOnChange);
  }

  /** Function is fired when control completely lost focus */
  onFocusLeft = (value: TValue) => {
    this.setValue(
      value,
      () => this.props.onFocusLeft && this.props.onFocusLeft(value, this),
      !this.constructor.common.validateOnFocusLeft
    );
  };

  /** Input must fire this method after focus is lost */
  gotBlur(value: TValue): void {
    // todo check this for dropdown
    detectFocusLeft(this.domEl as HTMLElement, () => this.onFocusLeft(value), this.constructor.common.focusDebounce);
  }

  /** Implement this method and bind gotBlur and gotChange */
  abstract getRenderedInput(id: string | number, value: TValue): Core.Element;

  componentDidMount(): void {
    if (this.props.autoFocus && this.domEl) {
      this.domEl.focus(); // focus automatically fired from label to input
    }
  }

  componentWillUnmount(): void {
    FormsStore.tryRemoveInput(this);
  }

  render(): Core.Element {
    const { isRequired } = this;
    const { id } = this;
    return (
      <label
        htmlFor={id as string}
        className={this.props.className}
        data-required={isRequired || null}
        ref={this.setDomEl}
      >
        <span>{this.props.label}</span>
        <span>{this.getRenderedInput(id, this.state.value)}</span>
        {/* wait: update to aria-errormessage when NVDA supports it: https://github.com/nvaccess/nvda/issues/8318 */}
        {/* todo: implement tooltip for this case */}
        {this.state.error ? <span role="alert">{this.state.error}</span> : null}
      </label>
    );
  }
}
