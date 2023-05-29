import MaskTextInput from "./text.mask";
import { onEvent } from "../indexHelpers";
import { WUPcssIcon } from "../styles";
import WUPBaseControl, { SetValueReasons } from "./baseControl";

const emailReg =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const tagName = "wup-text";

declare global {
  namespace WUP.Text {
    interface EventMap extends WUP.BaseControl.EventMap {}
    interface ValidityMap extends WUP.BaseControl.ValidityMap {
      /** If textLength < pointed shows message 'Min length is {x} characters` */
      min: number;
      /** If textLength > pointed shows message 'Max length is {x} characters` */
      max: number;
      /** If $value doesn't match email-pattern shows message 'Invalid email address` */
      email: boolean;
      /** If input value doesn't completely fit pointed mask shows pointed message
       * @default "Incomplete value"
       * @Rules
       * * enabled by default with $options.mask
       * * excluded from listing (for $options.validationShowAll)
       * * ignores control value, instead it uses `this.refMask` state based on `$refInput.value`
       *  */
      _mask: string;
      /** If parseInput() throws exception during the input-change is wrong then pointed message shows
       * @default "Invalid value"
       * @Rules
       * * processed only by input change (not value-change)
       * * removed by focusout (because input rollback to previous valid value)
       * * excluded from listing (for $options.validationShowAll) */
      _parse: string;
    }
    interface Defaults<T = string, VM = ValidityMap> extends WUP.BaseControl.Defaults<T, VM> {
      /** Debounce time to wait for user finishes typing to start validate and provide $change event
       * @defaultValue 0; */
      debounceMs?: number;
      /** Select whole text when input got focus (when input is not readonly and not disabled);
       * @defaultValue false */
      selectOnFocus: boolean;
      /** Show/hide clear button
       * @see {@link ClearActions} from `web-ui-pack/baseControl`
       * @defaultValue true */
      clearButton: boolean;
    }

    interface Options<T = string, VM = ValidityMap> extends WUP.BaseControl.Options<T, VM>, Defaults<T, VM> {
      /** Make input masked
       * @rules when mask is pointed and contains only numeric vars
       * * inputmode='numeric' so mobile device show numeric-keyboard
       * * enables validation 'mask' with error message 'Incomplete value'
       * @example
       * "0000-00-00" // for date in format yyyy-mm-dd
       * "##0.##0.##0.##0" // IPaddress
       * "+1(000) 000-0000" // phoneNumber
       * "00:00 /[AP]/M" // time hh:mm AM/PM
       * '0' // required digit
       * '#' // optional digit
       * '*' // any char
       * '*{1,5}' // - any 1..5 chars
       * '//[a-zA-Z]//' // regex: 1 letter (WARN: regex must be pointed for checkin only 1 char at once)
       * '//[a-zA-Z]//{1,5}' // regex: 1..5 letters
       * '|0' // or '\x00' - static char '0'
       * '|#' // or '\x01' - static char '#'
       * '|*' // or '\x02' - static char '*'
       * '|/' // or '\x03' - static char '/'
       * */
      mask?: string;
      /** Placeholder for mask. By default it inherits from mask. To disabled it set 'false' or '' (empty string);
       *  for date maskholder can be 'yyyy-mm-dd' */
      maskholder?: string | false;
      /** Part before input; for example for value "$ 123 USD" prefix is "$ " */
      prefix?: string;
      /** Part after input; for example for value "$ 123 USD" prefix is " USD" */
      postfix?: string;
    }

    interface Attributes
      extends WUP.BaseControl.Attributes,
        Pick<Options, "mask" | "maskholder" | "prefix" | "postfix"> {}

    interface JSXProps<C = WUPTextControl> extends WUP.BaseControl.JSXProps<C>, Attributes {}
    interface GotInputEvent extends InputEvent {
      target: HTMLInputElement;
      // /** Call it to prevent calling setValue by input event */
      // preventSetValue: () => void;
      // /** Returns a boolean value indicating whether or not the call to InputEvent.preventSetValue() */
      // setValuePrevented: boolean;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPTextControl; // add element to document.createElement
  }
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with text input
       *  @see {@link WUPTextControl} */
      [tagName]: WUP.Text.JSXProps; // add element to tsx/jsx intellisense
    }
  }
}

