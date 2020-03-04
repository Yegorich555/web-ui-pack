/* eslint-disable max-classes-per-file */
import Core from "../core";
import { Validations, Validation } from "./validation";
import FormInputsCollection from "../forms/formInputsCollection";
import Form from "../forms/form";
import detectFocusLeft from "../helpers/detectFocusLeft";

export abstract class BaseInputValidations<ValueType> implements Validations<ValueType> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: Validation<ValueType, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract required: Validation<ValueType, any>;
}

export interface BaseInputValidationProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  required?: boolean | string;
}

export interface BaseInputProps<T> {
  /**
   * Html Id attribute. InitValue: impossible to replace this after component-init
   */
  id?: string | number;
  className: string;
  label?: string;
  name?: string;
  initValue?: T;
  validations?: BaseInputValidationProps;
  onChanged: (value: T, event: Core.DomChangeEvent) => void;
  onFocusLeft: (value: T, event: Core.DomFocusEvent) => void;
  autoFocus?: boolean;
}

export interface BaseInputState<T> {
  value: T;
  error?: string;
}
let _id = 1;

// todo PureComponent? or shouldComponentUpdate
export default abstract class BaseInput<
  ValueType,
  Props extends BaseInputProps<ValueType>,
  State extends BaseInputState<ValueType>
> extends Core.Component<Props, State> {
  // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
  ["constructor"]: typeof BaseInput;

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static defaultInitValue: any = null;

  get initValue(): ValueType {
    if (this.props && this.props.initValue !== undefined) {
      return this.props.initValue as ValueType;
    }
    if (this.props.name && this.form) {
      const v = this.form.getInitValue<ValueType>(this.props.name as string);
      if (v !== undefined) {
        return v;
      }
    }
    return (this.constructor.defaultInitValue as unknown) as ValueType;
  }

  get value(): ValueType {
    return this.state.value;
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
  static defaultValidations: BaseInputValidations<any>;

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

  // todo return error message to form?
  validate = (): boolean => {
    const validations = this.constructor.defaultValidations;
    const { value } = this.state; // todo value trim() here and validateByChange should ignore trimming

    if (!validations || !this.props.validations) {
      return true;
    }
    // checking is invalid
    const setRules = this.props.validations as BaseInputValidationProps;

    function findFailedRuleKey(ruleKey: keyof BaseInputValidationProps): boolean {
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
      if (this.state.error) {
        this.setState({ error: undefined });
      }
      return true;
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

    this.setState({ error }); // todo bypass "Please provide a valid value"

    return false;
  };

  /** This method input must fire after onChange of value is happened */
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
      this.setState({ value }, () => {
        this.props.onFocusLeft && this.props.onFocusLeft(this.state.value, e);
        this.validate(); // todo improve this because it creates 2 setState events
      });
    }
    this.props.onFocusLeft && this.props.onFocusLeft(this.state.value, e);
  };

  /** This method input must fire after focus is lost */
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
