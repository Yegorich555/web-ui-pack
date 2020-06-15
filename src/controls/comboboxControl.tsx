/* eslint-disable max-classes-per-file */
import Core from "../core";
import {
  BaseControl, //
  BaseControlValidations,
  BaseControlProps,
  BaseControlState
} from "./baseControl";
import { ValidationMessages } from "./validation";
import focusFirst from "../helpers/focusFirst";

export class ComboboxValidations<TValue> extends BaseControlValidations<TValue> {
  required = {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    test: (v?: TValue) => !ComboboxControl.isEmpty(v),
    msg: ValidationMessages.required
  };
}

export type ComboboxOption = {
  value: any;
  text: string;
};

type HtmlInputProps = BaseControlProps<any>["htmlInputProps"];

export interface ComboboxControlProps<TValue> extends BaseControlProps<TValue> {
  htmlInputProps?: Pick<
    HtmlInputProps,
    Exclude<
      keyof HtmlInputProps,
      | "onFocus"
      | "autoComplete"
      | "aria-autocomplete"
      | "aria-activedescendant"
      | "role"
      | "aria-expanded"
      | "aria-owns"
      | "aria-controls"
      | "aria-haspopup"
    >
  >;
  options?: ComboboxOption[];
}

const enum SelectDirection {
  first,
  last,
  next,
  previous,
  current
}

export interface ComboboxControlState<TValue> extends BaseControlState<TValue> {
  isOpen: boolean;
  inputValue?: string;
  select: SelectDirection;
}

export class ComboboxControl<
  TValue,
  Props extends ComboboxControlProps<TValue>,
  State extends ComboboxControlState<TValue>
