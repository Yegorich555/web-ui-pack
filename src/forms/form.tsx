import Core from "../core";
import BasicInput from "../inputs/basicInput";

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
  error: string;
}

function PromiseWait<T>(promise: Promise<T>, ms = 400): Promise<T> {
  return new Promise(resolve => {
    return setTimeout(() => resolve(promise), ms);
  });
}

export type ButtonSubmitProps = {
  type: "submit";
  formNoValidate: boolean;
};

export default class Form<ModelType> extends Core.Component<FormProps<ModelType>, FormState> {
  static promiseDelayMs: 400;

  static isValidateUntilFirstError: true;

  static errOneRequired: "At least one value is required";

  /* eslint-disable lines-between-class-members */
  domEl: HTMLFormElement;
  setDomEl = (el: HTMLFormElement): void => {
    this.domEl = el;
  };

  isWaitSubmitFinished = false;
  isUnMounted = false;
  /* eslint-enable lines-between-class-members */

  /* eslint-disable lines-between-class-members */
  _prevChildren: Core.Node;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _prevInputs: BasicInput<any>[];

  // todo inject initValue from initModel (detect that children was updated in this case)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get inputs(): BasicInput<any>[] {
    const { children } = this.props;
    if (this._prevChildren === children) {
      return this._prevInputs;
    }
    this._prevChildren = children;

    const arrInputs = [];
    function recursiveSearch(items: Core.Node): void {
      Core.forEachChildren<Core.Node>(items, child => {
        if (child instanceof BasicInput) {
          arrInputs.push(child);
        } else {
          recursiveSearch(child);
        }
      });
    }
    recursiveSearch(children);
    // todo check input.props.name existance
    this._prevInputs = arrInputs;
    return arrInputs;
  }
  /* eslint-enable lines-between-class-members */

  // todo
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
        // todo option: don't attach emptyValues
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
      console.warn("WebUIPack.BaseForm: props.onValidSubmit is not attached");
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
  }

  renderTitle = (title: string | Core.Element): Core.Element => {
    return <h3>{title}</h3>;
  };

  renderButtonSubmit = (defProps: ButtonSubmitProps, textSubmit: string | Core.Element): Core.Element => {
    return (
      // eslint-disable-next-line react/button-has-type
      <button
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...defProps}
        // onBlur={this.handleBtnBlur}
        // disabled={this.props.disabled}
        // isPending={this.state.isPending}
      >
        {textSubmit || "SUBMIT"}
      </button>
    );
  };

  renderButtonsGroup = (buttonSubmit: Core.Element): Core.Element => {
    return <div>{buttonSubmit}</div>;
  };

  renderError = (msg: string): Core.Element => {
    return <div>{msg}</div>;
  };

  render(): Core.Element {
    return (
      <form
        className={this.props.className}
        onSubmit={this.onSubmit}
        ref={this.setDomEl}
        autoComplete={this.props.autoComplete}
      >
        {this.props.title ? this.renderTitle(this.props.title) : null}
        {this.props.children}
        {this.state.error ? this.renderError(this.state.error) : null}
        {this.renderButtonsGroup(
          this.renderButtonSubmit(
            {
              type: "submit",
              formNoValidate: true
            },
            this.props.textSubmit
          )
        )}
      </form>
    );
  }
}
