/* eslint-disable no-continue */
import Core from "../core";
import { BaseControl, BaseControlProps } from "../controls/baseControl";
import FormsStore from "./formsStore";
import promiseWait from "../helpers/promiseWait";
import nestedProperty from "../helpers/nestedProperty";
import { BaseComponent, BaseComponentProps } from "../baseComponent";

export interface FormProps<ModelType> extends Omit<BaseComponentProps, "autoFocus"> {
  /** Html attribute; Default: "off" */
  autoComplete?: "on" | "off";
  title?: string | Core.Element;
  /** Text or Component for button-submit; Default: "SUBMIT" */
  textSubmit?: string | Core.Element;
  /** Model that attached to controls via control.props.name */
  initModel?: ModelType;
  /**
   * Submit event that is fired if form is valid and provides model based on props.name of each control inside the form
   * - If you return string or Promise type of Promise.then(v:string).catch(v:string | {message:string} | Error)
   * in this case success-window will be opened with this message
   * - If you return Promise then spinner (loader) will be shown
   */
  onValidSubmit: (model: ModelType) => string | Promise<string | { message: string }>;
  /**
   * Provide onValidSubmit(model) only with changed values (skip model[props] that wasn't changed);
   * Default: false
   */
  isCollectOnlyChanges?: boolean;
}

export interface FormState {
  isPending: boolean;
  error?: string;
  success?: string;
}

// todo do we need export?
export type ButtonSubmitProps = {
  type: "submit";
};

export class Form<ModelType> extends BaseComponent<FormProps<ModelType>, FormState> {
  // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
  // @ts-ignore
  ["constructor"]: typeof Form;

  /** @inheritdoc */
  static excludedRenderProps: Readonly<Array<keyof (FormProps<unknown> & BaseComponentProps)>> = [
    "initModel",
    "onValidSubmit",
    "isCollectOnlyChanges",
    ...BaseComponent.excludedRenderProps // autoFocus is useless but removing is overhelmed
  ];

  /**
   * Min timeout before promise from onValidSubmit will resolved;
   * usefull for avoiding blinking of loader-spinner when promise resolves very fast
   * used web-ui-pack/helpers/promiseWait under the hood;
   * Default: 400 ms
   */
  static promiseDelayMs = 400;
  /**
   * Set true for skipping validation for other controls when found first invalid control;
   * Default: true
   */
  static isValidateUntilFirstError = true;
  /** ErrorMessage when an all control are empty */
  static errOneRequired = "At least one value is required";
  /**
   * Provide onValidSubmit(model) without notRequired Null-values (via control.isEmpty)
   * Default: false
   */
  static isSkipNotRequiredNulls = false;

  // react.defaultProps works with > ver16.4.6
  static defaultProps: Partial<FormProps<unknown>> = {
    autoComplete: "off",
    textSubmit: "SUBMIT"
  };
  /** Controls that the form has as a child; adds automatically via web-ui-pack/FormsStore when control-constructor is fired */
  controls: BaseControl<any, BaseControlProps<any>, any>[] = [];
  // todo provide method resetForm()

  _isUnMounted = false;
  _isWaitSubmitFinished = false;
  state: FormState = {
    isPending: false
  };

  constructor(props: FormProps<ModelType>) {
    super(props);
    FormsStore.registerForm(this);

    this.getInitValue = this.getInitValue.bind(this);
    this.setError = this.setError.bind(this);
    this.validate = this.validate.bind(this);
    this.tryShowSubmitResult = this.tryShowSubmitResult.bind(this);
    this.submit = this.submit.bind(this);
    this.renderTitle = this.renderTitle.bind(this);
    this.renderButtonSubmit = this.renderButtonSubmit.bind(this);
    this.renderButtonsGroup = this.renderButtonsGroup.bind(this);
    this.renderMessage = this.renderMessage.bind(this);
  }

  /** Get initValue for control by pointed name */
  getInitValue<ValueType>(name: string): ValueType | undefined {
    if (this.props && this.props.initModel) {
      return nestedProperty.get<ModelType, ValueType>(this.props.initModel, name);
    }
    return undefined;
  }

  setError(error: string | undefined) {
    if (error !== this.state.error) {
      this.setState({ error });
    }
  }