> extends BaseControl<TValue, Props, State> {
  // @ts-ignore
  ["constructor"]: typeof ComboboxControl;

  /** @inheritdoc */
  static excludedRenderProps: Readonly<Array<keyof ComboboxControlProps<unknown>>> = [
    "options",
    ...BaseControl.excludedRenderProps
  ];

  /** Text for listbox when displayed no items */
  static textNoItems: string | undefined = "No Items";
  /** Aria-label for arrow-button when need to show options */
  static textAriaBtnShow: string | undefined = "Show options";
  /** Aria-label for arrow-button when need to hide options */
  static textAriaBtnHide: string | undefined = "Hide options";

  /** ESC-key behavior: set @false for reset to initValue; set @true for clearing value; Default: true */
  static shouldEscClear = true;

  /** @inheritdoc */
  static isEmpty<TValue>(v: TValue): boolean {
    return v === undefined;
  }

  /** @inheritdoc */
  static returnEmptyValue: string | null | undefined = undefined;

  /** @inheritdoc */
  static defaultInitValue = undefined;

  /** @inheritdoc */
  static defaultValidations = new ComboboxValidations<any>();

  /** Returns unique id-attribute for the listbox (popup-menu) */
  static getUniqueListboxId(inputId: string | undefined): string {
    return `lb${inputId || ""}`;
  }

  /** Filter-callback-function for options.filter by inputValue; Default option.text?.toLowerCase().startsWith(inputValueLowCase) */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static filterOptions(option: ComboboxOption, inputValueLowCase: string, inputValue: string): boolean {
    return option.text?.toLowerCase().startsWith(inputValueLowCase);
  }

  /**
   * Returns id-attribute for every list-option. It always must return the same id for the same option.
   * Note: @index refer to the real order in props.options
   */
  static getOptionId(option: ComboboxOption, index: number) {
    return `li${index}`;
  }

  private _selectedItem: { id: string; index: number } | undefined;
  private _userClearedInput = false;

  constructor(props: Props) {
    super(props);
    this.state.isOpen = false;
    this.renderPopup = this.renderPopup.bind(this);
    this.renderPopupContent = this.renderPopupContent.bind(this);
    this.handleInputFocus = this.handleInputFocus.bind(this);
    this.handleMenuClick = this.handleMenuClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.closePopup = this.closePopup.bind(this);
    this.setValueAndClose = this.setValueAndClose.bind(this);
    this.handleButtonMenuClick = this.handleButtonMenuClick.bind(this);
  }

  get options(): ComboboxOption[] {
    return (this.props.options as ComboboxOption[]) || [];
  }

  handleButtonMenuClick(): void {
    focusFirst(this.domEl as HTMLElement);
    const { isOpen } = this.state;
    if (!isOpen) {
      this.setState({ isOpen: true, select: SelectDirection.current });
    } else {
      this.setValueAndClose(this.state.value);
    }
  }

  /** Close popup and clear local-state */
  closePopup() {
    this._selectedItem = undefined;
    this.setState({ isOpen: false, inputValue: undefined });
  }

  /**
   * Function is fired when popup isClosing and we must select value;
   * @return true if isValid
   */
  setValueAndClose(value: TValue): boolean {
    this.closePopup();
    return this.setValue(value);
  }

  /** @inheritdoc */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onFocusLeft(inputValue: string): void {
    let v = this.state.value;
    if (this.state.isOpen) {
      v = this._selectedItem ? this.options[this._selectedItem.index].value : this.constructor.defaultInitValue;
      this.closePopup();
    }
    super.onFocusLeft(v);
  }

  /** @inheritdoc */
  handleInputChange(e: Core.DomChangeEvent): void {
    // we don't use default logic because input-changing makes effect only on search
    const inputValue = e.target.value.trimStart();
    if (inputValue !== this.state.inputValue || !this.state.isOpen) {
      this.setState({ inputValue, isOpen: true, select: SelectDirection.first });
    }
  }

  /** onFocus event of the input */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleInputFocus(e: Core.DomChangeEvent): void {
    if (!this.state.isOpen) {
      this.setState({ isOpen: true, select: SelectDirection.first });
    }
  }

  /* onKeyDown event of the control */
  handleKeyDown(e: Core.DomKeyboardEvent): void {
    type NS = Pick<State, keyof State>;
    let nextState: NS | null = null;
    if (e.keyCode === 38) {
      // up
      const select = this._selectedItem ? SelectDirection.previous : SelectDirection.last;
      nextState = { select, isOpen: true } as NS;
    } else if (e.keyCode === 40) {
      // down
      const select = this._selectedItem ? SelectDirection.next : SelectDirection.first;
      nextState = { select, isOpen: true } as NS;
    } else if (e.keyCode === 36) {
      // home
      if (this.state.isOpen) {
        nextState = { select: SelectDirection.first } as NS;
      }
    } else if (e.keyCode === 35) {
      // end
      if (this.state.isOpen) {
        nextState = { select: SelectDirection.last } as NS;
      }
    } else if (e.keyCode === 13) {
      // enter
      if (this.state.isOpen) {
        e.preventDefault();
        const v = this._selectedItem ? this.options[this._selectedItem.index].value : this.constructor.defaultInitValue;
        this.setValueAndClose(v);
      }
      return;
    } else if (e.keyCode === 27) {
      // esc
      e.preventDefault();
      const rstValue = this.constructor.shouldEscClear
        ? this.constructor.defaultInitValue
        : this.getInitValue(this.props);
      this.setValueAndClose((rstValue as unknown) as TValue);
      return;
    }

    if (nextState) {
      e.preventDefault();
      this.setState(nextState);
    }
  }

  // onClick event of the popup
  handleMenuClick(e: Core.DomMouseEvent): void {
    focusFirst(this.domEl as HTMLElement);
    const { id } = e.target as HTMLElement;

    if (id) {
      const option = this.options.find((o, i) => this.constructor.getOptionId(o, i) === id);
      if (!option) {
        console.warn(
          "ComboboxControl. Impossible to find option. Constructor.getOptionId(option, index) must be pure-function"
        );
      }
      this.setValueAndClose(option?.value);
    }
  }

  /** @inheritdoc */
  componentDidUpdate() {
    const selectedItem = this._selectedItem && this.domEl?.querySelector(`#${this._selectedItem.id}`);
    if (selectedItem) {
      if (selectedItem.scrollIntoViewIfNeeded) selectedItem.scrollIntoViewIfNeeded(false);
      else selectedItem.scrollIntoView();
    }
  }

  /** @inheritdoc */
  shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<State>, nextContext: any): boolean {
    this._userClearedInput =
      nextState.inputValue === "" && this.state.inputValue != null && !!this.state.inputValue.length;

    // otherwise use base logic
    return super.shouldComponentUpdate(nextProps, nextState, nextContext);
  }

  /** Override this method for customizing popupContent-rendering */
  renderPopupContent(options: ComboboxOption[], inputValue: string | undefined): Core.Element[] {
    const createProps = (o: ComboboxOption, i: number) => ({
      props: {
        id: this.constructor.getOptionId(o, i),
        key: i,
        role: "option",
        "aria-selected": false
      } as Core.HTMLLiProps,
      text: o.text || o.value
    });

    let itemArgs = [] as { props: Core.HTMLLiProps; text: any }[];
    if (!inputValue) {
      itemArgs = options.map(createProps);
    } else {
      const vLower = inputValue.toLowerCase();
      options.forEach((o, i) => {
        if (this.constructor.filterOptions(o, vLower, inputValue as string)) {
          itemArgs.push(createProps(o, i));
        }
      });
    }

    // focus-selected behavior for menu-items
    if (this._userClearedInput) {
      this._selectedItem = undefined;
    } else if (itemArgs.length) {
      let i = 0;
      const last = itemArgs.length - 1;
      if (this.state.select === SelectDirection.first) {
        i = 0;
      } else if (this.state.select === SelectDirection.last) {
        i = last;
      } else if (this.state.select === SelectDirection.current) {
        i = options.findIndex(v => v.value === this.state.value);
        if (i === -1) {
          i = 0;
          if (!this.isEmpty) {
            console.error(
              `Combobox. Current value '${this.state.value}' doesn't match with options`,
              this.props.options
            );
          }
        }
      } else {
        i = this._selectedItem?.index || 0;
        if (this.state.select === SelectDirection.previous) {
          if (--i < 0) {
            i = last;
          }
        } else if (this.state.select === SelectDirection.next) {
          if (++i > last) {
            i = 0;
          }
        }
      }
      itemArgs[i].props["aria-selected"] = true;
      this._selectedItem = { id: itemArgs[i].props.id as string, index: itemArgs[i].props.key as number };
    } else {
      this._selectedItem = undefined;
      if (this.constructor.textNoItems) {
        return [
          <li key={-1} role="option" aria-selected={false} aria-disabled>
            {this.constructor.textNoItems}
          </li>
        ];
      }
    }
    return itemArgs.map(v => <li {...v.props}>{v.text}</li>);
  }

  /** Override this method for customizing popup-rendering */
  renderPopup(id: string): Core.Element {
    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      <ul id={id} role="listbox" onClick={this.handleMenuClick}>
        {this.renderPopupContent(this.options, this.state.inputValue)}
      </ul>
    );
  }

  /** @inheritdoc */
  getControlProps(isRequired: boolean): Core.HTMLDivProps {
    const p = super.getControlProps(isRequired);
    p.onKeyDown = this.handleKeyDown;
    return p;
  }

  /** @inheritdoc */
  getInputValue(value: TValue): string {
    if (this.state.inputValue != null) {
      return this.state.inputValue;
    }
    if (value === undefined) {
      return "";
    }
    const curOption = this.options.find(op => op.value === value);
    if (curOption && curOption.text) {
      return curOption.text;
    }
    console.warn(`ComboboxControl. The value [${value}] is not found among the props.options [${this.props.options}]`);
    return "";
  }

  /** @inheritdoc */
  renderInput(defProps: Core.HTMLAttributes<HTMLInputElement>): Core.Element {
    const listboxId = this.constructor.getUniqueListboxId(defProps.id);

    return (
      // @ts-ignore
      <>
        <label htmlFor={defProps.id}>
          <span>{this.props.label}</span>
          <input
            {...defProps}
            onFocus={this.handleInputFocus}
            autoComplete="off" // todo maybe "new-password"
            aria-autocomplete="list"
            aria-activedescendant={this._selectedItem?.id}
            role="combobox"
            aria-expanded={this.state.isOpen}
            aria-owns={listboxId} // ARIA 1.1 combobox pattern
            aria-controls={listboxId} // ARIA 1.0 combobox pattern
            aria-haspopup="listbox"
          />
          <button
            type="button"
            onClick={this.handleButtonMenuClick}
            // prevents focus-behavior
            onMouseDown={e => e.preventDefault()}
            tabIndex={-1}
            aria-label={this.state.isOpen ? this.constructor.textAriaBtnShow : this.constructor.textAriaBtnShow}
          />
        </label>
        {this.state.isOpen ? this.renderPopup(listboxId) : null}
      </>
    );
  }
}