/** Form-control with text-input
 * @example
  const el = document.createElement("wup-text");
  el.$options.name = "email";
  el.$options.validations = { required: true, max: 100, email: true };
  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-text name="firstName" initvalue="Donny" validations="myValidations"/>
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <input/>
 *      <strong>{$options.label}</strong>
 *   </span>
 *   <button clear/>
 * </label>
 */
export default class WUPTextControl<
  ValueType = string,
  EventMap extends WUP.Text.EventMap = WUP.Text.EventMap
> extends WUPBaseControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextControl;

  static get observedOptions(): Array<string> {
    const arr = super.observedOptions as Array<keyof WUP.Text.Options>;
    arr.push("clearButton", "maskholder", "mask", "prefix", "postfix");
    return arr;
  }

  static get observedAttributes(): Array<string> {
    const arr = super.observedAttributes as Array<LowerKeys<WUP.Text.Attributes>>;
    arr.push("maskholder", "mask", "prefix", "postfix");
    return arr;
  }

  static get $styleRoot(): string {
    return `:root {
      --ctrl-clear-hover: rgba(255,0,0,0.1);
      --ctrl-clear-hover-size: 22px;
     }`;
  }

  static get $style(): string {
    return `${super.$style}
        :host {
          contain: style;
          cursor: text;
        }
        :host label > span {
          width: 100%;
          position: relative;${/* to position <strong /> relative to input */ ""}
          display: flex;
          flex-direction: row-reverse;${/* required for reading <strong /> 1st */ ""}
        }
        :host input,
        :host textarea,
        :host [maskholder],
        :host [prefix],
        :host [postfix] {
          padding: var(--ctrl-padding);
          padding-left: 0;
          padding-right: 0;
          font: inherit;
          color: inherit;
          margin: 0;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        :host input,
        :host textarea,
        :host [contenteditable=true],
        :host [maskholder],
        :host [postfix] {
          width: 100%;
          box-sizing: border-box;
          border: none;
          background: none;
          outline: none;
        }
        :host [prefix],
        :host [postfix] {
          color: var(--ctrl-label);
          flex-shrink: 0;
        }
        :host [maskholder],
        :host [prefix],
        :host [postfix] {
          display: none;
          pointer-events: none;
          text-overflow: initial;
          white-space: pre;
        }
        :host [postfix] {
          position: absolute;
        }
        :host [maskholder] {
          position: absolute;
          opacity: 0.65;
        }
        :host [maskholder]>i,
        :host [postfix]>i {
          visibility: hidden;
          font: inherit;
          white-space: pre;
        }
        :host input:-webkit-autofill,
        :host textarea:-webkit-autofill,
        :host [contenteditable=true]:-webkit-autofill {
          font: inherit;
          -webkit-background-clip: text;
        }
        :host input:autofill,
        :host textarea:autofill,
        :host [contenteditable=true]:autofill {
          font: inherit;
          background-clip: text;
        }
        :host strong {
          display: block;
          position: absolute;
          top: 50%;
          left: 0;
          padding: 0;
          margin: 0;
          box-sizing: border-box;
          max-width: 100%;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          transform-origin: top left;
          transform: translateY(-50%);
          font-weight: normal;
          text-decoration: none;
        }
        @media not all and (prefers-reduced-motion) {
          :host strong {
            transition: top var(--anim), transform var(--anim), color var(--anim);
          }
        }
        :host input:not(:focus)::placeholder,
        :host textarea:not(:focus)::placeholder {
          color: transparent;
        }
        :host:focus-within strong,
        :host input:not(:placeholder-shown) + strong,
        :host textarea:not(:placeholder-shown) + strong,
        :host [contenteditable=true]:not(:empty) + strong,
        :host legend {
          top: 0.2em;
          transform: scale(0.9);
        }
        :host:focus-within [maskholder],
        :host:focus-within [prefix],
        :host:focus-within [postfix],
        :host input:not(:placeholder-shown) ~ [prefix],
        :host input:not(:placeholder-shown) ~ [postfix],
        :host textarea:not(:placeholder-shown) ~ [prefix],
        :host textarea:not(:placeholder-shown) ~ [postfix] {
          display: inline-block;
        }
        /* style for icons */
        :host label button,
        :host label button:after,
        :host label:after,
        :host label:before {
          ${WUPcssIcon}
          -webkit-mask-image: none;
          mask-image: none;
        }
        :host label:after {
          cursor: pointer;
          margin-right: calc(var(--ctrl-icon-size) / -2);
        }
        :host label:before {
          cursor: pointer;
          margin-left: calc(var(--ctrl-icon-size) / -2);
        }
        :host label button {
          contain: strict;
          position: relative;
          z-index: 1;
        }
        :host label>span + button {
          margin-right: -0.5em;
        }
        :host button[clear] {
          background: none;
          align-self: center;
        }
        :host button[clear]:after {
          content: "";
          padding: 0;
          -webkit-mask-image: var(--wup-icon-cross);
          mask-image: var(--wup-icon-cross);
        }
        :host button[clear]:after,
        :host button[clear]:before {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
        }
        :host button[clear]:before {
          width: var(--ctrl-clear-hover-size);
          padding-top: var(--ctrl-clear-hover-size);
        }
        @media (hover: hover) and (pointer: fine) {
          :host button[clear]:hover {
            box-shadow: none;
          }
          :host button[clear]:hover:before {
            content: "";
            border-radius: 50%;
            box-shadow: inset 0 0 0 99999px var(--ctrl-clear-hover);
          }
          :host button[clear]:hover:after {
            background-color: var(--ctrl-err-text);
          }
          :host[readonly] button[clear] {
            pointer-events: none;
          }
        }`;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUP.Text.Defaults = {
    ...WUPBaseControl.$defaults,
    selectOnFocus: false,
    clearButton: true,
    validationRules: {
      ...WUPBaseControl.$defaults.validationRules,
      min: (v, setV) => (v === undefined || v.length < setV) && `Min length is ${setV} characters`,
      max: (v, setV) => (v === undefined || v.length > setV) && `Max length is ${setV} characters`,
      email: (v, setV) => setV && (!v || !emailReg.test(v)) && "Invalid email address",
      _mask: (_v, setV, c) => {
        const { refMask } = c as WUPTextControl;
        // WARN: mask ignores value === undefined otherwise it doesn't work with controls that $value !== input.value
        return !!refMask && refMask.value !== refMask.prefix && !refMask.isCompleted && (setV || "Incomplete value");
      },
      _parse: (_v, setV) => setV || "Invalid value",
    },
  };

  $options: WUP.Text.Options<string> = {
    ...this.#ctr.$defaults,
  };

  protected override _opts = this.$options;

  $refBtnClear?: HTMLButtonElement;
  $refMaskholder?: HTMLSpanElement;
  $refPrefix?: HTMLSpanElement;
  $refPostfix?: HTMLSpanElement;

  constructor() {
    super();

    this.$refInput.placeholder = " ";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override parse(text: string): ValueType | undefined {
    return (text || undefined) as unknown as ValueType;
  }

  /** Called before parseInput on gotInput event */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canParseInput(_text: string): boolean {
    return true;
  }

  /** Called to parse input text to value (related to locale or pointed format) */
  parseInput(text: string): ValueType | undefined {
    return this.parse(text.trim());
  }

  /** Returns true if need to use custom undo/redo (required when input somehow formatted/masked) */
  protected canHandleUndo(): boolean {
    return !!this._opts.mask;
  }

  protected get validations(): WUP.Text.Options["validations"] {
    const vls = (super.validations as WUP.Text.Options["validations"]) || {};
    if (this._opts.mask && vls._mask === undefined) vls._mask = ""; // enable validation mask based on option mask
    if (this._onceErrName === "_parse") vls._parse = "";
    return vls;
  }

  protected override renderControl(): void {
    /* istanbul ignore else */
    if (this.$refInput.type !== "textarea") {
      (this.$refInput as HTMLInputElement).type = "text";
    }
    this.$refInput.id = this.#ctr.$uniqueId;
    this.$refLabel.setAttribute("for", this.$refInput.id);

    const s = this.$refLabel.appendChild(document.createElement("span"));
    s.appendChild(this.$refInput); // input appended to span to allow user user :after,:before without padding adjust
    s.appendChild(this.$refTitle);
    this.appendChild(this.$refLabel);
  }

  /** Create & append element to control */
  protected renderBtnClear(): HTMLButtonElement {
    const bc = document.createElement("button");
    const span = this.$refLabel.querySelector("span");
    if (span!.nextElementSibling) {
      this.$refLabel.insertBefore(bc, span!.nextElementSibling);
    } else {
      this.$refLabel.appendChild(bc);
    }
    bc.setAttribute("clear", "");
    bc.setAttribute("tabindex", -1);
    bc.setAttribute("aria-hidden", true);
    bc.setAttribute("type", "button");
    onEvent(
      bc,
      "click",
      (e) => {
        e.preventDefault(); // prevent from submit
        this.clearValue();
      },
      { passive: false }
    );
    return bc;
  }

  /** Add/update/remove prefix part */
  protected renderPrefix(text: string | undefined): void {
    let el = this.$refPrefix;
    if (!text) {
      if (el) {
        el.remove();
        delete this.$refPrefix;
      }
    } else {
      /* istanbul ignore else */
      if (!el) {
        el = document.createElement("span");
        el.setAttribute("prefix", "");
        this.$refLabel.firstElementChild!.append(el);
        this.$refPrefix = el;
      }
      el.textContent = text;
    }
    // because postfix depends on prefix
    this.renderPostfix(this._opts.postfix);
  }

  /** Add/update or remove prefix part */
  protected renderPostfix(text: string | undefined): void {
    let el = this.$refPostfix;
    if (!text) {
      if (el) {
        el.remove();
        delete this.$refPostfix;
      }
    } else {
      if (!el) {
        el = document.createElement("span");
        el.setAttribute("postfix", "");
        el.appendChild(document.createElement("i"));
        el.append("");
        this.$refLabel.firstElementChild!.append(el);
        this.$refPostfix = el;
      }

      el.firstChild!.textContent =
        (this.$isFocused && this.$refMaskholder?.textContent) ||
        (this.$refPrefix?.textContent || "") + this.$refInput.value;
      el.lastChild!.textContent = text;
    }
  }

  protected override gotFocus(ev: FocusEvent): Array<() => void> {
    const arr = super.gotFocus(ev);

    const r = this.appendEvent(this.$refInput, "input", (e) => {
      // (e as WUP.Text.GotInputEvent).setValuePrevented = false;
      // (e as WUP.Text.GotInputEvent).preventSetValue = () => ((e as WUP.Text.GotInputEvent).setValuePrevented = true);
      this.gotInput(e as WUP.Text.GotInputEvent);
    });
    const r2 = this.appendEvent(
      this.$refInput,
      "beforeinput",
      (e) => this.gotBeforeInput(e as WUP.Text.GotInputEvent),
      { passive: false }
    );

    /* istanbul ignore else */
    if (!this.$refInput.readOnly) {
      let canSelectAll = this._opts.selectOnFocus;
      if (this._opts.mask) {
        this.maskInputProcess(null); // to apply prefix + maskholder
        canSelectAll = canSelectAll && this.refMask!.isCompleted;
        this.renderPostfix(this._opts.postfix);
        if (!canSelectAll) {
          const end = this.$refInput.value.length;
          this.$refInput.setSelectionRange(end, end); // move cursor to the end
        }
      }
      canSelectAll && this.$refInput.select();
    }
    const hasOnlyNums = this.refMask?.chunks.every((c) => !c.isVar || c.pattern[0] !== "*");
    this.setAttr.call(this.$refInput, "inputmode", hasOnlyNums ? "numeric" : "");

    arr.push(() => setTimeout(r)); // timeout required to handle Event on gotFocusLost
    arr.push(r2);
    return arr;
  }

  protected override gotFocusLost(): void {
    this.#declineInputEnd?.call(this);
    if (this.refMask) {
      if (this.refMask.prefix && this.refMask.value === this.refMask.prefix) {
        this.$refInput.value = ""; // rollback prefix/postfix if user types nothing
        delete (this.$refInput as WUP.Text.Mask.HandledInput)._maskPrev;
        setTimeout(() => {
          this.$refInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
        });
      }
      this.renderPostfix(this._opts.postfix); // postfix depends on maskholder
    }
    delete this._histRedo;
    delete this._histUndo;
    super.gotFocusLost();
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Text.Options> | null): void {
    // apply mask options
    this._opts.mask = this.getAttr("mask");
    this._opts.maskholder = this.getAttr("maskholder");
    if (!this._opts.mask || this._opts.mask !== this.refMask?.pattern) {
      delete this.refMask; // delete if mask is removed or changed (it's recovered again on event)
    }
    if (this._opts.mask && this._opts.maskholder == null) {
      this.refMask = this.refMask ?? new MaskTextInput(this._opts.mask, "");
      this._opts.maskholder = this.refMask.chunks.map((c) => c.pattern).join("");
    }

    if ((!this._opts.maskholder || !this._opts.mask) && this.$refMaskholder) {
      this.$refMaskholder.remove();
      delete this.$refMaskholder;
    }

    super.gotChanges(propsChanged as any);

    /* istanbul ignore else */
    if (this._opts.clearButton) {
      this.$refBtnClear = this.$refBtnClear || this.renderBtnClear();
    } else if (this.$refBtnClear) {
      this.$refBtnClear.remove();
      this.$refBtnClear = undefined;
    }
    if (!propsChanged || propsChanged.includes("prefix")) {
      this._opts.prefix = this.getAttr("prefix");
      this.renderPrefix(this._opts.prefix);
    }
    if (!propsChanged || propsChanged.includes("postfix")) {
      this._opts.postfix = this.getAttr("postfix");
      this.renderPostfix(this._opts.postfix);
    }
  }

  protected override gotKeyDown(e: KeyboardEvent): void {
    super.gotKeyDown(e);

    if (this.canHandleUndo()) {
      if (e.altKey) {
        return;
      }

      // otherwise custom redo/undo works wrong (browser stores to history big chunks and not fired events if history emptied)
      const isUndo = (e.ctrlKey || e.metaKey) && e.key === "z";
      const isRedo = ((e.ctrlKey || e.metaKey) && e.key === "Z") || (e.ctrlKey && e.key === "y" && !e.metaKey);
      if (isRedo || isUndo) {
        if (isRedo && !this._histRedo?.length) {
          return;
        }
        if (isUndo && !this._histUndo?.length) {
          return;
        }
        e.preventDefault();
        const inputType = isRedo ? "historyRedo" : "historyUndo";
        setTimeout(() => {
          this.$refInput.dispatchEvent(new InputEvent("beforeinput", { cancelable: true, bubbles: true, inputType })) &&
            setTimeout(() =>
              this.$refInput.dispatchEvent(new InputEvent("input", { cancelable: false, bubbles: true, inputType }))
            );
        });
      }
    }
  }

  /** Handler of 'beforeinput' event */
  protected gotBeforeInput(e: WUP.Text.GotInputEvent): void {
    this.#declineInputEnd?.call(this);

    if (this.canHandleUndo()) {
      switch (e!.inputType) {
        case "historyUndo": // Ctrl+Z
          this.historyUndoRedo(false);
          break;
        case "historyRedo": // Ctrl+Shift+Z
          this.historyUndoRedo(true);
          break;
        default:
          {
            if (!this._histUndo) {
              this._histUndo = [];
            }
            const snap = this.historyToSnapshot(e.target.value, e.target.selectionStart || 0);
            const isChanged = this._histUndo[this._histUndo.length - 1] !== snap;
            isChanged && this._histUndo!.push(snap);
          }
          break;
      }
    }

    if (this._opts.mask) {
      this.refMask = this.refMask ?? new MaskTextInput(this._opts.mask, e.target.value);
      this.refMask.handleBeforInput(e);
    }
  }

  #inputTimer?: ReturnType<typeof setTimeout>;
  /** Called when user types text OR when need to apply/reset mask (on focusGot, focusLost) */
  protected gotInput(e: WUP.Text.GotInputEvent): void {
    const el = e.target as WUP.Text.Mask.HandledInput;
    let txt = el.value;

    /* istanbul ignore else */
    if (this._opts.mask) {
      const prev = el._maskPrev?.value;
      txt = this.maskInputProcess(e);
      if (txt === prev) {
        this.renderPostfix(this._opts.postfix);
        return; // skip because no changes from previous action
      }
    }

    // /* istanbul ignore else */
    // if (e.setValuePrevented) { // use canParse instead
    //   return;
    // }

    const canParse = !txt || this.canParseInput(txt);
    let v = this.$value;
    let errMsg: boolean | string = "";
    /* istanbul ignore else */
    if (canParse) {
      try {
        v = !txt ? undefined : this.parseInput(txt);
      } catch (err) {
        errMsg = (err as Error).message || true;
      }
    }

    this.renderPostfix(this._opts.postfix);

    if (this.#declineInputEnd && (!canParse || errMsg)) {
      return; // don't allow changes if user types wrong char
    }

    const act = (): void => {
      /* istanbul ignore else */
      if (errMsg) {
        this.validateOnce({ _parse: this.validations?._parse || "" }, true);
      } else if (canParse) {
        this.setValue(v, SetValueReasons.userInput, true);
      } else if (this._opts.mask) {
        this.validateOnce({ _mask: this.validations?._mask || "" });
      }
    };

    this._validTimer && clearTimeout(this._validTimer);
    this.#inputTimer && clearTimeout(this.#inputTimer);
    if (this._opts.debounceMs) {
      this.#inputTimer = setTimeout(act, this._opts.debounceMs);
    } else {
      act();
    }
  }

  /** Mask object to proccess mask on input */
  refMask?: MaskTextInput;
  /** Called to apply mask-behavior (on "input" event) */
  protected maskInputProcess(e: WUP.Text.GotInputEvent | null): string {
    const el = this.$refInput;
    const v = el.value;
    const { mask } = this._opts;
    this.refMask = this.refMask ?? new MaskTextInput(mask!, "");
    const mi = this.refMask;

    const isFocused = this.$isFocused;

    if (!v && !isFocused) {
      el.value = v;
      mi.parse(v);
      return v; // ignore mask prefix/postfix if user isn't touched input; it appends only by focusGot
    }

    let declinedAdd = 0;
    let pos = el.selectionStart || 0;
    if (!e) {
      mi.parse(v);
      pos = mi.value.length; // fix case: mask with prefix + call .clearValue()
    } else {
      const r = mi.handleInput(e);
      declinedAdd = r.declinedAdd;
      pos = r.position;
    }

    if (declinedAdd) {
      this._histUndo!.pop();
      this._histUndo!.push(this.historyToSnapshot(mi.value, pos)); // fix when ###: "12|" + "3b" => 123|
      // todo case#1 '|11:15 PM' + '0' => goes to valid '01:15 PM' but declineInput is called
      this.declineInput(pos);
    } else {
      el.value = mi.value;
      document.activeElement === el && el.setSelectionRange(pos, pos); // without checking on focus setSelectionRange sets focus on Safari
    }
    isFocused && this.renderMaskHolder(this._opts.maskholder, mi.leftLength - declinedAdd);

    return mi.value;
  }

  /** Add/update maskholder or skip if it's not defined */
  private renderMaskHolder(text: string | false | undefined, leftLength: number): void {
    if (!text) {
      return;
    }
    if (!this.$refMaskholder) {
      const m = document.createElement("span");
      m.setAttribute("aria-hidden", "true");
      m.setAttribute("maskholder", "");
      m.appendChild(document.createElement("i"));
      m.append("");
      this.$refInput.parentElement!.prepend(m);
      this.$refMaskholder = m;
    }
    this.$refMaskholder.firstChild!.textContent = (this._opts.prefix || "") + this.$refInput.value;
    this.$refMaskholder.lastChild!.textContent = text.substring(text.length - leftLength);
  }

  /** Convert values to history-snapshot; required for undo/redo logic of input */
  private historyToSnapshot(s: string, pos: number): string {
    return `${s.substring(0, pos)}\0${s.substring(pos)}`;
  }

  /** Parse history-snapshot; required for undo/redo logic of input */
  private historyFromSnapshot(h: string): { v: string; pos: number } {
    const pos = h.indexOf("\0");
    const v = h.substring(0, pos) + h.substring(pos + 1);
    return { pos, v };
  }

  _histUndo?: Array<string>;
  _histRedo?: Array<string>;
  /** Undo/redo input value (only if canHandleUndo() === true)
   * @returns true if action succeed (history not empty) */
  historyUndoRedo(toNext: boolean): boolean {
    if (!this.canHandleUndo()) {
      throw new Error(`${this.tagName}. Custom history disabled (canHandleUndo must return true)`);
    }
    const from = toNext ? this._histRedo : this._histUndo;
    if (from?.length) {
      const el = this.$refInput;
      if (!this._histRedo) {
        this._histRedo = [];
      }
      const to = !toNext ? this._histRedo! : this._histUndo!;
      to.push(this.historyToSnapshot(el.value, el.selectionStart || 0));

      const hist = this.historyFromSnapshot(from.pop()!);
      el.value = hist.v;
      el.setSelectionRange(hist.pos, hist.pos);
      return true;
    }

    return false;
  }

  #declineInputEnd?: () => void;
  /** Make undo for input after 100ms when user types not allowed chars
   * @tutorial Troubleshooting
   * * declineInput doesn't trigger beforeinput & input events (do it manually if required) */
  protected declineInput(nextCursorPos?: number): void {
    if (!this.canHandleUndo()) {
      throw new Error(`${this.tagName}. Custom history disabled (canHandleUndo must return true)`);
    }
    this.#declineInputEnd = (): void => {
      this.#declineInputEnd = undefined;
      clearTimeout(t);
      const hist = this.historyFromSnapshot(this._histUndo!.pop()!);
      const el = this.$refInput;
      el.value = hist.v;
      const pos = nextCursorPos ?? hist.pos;
      el.setSelectionRange(pos, pos);
      this.refMask && this.renderMaskHolder(this._opts.maskholder, this.refMask.leftLength);
      this.renderPostfix(this._opts.postfix);
    };

    const t = setTimeout(this.#declineInputEnd, 100);
  }

  protected override setValue(v: ValueType | undefined, reason: SetValueReasons, skipInput = false): boolean | null {
    !skipInput && this.setInputValue(v);
    const isChanged = super.setValue(v, reason);
    this._isValid !== false && this.goHideError();
    return isChanged;
  }

  /** Called to update/reset value for <input/> */
  protected setInputValue(v: ValueType | undefined | string): void {
    const str = v != null ? (v as any).toString() : "";
    this.$refInput.value = str;
    this._opts.mask && this.maskInputProcess(null);
    this.renderPostfix(this._opts.postfix);
    this._onceErrName === this._errName && this.goHideError(); // hide mask-message because value has higher priority than inputValue
  }

  _onceErrName?: string;
  /** Called when inputValue != $value and need to show error on the fly by input-change */
  protected validateOnce(
    rule: { [key: string]: boolean | string | ((v: any) => false | string) },
    force = false
  ): void {
    const prev = this._wasValidNotEmpty;
    if (force) {
      this._wasValidNotEmpty = true; // to ignore onChangeSmart and show error anyway
    }

    // redefine prototype getter once & fire validation
    Object.defineProperty(this, "validations", { configurable: true, value: rule });
    this.validateAfterChange();
    delete (this as any).validations; // rollback to previous

    if (force) {
      this._wasValidNotEmpty = prev; // rollback to previous
    }
    this._onceErrName = this._errName;
  }

  protected override goHideError(): void {
    this._onceErrName = undefined;
    super.goHideError();
  }
}

customElements.define(tagName, WUPTextControl);
// NiceToHave: handle Ctrl+Z wup-select etc. cases
// todo example how to create bult-in dropdown before the main input (like phone-number with ability to select countryCode)
// gotInput > setMask > parseValue >... setValue ....> toString > setInput > setMask
