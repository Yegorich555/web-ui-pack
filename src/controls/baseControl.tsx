/* eslint-disable max-classes-per-file */
import Core from "../core";
import { Validations, Validation } from "./validation";
import FormInputsCollection from "../forms/formInputsCollection";
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

export interface BaseControlProps<T> {
  /**
   * Html Id attribute. InitValue: impossible to replace this after component-init
   */
  id?: string | number;
  className: string;
  label?: string;
  name?: string;
  initValue?: T;
  validations?: BaseControlValidationProps;
  onChanged: (value: T, event: Core.DomChangeEvent) => void;
  onFocusLeft: (value: T, event: Core.DomFocusEvent) => void;
  autoFocus?: boolean;
}

export interface BaseControlState<T> {
  value: T;
  error?: string;
}
let _id = 0;

// todo PureComponent? or shouldComponentUpdate
export abstract class BaseControl<
  ValueType,
  Props extends BaseControlProps<ValueType>,
  State extends BaseControlState<ValueType>
> extends Core.Component<Props, State> {
  // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
  ["constructor"]: typeof BaseControl;

  static getUniqueId(): string {
    return `uipack_${++_id}`;
  }

  /**
   * Function that form uses in validation.required and collecting info
   * @param v checked value
   */
  static isEmpty<ValueType>(v: ValueType): boolean {
    return v == null;
  }

  /**
   * Default value that control must return if isEmpty
   * If setup 'null' textControl returns 'null' instead of empty-string
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static emptyValue: any = null;

  /**
   * Default value that assigned to input if no props.initValue, form.props.initModel specified
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static defaultInitValue: any = null;

  get initValue(): ValueType {
    let definedValue: ValueType | undefined;
    if (this.props.initValue !== undefined) {
      definedValue = this.props.initValue as ValueType;
    }
    if (this.props.name && this.form) {
      const v = this.form.getInitValue<ValueType>(this.props.name as string);
      if (v !== undefined) {
        definedValue = v;
      }
    }
    if (definedValue !== undefined && !this.constructor.isEmpty(definedValue)) {
      return definedValue;
    }
    return (this.constructor.defaultInitValue as unknown) as ValueType;
  }

  get value(): ValueType {
    const { value } = this.state;
    return this.constructor.isEmpty(value) ? this.constructor.emptyValue : value;
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
  static defaultValidations: BaseControlValidations<any>;

  id: string | number = this.props.id != null ? (this.props.id as string | number) : this.constructor.getUniqueId();
  isChanged = false;
  form?: Form<unknown>;
  domEl: HTMLLabelElement | undefined;
  setDomEl = (el: HTMLLabelElement): void => {
    this.domEl = el;
  };

  toJSON(): unknown {
    const result = { ...this };
    // @ts-ignore
    result.form = this.form ? "[formObject]" : undefined;
    return result;
  }

  state = {
    value: (this.constructor.defaultInitValue as unknown) as ValueType
  } as State;

  constructor(props: Props) {
    super(props);
    /* todo 
     initRequiredValues as id, initModel, initValue can be dynamic and in this case 
     we must detect changes and reinit logic
    */
    // todo validate during the creation if initValue is wrong
    if (this.props?.name) {
      this.form = FormInputsCollection.tryRegisterInput(this);
    }
    this.state.value = this.initValue;

    // Such bind is important for inheritance and using super...(): https://stackoverflow.com/questions/46869503/es6-arrow-functions-trigger-super-outside-of-function-or-class-error
    this.gotChange = this.gotChange.bind(this);
    this.gotBlur = this.gotBlur.bind(this);
  }

  get isRequired() {
    return !!(this.props.validations?.required || false);
  }

  // todo move it to static function
  checkIsInvalid = (): false | string => {
    const validations = this.constructor.defaultValidations;
    const { value } = this.state; // todo value trim() here and validateByChange should ignore trimming

    if (!validations || !this.props.validations) {
      return false;
    }
    // checking is invalid
    const setRules = this.props.validations as BaseControlValidationProps;

    function findFailedRuleKey(ruleKey: keyof BaseControlValidationProps): boolean {
      const setV = setRules[ruleKey];
      // todo what if "" | 0 is not ignoring by setup
      if (setV == null || setV === false) {
        return false;
      }
      const definedValidation = validations[ruleKey];
      if (!definedValidation) {
        console.warn(`Props [${ruleKey}] is set but it wasn't found in defaultValidations`, setRules, validations);
        return false;
      }
      if (!definedValidation.test(value, setV)) {
        return true;
      }
      return false;
    }

    // validate for required first
    const failedRuleKey =
      (this.isRequired && findFailedRuleKey("required") && "required") ||
      // rule 'required' is fine go check others
      Object.keys(setRules).find(findFailedRuleKey);

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
  };

  validate = (): boolean => {
    const errorMsg = this.checkIsInvalid();
    const error = errorMsg || undefined;
    if (error !== this.state.error) {
      this.setState({ error });
    }
    return !!errorMsg;
  };

  /** Input must fire this method after onChange of value is happened */
  gotChange(value: ValueType, e: Core.DomChangeEvent): void {
    if (value !== this.state.value) {
      this.setState({ value }, () => {
        this.props.onChanged && this.props.onChanged(value, e);
      });
      // todo: this.props.validateOnChange && this.validate(value);
    }
  }

  onFocusLeft = (value: ValueType, e: Core.DomFocusEvent) => {
    if (value !== this.state.value) {
      this.setState({ value, error: this.checkIsInvalid() || undefined }, () => {
        this.props.onFocusLeft && this.props.onFocusLeft(this.state.value, e);
      });
    }
    this.props.onFocusLeft && this.props.onFocusLeft(this.state.value, e);
  };

  /** Input must fire this method after focus is lost */
  gotBlur(value: ValueType, e: Core.DomFocusEvent): void {
    // todo check this for dropdown
    detectFocusLeft(this.domEl as HTMLElement, () => this.onFocusLeft(value, e));
  }

  /** Implement this method and bind gotBlur and gotChange */
  abstract getRenderedInput(id: string | number, value: ValueType): Core.Element;

  // todo move this logic to BaseComponent
  componentDidMount(): void {
    if (this.props.autoFocus && this.domEl) {
      this.domEl.focus(); // focus automatically fired from label to input
    }
  }

  componentWillUnmount(): void {
    FormInputsCollection.tryRemoveInput(this);
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
