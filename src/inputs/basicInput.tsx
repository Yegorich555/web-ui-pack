import JSXcreateElement from "../JSXcreateElement";

export type ValidateFunction<T> = (v: T) => true | string;

export default abstract class BasicInput<T> {
  isEmpty = (v: T): boolean => v == null;

  get initValue(): T {
    return (null as unknown) as T;
  }

  // todo maybe place in common config.file?
  get defaultValidations(): Map<string, ValidateFunction<T>> {
    const map = new Map<string, ValidateFunction<T>>();
    // todo check terser-minimizing for 'required'
    map.set("required", v => this.isEmpty(v) || "This field is required"); // todo: make it replaceable
    return map;
  }

  // constructor() {
  //   this.state = {
  //     value: this.defaultValue !== undefined ? this.defaultValue : this.constructor.initValue,
  //     isValid: true
  //   };
  //   this.provideValueCallback = this.provideValueCallback.bind(this); // Such bind is important for inheritance and using super...():
  //   this.props.provideValue && this.props.provideValue(this.provideValueCallback);
  //   this.props.resetValue &&
  //     this.props.resetValue(() => {
  //       this.setState({ value: this.constructor.initValue });
  //     });
  //   this.props.validate && this.props.validate(() => this.validate(this.state.value));
  //   this.renderInput = this.renderInput.bind(this); // Such bind is important for inheritance and using super...(): https://stackoverflow.com/questions/46869503/es6-arrow-functions-trigger-super-outside-of-function-or-class-error
  //   this.renderBefore = this.renderBefore.bind(this); // Such bind is important for inheritance and using super...(): https://stackoverflow.com/questions/46869503/es6-arrow-functions-trigger-super-outside-of-function-or-class-error
  //   this.prepareValidations = memoize(this._prepareValidations);
  // }

  //   get defaultValue() {
  //     const { name, defaultModel, defaultValue } = this.props;
  //     if (name) {
  //       const model = defaultModel !== undefined ? defaultModel : this.props.formDefaultModel;
  //       if (model) {
  //         return lodashGet(model, name);
  //       }
  //     }
  //     return defaultValue;
  //   }

  //   get hasRequired() {
  //     return this.props.validations && this.props.validations.required;
  //   }

  //   get currentValue() {
  //     return this.state.value;
  //   }

  //   get validationProps() {
  //     return this.props.validations;
  //   }

  //   // wrapped with memoise
  //   _prepareValidations = v => {
  //     this.prev = v;
  //     const def = this.constructor.defaultValidations;
  //     const defRebind = {};
  //     Object.keys(def).forEach(key => {
  //       defRebind[key] = def[key].bind(this);
  //     });

  //     return UnifyValidations(v, defRebind);
  //   };

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

  // abstract renderInput(): HTMLElement;

  //   renderBefore() {
  //     return null;
  //   }

  render(): React.ReactComponentElement<"label"> | HTMLLabelElement {
    // return React.createElement("div");
    return <label>test</label>;
    // return (
    //   <label
    //     id={labelId}
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
    //     <fieldset>{this.renderInput && this.renderInput(id, labelId, this.state.value)}</fieldset>
    //     {!this.state.isValid && this.state.errorMessage && !this.props.disableValidation ? (
    //       <span className={styles.errorMessage}>{this.state.errorMessage}</span>
    //     ) : null}
    //   </label>
    // );
  }
}