  validate(): ModelType | false {
    const model = {} as ModelType;
    let hasError = false;
    let isAllEmpty = true;

    const { controls: inputs } = this;
    for (let i = 0; i < inputs.length; ++i) {
      const input = inputs[i];
      const isValid = input.validate();
      if (isValid === false) {
        hasError = true;
        if (this.constructor.isValidateUntilFirstError) {
          break;
        }
      } else {
        const key = input.props.name;
        if (key) {
          if (this.props.isCollectOnlyChanges && !input.isChanged) {
            continue;
          }
          const { value, isEmpty } = input;
          if (isEmpty) {
            if (this.constructor.isSkipNotRequiredNulls && !input.isRequired) {
              continue;
            }
          } else {
            isAllEmpty = false;
          }
          nestedProperty.set(model, key, value);
        }
      }
    }
    if (hasError) {
      // disable form-error because input has one
      this.setError(undefined);
      return false;
    }
    if (isAllEmpty) {
      this.setError(this.constructor.errOneRequired);
      return false;
    }

    return model;
  }

  /**
   * Show submit result if got a message; see props.onValidSubmit for details
   */
  tryShowSubmitResult(success?: any, error?: any): void {
    const newState: FormState = { isPending: false, success: undefined, error: undefined };
    if (success && typeof success === "string") {
      newState.success = success;
    } else if (error) {
      if (error && typeof error === "string") {
        newState.error = error;
      } else if (error.message && typeof error.message === "string") {
        newState.error = error.message;
      }
    }
    if (newState.success || newState.error) {
      this.setState(newState);
    }
  }
  /**
   * Submit event that validates inputs, collect model and fires props.onValidSubmit
   */
  submit(e: Core.FormEvent): void {
    e.preventDefault();

    if (this._isWaitSubmitFinished) {
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

    // todo tryCatch here for providing error
    // todo after submit we must reset changes
    const result = onValidSubmit(validateResult);
    const isPromise = result instanceof Promise;
    if (!isPromise) {
      this.tryShowSubmitResult(result);
      return;
    }

    this._isWaitSubmitFinished = true;
    this.setState({ isPending: true, error: undefined, success: undefined });

    promiseWait(result as Promise<any>, this.constructor.promiseDelayMs)
      .then(v => {
        if (!this._isUnMounted) {
          this.tryShowSubmitResult(v);
        }
        return v;
      })
      .catch((ex: Error | string) => {
        console.error(ex);
        if (!this._isUnMounted) {
          this.tryShowSubmitResult(undefined, ex);
        }
      })
      .finally(() => {
        this._isWaitSubmitFinished = false;
        if (!this._isUnMounted && this.state.isPending) {
          this.setState({ isPending: false });
        }
      });
  }

  componentWillUnmount(): void {
    this._isUnMounted = true;
    FormsStore.removeForm(this);
  }

  /** @inheritdoc */
  shouldComponentUpdate(
    nextProps: Readonly<FormProps<ModelType>>,
    nextState: Readonly<FormState>,
    nextContext: any
  ): boolean {
    // try to update init value if it's not changed
    if (nextProps.initModel !== this.props.initModel) {
      const prevProps = this.props;

      this.controls.forEach(ctrl => {
        if (!ctrl.isChanged && ctrl.props.initValue === undefined) {
          // @ts-ignore
          this.props = nextProps;
          const nextValue = ctrl.getInitValue(ctrl.props);
          ctrl.setValue(nextValue, undefined, true);
          // @ts-ignore
          this.props = prevProps;
        }
      });
    }

    // otherwise use base logic
    return super.shouldComponentUpdate(nextProps, nextState, nextContext);
  }

  renderTitle(title: string | Core.Element): Core.Element {
    return <h2>{title}</h2>;
  }

  renderButtonSubmit(defProps: ButtonSubmitProps, textSubmit: string | Core.Element): Core.Element {
    // eslint-disable-next-line react/button-has-type
    return <button {...defProps}>{textSubmit}</button>;
  }

  renderButtonsGroup(buttonSubmit: Core.Element): Core.Element {
    return <div>{buttonSubmit}</div>;
  }

  // todo popup window for this case
  renderMessage(msg: string, isError: boolean): Core.Element {
    return <div>{msg}</div>;
  }

  render(): Core.Element {
    // todo ability to redefine-renderForm
    const msg = this.state.error || this.state.success;
    return (
      <form
        className={this.props.className}
        onSubmit={this.submit}
        ref={this.setDomEl}
        autoComplete={this.props.autoComplete || this.constructor.defaultProps.autoComplete}
        noValidate
      >
        {this.props.title ? this.renderTitle(this.props.title) : null}
        {this.props.children}
        {msg ? this.renderMessage(msg, !!this.state.error) : null}
        {this.renderButtonsGroup(
          this.renderButtonSubmit(
            {
              type: "submit"
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
