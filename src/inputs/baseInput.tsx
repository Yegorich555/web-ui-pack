/* eslint-disable max-classes-per-file */
import Core from "../core";
import { ValidationProps, Validations, Validation } from "./validation";
import FormInputsCollection from "../forms/formInputsCollection";
import Form from "../forms/form";
// export interface BasicInputValidations<T, setV> extends Validations<T, setV> {
//   required;
// }

export abstract class BaseInputValidations<ValueType> implements Validations<ValueType> {
  [key: string]: Validation<ValueType, unknown>;
  abstract required: Validation<ValueType, unknown>;
}

export interface BaseInputValidationProps extends ValidationProps {
  required: boolean; // todo string?
}

export interface BaseInputProps<T> {
  htmlId?: string | number; // todo point that htmlId should be predefined
  htmlName?: string;
  // todo using modelMapping instead js-key mapping
  name?: string;
  initValue?: T;
  validations: BaseInputValidationProps;
}

export interface BaseInputState<T> {
  value: T;
  isValid: boolean;
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
  static isEmpty(v: unknown): boolean {
    return v == null;
  }

  static defaultInitValue = null;

  // todo remove getter???
  get currentValue(): ValueType {
    return this.state.value;
  }

  get initValue(): ValueType {
    if (this.isChanged) {
      return this.currentValue;
    }
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

  isChanged = false;
  form: Form<unknown> | undefined;
  // todo htmlId canBe redefined
  htmlId = this.props.htmlId ?? BaseInput.getUniqueId();

  toJSON(): unknown {
    const result = {};
    Object.keys(result).forEach(key => {
      if (key !== "form") {
        // @ts-ignore
        result[key] = this[key];
      } else {
        // @ts-ignore
        result.form = "[formObject]";
      }
    });

    return result;
  }

  state = {
    value: (this.constructor.defaultInitValue as unknown) as ValueType,
    isValid: true // todo if this has *required* this is already invalid
  } as State;

  constructor(props: Props) {
    super(props);
    // todo if name isChanged but input is not: we must update initValue
    if (this.props?.name) {
      this.form = FormInputsCollection.tryRegisterInput(this);
    }
    this.htmlId = this.props.htmlId ?? BaseInput.getUniqueId();

    this.state.value = this.initValue;
  }

  //   get hasRequired() {
  //     return this.props.validations && this.props.validations.required;
  //   }

  validate = (): ValueType | false => {
    // todo implement
    return false;
  };
  //   validate = v => {
  //     const propsValidations = this.validationProps;
  //     if (!propsValidations || this.props.disableValidation) {
  //       return true;
  //     }

  //     const validations = this.prepareValidations(propsValidations);
  //     const value = typeof v === "string" ? v.trim() : v;

  //     const self = this;
  //     function updateError(message) {
  //       self.setState({
  //         isValid: false,
  //         errorMessage: message === "" ? null : message || __ln("Please provide a valid value")
  //       });
  //     }

  //     const isEmpty = this.constructor.isEmpty(value);
  //     const isValid = Object.keys(validations).every(key => {
  //       const validation = validations[key];
  //       // fire validations only if value isNotEmpty
  //       const result = !isEmpty || key === "required" ? validation(value) : true;
  //       if (result !== true) {
  //         updateError(result);
  //         return false;
  //       }
  //       return true;
  //     });

  //     isValid && this.setState({ isValid: true });

  //     return isValid;
  //   };

  //   provideValueCallback() {
  //     const v = this.currentValue;
  //     return this.constructor.isEmpty(v) ? undefined : v;
  //   }

  //   handleChange(value, event, setStateCallback) {
  //     if (value !== this.state.value) {
  //       this.setState({ value }, setStateCallback);
  //       this.props.validateOnChange && this.validate(value);
  //       this.props.onChange && this.props.onChange(value, event);
  //     }
  //   }

  // handleBlur(value, e): void {
  //   if (value !== this.state.value) {
  //     this.setState({ value });
  //     this.validate(value);
  //   }
  //   this.props.onBlur && this.props.onBlur(e || { target: { value } });
  // }

  abstract renderInput(id: string | number, value: ValueType): Core.Element;

  //   renderBefore() {
  //     return null;
  //   }

  componentWillUnmount(): void {
    FormInputsCollection.tryRemoveInput(this);
  }

  render(): Core.Element {
    return (
      <label htmlFor={this.htmlId as string}>
        {/* todo required mark here */}
        <span>Label here</span>
        <fieldset>{this.renderInput(this.htmlId as string, this.state.value)}</fieldset>
        {/* todo aria-invalid here */}
        <span>Error message here</span>
      </label>
    );
  }
  // return (
  //   <label
  //     // id={labelId}
  //     htmlFor={id}
  //     className={[
  //       styles.control,
  //       !this.state.isValid ? styles.isInvalid : null,
  //       this.props.className,
  //       this.controlClassName
  //     ]}
  //     {...this.controlProps}
  //   >
  //     {this.renderBefore()}
  //     <span className={this.hasRequired && !this.props.hideRequiredMark ? styles.required : null}>
  //       {this.props.label}
  //     </span>

  //     {this.props.description ? <div className={styles.description}>{this.props.description}</div> : null}
  //     <fieldset>{this.renderInput(id, labelId, this.state.value)}</fieldset>
  //     {!this.state.isValid && this.state.errorMessage && !this.props.disableValidation ? (
  //       <span className={styles.errorMessage}>{this.state.errorMessage}</span>
  //     ) : null}
  //   </label>
  // );
  // }
}
