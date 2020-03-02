import Core from "../core";
import BaseInput, { BaseInputProps } from "../inputs/baseInput";
import FormInputsCollection from "./formInputsCollection";

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

function PromiseWait<T>(promise: Promise<T>, ms = 400): Promise<T> {
  return new Promise(resolve => {
    return setTimeout(() => resolve(promise), ms);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isInputChildren<T>(node: Core.Node | Core.Node[], input: BaseInput<T, BaseInputProps<T>, any>): boolean {
  if (Array.isArray(node)) {
    return node.some(nodeChild => isInputChildren(nodeChild, input));
  }
  if (!node) {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const type = (node as Core.Element)?.type as any | { prototype: unknown };
  if (!type) {
    return false;
  }
  if (!(type?.prototype instanceof BaseInput)) {
    return false;
  }
  if (type === input.constructor) {
    const { props } = node as Core.Element;
    if (props && input.props && props.name === input.props.name) {
      return true;
    }
  }
  return false;
}

// todo do we need export?
export type ButtonSubmitProps = {
  type: "submit";
};

export default class Form<ModelType> extends Core.Component<FormProps<ModelType>, FormState> {
  // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
  ["constructor"]: typeof Form;

  static promiseDelayMs: 400;
  static isValidateUntilFirstError: true;
  static errOneRequired: "At least one value is required";
  // react.defaultProps works with > ver16.4.6
  static defaultProps: Partial<FormProps<unknown>> = {
    autoComplete: "off", // todo check if defaultProps works
    textSubmit: "SUBMIT"
  };

  isUnMounted = false;
  domEl: HTMLFormElement | undefined;
  setDomEl = (el: HTMLFormElement): void => {
    this.domEl = el;
  };

  /**
   * Input adds itself to collection via FormInputsCollection
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: BaseInput<unknown, any, any>[] = [];

  isWaitSubmitFinished = false;
  state: FormState = {
    isPending: false,
    error: undefined
  };

  constructor(props: FormProps<ModelType>) {
    super(props);
    // todo if props.initModel is changed => update inputs
    FormInputsCollection.registerForm(this);
  }

  getInitValue<ValueType>(name: string): ValueType | undefined {
    if (this.props && this.props.initModel) {
      // @ts-ignore
      return this.props.initModel[name] as ValueType;
    }
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isInputChildren<ModelValueType>(input: BaseInput<ModelValueType, BaseInputProps<ModelValueType>, any>): boolean {
    return isInputChildren(this.props.children, input);
  }

  validate = (): ModelType | false => {
    const model = {} as ModelType;
    let hasError = false;

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
        const key = input.props?.name;
        // todo option: don't attach notRequired&emptyValues
        // todo option: don't attach valuesThatWasn't changed
        // @ts-ignore
        if (key) model[key] = input.value;
      }
    }

    if (hasError) return false;

    if (!Object.keys(model).length) {
      // todo onErrorEvent
      this.setState({ error: this.constructor.errOneRequired });
      return false;
    }

    return model;
  };

  onSubmit = (e: Core.FormEvent): void => {
    e.preventDefault();

    if (this.isWaitSubmitFinished) {
      return;
    }

    const { onValidSubmit } = this.props;
    if (!onValidSubmit) {
      console.warn("WebUIPack.Form: props.onValidSubmit is not attached");
      return;
    }

    const validateResult = this.validate();
    if (validateResult === false) {
      return;
    }

    const result = onValidSubmit(validateResult);
    const isPromise = result instanceof Promise;
    if (!isPromise) {
      return;
    }

    this.isWaitSubmitFinished = true;
    PromiseWait(result, this.constructor.promiseDelayMs)
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
    FormInputsCollection.removeForm(this);
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
