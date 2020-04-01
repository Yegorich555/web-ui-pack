import Core from "../core";
import { BaseControl, BaseControlProps } from "../controls/baseControl";
import FormsStore from "./formsStore";
import promiseWait from "../helpers/promiseWait";

export type FormProps<ModelType> = {
  className?: string;
  autoComplete?: "on" | "off";
  initModel?: ModelType;
  onValidSubmit: (model: ModelType) => Promise<string | { message: string }>;
  title?: string | Core.Element;
  textSubmit?: string | Core.Element;
};

export interface FormState {
  isPending: boolean;
  error: string | undefined;
}

// todo do we need export?
export type ButtonSubmitProps = {
  type: "submit";
};

export class Form<ModelType> extends Core.Component<FormProps<ModelType>, FormState> {
  // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
  ["constructor"]: typeof Form;

  static promiseDelayMs = 400;
  static isValidateUntilFirstError = true;
  static errOneRequired = "At least one value is required";
  // react.defaultProps works with > ver16.4.6
  static defaultProps: Partial<FormProps<unknown>> = {
    autoComplete: "off",
    textSubmit: "SUBMIT"
  };

  isUnMounted = false;
  domEl: HTMLFormElement | undefined;
  setDomEl = (el: HTMLFormElement): void => {
    this.domEl = el;
  };

  /**
   * Input adds itself to collection via FormsStore
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: BaseControl<any, BaseControlProps<any, any>, any>[] = [];

  isWaitSubmitFinished = false;
  state: FormState = {
    isPending: false,
    error: undefined
  };

  constructor(props: FormProps<ModelType>) {
    super(props);
    // todo if props.initModel is changed => update inputs
    FormsStore.registerForm(this);
  }

  getInitValue<ValueType>(name: string): ValueType | undefined {
    if (this.props && this.props.initModel) {
      // @ts-ignore
      return this.props.initModel[name] as ValueType;
    }
    return undefined;
  }

  setError = (error: string | undefined) => {
    if (error !== this.state.error) {
      // todo onErrorEvent
      this.setState({ error });
    }
  };

  validate = (): ModelType | false => {
    const model = {} as ModelType;
    let hasError = false;
    let isAllEmpty = true;

    const { inputs } = this;
    for (let i = 0; i < inputs.length; ++i) {
      const input = inputs[i];
      const isValid = input.validate();
      if (isValid === false) {
        hasError = true;
        if (this.constructor.isValidateUntilFirstError) {
          break;
        }
      } else {
        // todo nested name as obj.some.name without lodash
        const key = input.props.name;
        // todo option: don't attach notRequired&emptyValues
        // todo option: don't attach valuesThatWasn't changed
        if (key) {
          if (isAllEmpty && !input.constructor.isEmpty(input.value)) {
            isAllEmpty = false;
          }
          // @ts-ignore
          model[key] = input.value;
        }
      }
    }
    if (hasError) {
      // disable form-error because input has one
      this.setError(undefined);
      return false;
    }
    if (isAllEmpty) {
      // todo auto disable error when inputsValueChanged?
      this.setError(this.constructor.errOneRequired);
      return false;
    }

    return model;
  };

  onSubmit = (e: Core.FormEvent): void => {
    e.preventDefault();

    if (this.isWaitSubmitFinished) {
      return;
    }

    const validateResult = this.validate();
    if (validateResult === false) {
      return;
    }

    const { onValidSubmit } = this.props;
    if (!onValidSubmit) {
      console.warn("WebUIPack.Form: props.onValidSubmit is not attached");
      return;
    }

    const result = onValidSubmit(validateResult);
    const isPromise = result instanceof Promise;
    if (!isPromise) {
      return;
    }

    this.isWaitSubmitFinished = true;
    promiseWait(result, this.constructor.promiseDelayMs)
      .catch(ex => {
        console.warn(ex);
        if (!this.isUnMounted) {
          // todo  const formError = this.props.catchResponse && this.props.catchResponse(ex);
          //   if (formError) {
          //     this.setState({ formError });
          //   }
        }
      })
      .finally(() => {
        this.isWaitSubmitFinished = false;
        // todo success message ?
        !this.isUnMounted && this.setState({ isPending: false });
      });
  };

  componentWillUnmount(): void {
    this.isUnMounted = true;
    FormsStore.removeForm(this);
  }

  renderTitle = (title: string | Core.Element): Core.Element => {
    return <h2>{title}</h2>;
  };

  renderButtonSubmit = (defProps: ButtonSubmitProps, textSubmit: string | Core.Element): Core.Element => {
    return (
      // eslint-disable-next-line react/button-has-type, react/jsx-props-no-spreading
      <button {...defProps}>{textSubmit}</button>
    );
  };

  renderButtonsGroup = (buttonSubmit: Core.Element): Core.Element => {
    return <div>{buttonSubmit}</div>;
  };

  // todo it can be a big object and complex component
  renderError = (msg: string): Core.Element => {
    return <div>{msg}</div>;
  };

  render(): Core.Element {
    // todo ability to redefine-renderForm
    return (
      <form
        className={this.props.className}
        onSubmit={this.onSubmit}
        ref={this.setDomEl}
        autoComplete={this.props.autoComplete || this.constructor.defaultProps.autoComplete}
        noValidate
      >
        {this.props.title ? this.renderTitle(this.props.title) : null}
        {this.props.children}
        {this.state.error ? this.renderError(this.state.error) : null}
        {this.renderButtonsGroup(
          this.renderButtonSubmit(
            {
              type: "submit"
              // onBlur={this.handleBtnBlur}
              // disabled={this.props.disabled}
              // isPending={this.state.isPending}
            },
            this.props.textSubmit || (this.constructor.defaultProps.textSubmit as string)
          )
        )}
      </form>
    );
  }
}
