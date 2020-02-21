import Core from "../core";
import BasicInput from "../inputs/basicInput";
import FormInputsCollection from "./formInputsCollection";

export type FormProps<ModelType> = {
  className: string;
  autoComplete: "on" | "off";
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

function isInputChildren<T>(node: Core.Node | Core.Node[], input: BasicInput<T>): boolean {
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
  if (!(type?.prototype instanceof BasicInput)) {
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
  static promiseDelayMs: 400;
  static isValidateUntilFirstError: true;
  static errOneRequired: "At least one value is required";

  isUnMounted = false;
  domEl: HTMLFormElement | undefined;
  setDomEl = (el: HTMLFormElement): void => {
    this.domEl = el;
  };

  /**
   * Input adds itself to collection via FormInputsCollection
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: BasicInput<any>[] = [];

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

  isInputChildren<ModelValueType>(input: BasicInput<ModelValueType>): boolean {
    return isInputChildren(this.props.children, input);
  }

  validate = (): ModelType | false => {
    const model = {} as ModelType;
    let hasError = false;

    const { inputs } = this;
    for (let i = 0; i < inputs.length; ++i) {
      const input = inputs[i];
      const v = input.validate();
      if (v === false) {
        hasError = true;
        if (Form.isValidateUntilFirstError) {
          break;
        }
      } else {
        // todo nested name as obj.some.name without lodash
        const key = input.props?.name;
        // todo option: don't attach notRequired&emptyValues
        // todo option: don't attach valuesThatWasn't changed
        // @ts-ignore
        if (key) model[key] = v;
      }
    }

    if (hasError) return false;

    if (!Object.keys(model).length) {
      // todo onErrorEvent
      this.setState({ error: Form.errOneRequired });
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
    PromiseWait(result, Form.promiseDelayMs)
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

  // todo does it makes sense: in 90% percent it will be overrided
  renderTitle = (title: string | Core.Element): Core.Element => {
    return <h3>{title}</h3>;
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
        autoComplete={this.props.autoComplete || "off"}
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
            this.props.textSubmit ?? "SUBMIT"
          )
        )}
      </form>
    );
  }
}
