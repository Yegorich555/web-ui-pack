// eslint-disable-next-line max-classes-per-file
import MaskTextInput from "./text.mask";
import { onEvent } from "../indexHelpers";
import { WUPcssIcon } from "../styles";
import WUPBaseControl, { SetValueReasons, ValidateFromCases } from "./baseControl";
import TextHistory from "./text.history";

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
    }
    interface NewOptions {
      /** Debounce time to wait for user finishes typing to start validate and provide $change event
       * @defaultValue 0; */
      debounceMs: number;
      /** Select whole text when input got focus (when input is not readonly and not disabled);
       * @defaultValue false */
      selectOnFocus: boolean;
      /** Show/hide clear button
       * @see {@link ClearActions} from `web-ui-pack/baseControl`
       * @defaultValue true */
      clearButton: boolean;
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
       * '|/' // or '\x03' - static char '/' */
      mask?: string | null | undefined;
      /** Placeholder for mask. By default it inherits from mask. To disabled it set `false`;
       *  for date maskholder can be 'yyyy-mm-dd' */
      maskholder?: string | false | null | undefined;
      /** Part before input; for example for value "$ 123 USD" prefix is "$ " */
      prefix?: string | null | undefined;
      /** Part after input; for example for value "$ 123 USD" postfix is " USD" */
      postfix?: string | null | undefined;
    }
    interface Options<T = string, VM = ValidityMap> extends WUP.BaseControl.Options<T, VM>, NewOptions {}
    interface JSXProps<C = WUPTextControl> extends WUP.BaseControl.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      "w-debounceMs"?: number;
      "w-selectOnFocus"?: boolean | "";
      "w-clearButton"?: boolean | "";
      "w-mask"?: string;
      "w-maskholder"?: string | false;
      "w-prefix"?: string;
      "w-postfix"?: string;
    }

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
    <wup-text w-name="firstName" w-initvalue="Donny" w-validations="myValidations"/>
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
  TOptions extends WUP.Text.Options = WUP.Text.Options,
  EventMap extends WUP.Text.EventMap = WUP.Text.EventMap
> extends WUPBaseControl<ValueType, TOptions, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextControl;

  static get $styleRoot(): string {
    return `:root {
      --ctrl-clear-hover: rgba(255,0,0,0.2);
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
          color: inherit;
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
        :host label>button,
        :host label>button:after,
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
        :host label>button {
          contain: strict;
          z-index: 1;
          font-size: inherit;
        }
        :host button[clear] {
          display: none;
          position: relative;
          margin-right: -0.5em;
          align-self: center;
          cursor: pointer;
          --ctrl-icon-img: var(--wup-icon-cross);
          background: none;
          mask: none;
          -webkit-mask: none;
        }
        :host:focus-within button[clear] {
          display: block;
        }
        :host button[clear=back] {
          --ctrl-icon-img: var(--wup-icon-back);
        }
        :host button[clear]:after {
          content: "";
          padding: 0;
          -webkit-mask-image: var(--ctrl-icon-img);
          mask-image: var(--ctrl-icon-img);
        }
        :host button[clear]:after,
        :host button[clear]:before {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }
        @media (hover: hover) and (pointer: fine) {
          :host:hover button[clear] {
            display: block;
          }
          :host button[clear]:hover:before {
            content: "";
            box-shadow: inset 0 0 0 99999px var(--ctrl-clear-hover);
          }
          :host button[clear]:hover:after {
            background: var(--ctrl-clear,--ctrl-err);
          }
        }
        :host[disabled] button[clear],
        :host[readonly] button[clear] {
          display: none;
          pointer-events: none;
        }`;
  }

  static $errorParse = "Invalid value";
  static $errorMask = "Incomplete value";

  static $defaults: WUP.Text.Options = {
    ...WUPBaseControl.$defaults,
    selectOnFocus: false,
    clearButton: true,
    validationRules: {
      ...WUPBaseControl.$defaults.validationRules,
      min: (v, setV) => (v === undefined || v.length < setV) && `Min length is ${setV} characters`,
      max: (v, setV) => (v === undefined || v.length > setV) && `Max length is ${setV} characters`,
      email: (v, setV) => setV && (!v || !emailReg.test(v)) && "Invalid email address",
    },
    debounceMs: 0,
    mask: "",
    maskholder: "",
    prefix: "",
    postfix: "",
  };

  $refBtnClear?: HTMLButtonElement;
  $refMaskholder?: HTMLSpanElement;
  $refPrefix?: HTMLSpanElement;
  $refPostfix?: HTMLSpanElement;

  constructor() {
    super();

    this.$refInput.placeholder = " "; // Without this css related styles doesn't work with browser autofill
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override parse(text: string): ValueType | undefined {
    return (text || undefined) as any;
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
    return true;
  }

  protected get validations(): WUP.Text.Options["validations"] {
    const vls = (super.validations as { [k: string]: WUP.BaseControl.ValidityFunction<any> }) || {};
    vls._invalidInput = (_v, c) => (c as WUPTextControl)._inputError || false;
    return vls;
  }

  protected override renderControl(): void {
    (this.$refInput as HTMLInputElement).type = "text";
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
  protected renderPrefix(text: string | undefined | null): void {
    let el = this.$refPrefix;
    if (!text) {
      if (el) {
        el.remove();
        delete this.$refPrefix;
      }
    } else {
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
  protected renderPostfix(text: string | undefined | null): void {
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

  /** Custom history undo/redo */
  _refHistory?: TextHistory;
  protected override gotFocus(ev: FocusEvent): Array<() => void> {
    const arr = super.gotFocus(ev);

    if (this.canHandleUndo()) {
      this._refHistory = this._refHistory ?? new TextHistory(this.$refInput);
    }

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
      }
      this.renderPostfix(this._opts.postfix); // postfix depends on maskholder
    }
    super.gotFocusLost();
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Text.Options> | null): void {
    // apply mask options
    if (!this._opts.mask || this._opts.mask !== this.refMask?.pattern) {
      delete this.refMask; // delete if mask is removed or changed (it's recovered again on event)
    }
    if (this._opts.mask && !this._opts.maskholder && this._opts.maskholder !== false) {
      this.refMask ??= new MaskTextInput(this._opts.mask, "");
      this._opts.maskholder = this.refMask.chunks.map((c) => c.pattern).join("");
    }

    if ((!this._opts.maskholder || !this._opts.mask) && this.$refMaskholder) {
      this.$refMaskholder.remove();
      delete this.$refMaskholder;
    }

    super.gotChanges(propsChanged as any);

    if (this._opts.clearButton) {
      this.$refBtnClear = this.$refBtnClear || this.renderBtnClear();
    } else if (this.$refBtnClear) {
      this.$refBtnClear.remove();
      this.$refBtnClear = undefined;
    }
    if (!propsChanged || propsChanged.includes("prefix")) {
      this.renderPrefix(this._opts.prefix);
    }
    if (!propsChanged || propsChanged.includes("postfix")) {
      this.renderPostfix(this._opts.postfix);
    }
  }

  protected override gotKeyDown(e: KeyboardEvent): void {
    super.gotKeyDown(e);
    this._refHistory?.handleKeyDown(e);
  }

  /** Value-text before input changed - used with declineInput */
  _beforeSnap?: string;
  /** Handler of 'beforeinput' event */
  protected gotBeforeInput(e: WUP.Text.GotInputEvent): void {
    const isUndoRedo = this._refHistory?.handleBeforeInput(e);

    this.#declineInputEnd?.call(this);
    this._beforeSnap = TextHistory.historyToSnapshot(this.$refInput.value, this.$refInput.selectionStart || 0);
    setTimeout(() => delete this._beforeSnap);

    if (!isUndoRedo && this._opts.mask) {
      this.refMask = this.refMask ?? new MaskTextInput(this._opts.mask, e.target.value);
      this.refMask.handleBeforeInput(e);
    }
  }

  _inputError?: string;
  #inputTimer?: ReturnType<typeof setTimeout>;
  /** Called when user types text OR when need to apply/reset mask (on focusGot, focusLost) */
  protected gotInput(e: WUP.Text.GotInputEvent): void {
    this._refHistory?.handleInput(e);
    const el = e.target as WUP.Text.Mask.HandledInput;
    let txt = el.value;

    let errMsg: string | undefined;
    if (this._opts.mask) {
      const prev = el._maskPrev?.value;
      txt = this.maskInputProcess(e); // returns true value
      if (txt === prev) {
        // this.renderPostfix(this._opts.postfix);
        return; // skip because no changes from previous action
      }
      const m = this.refMask!;
      if (m.value !== m.prefix && !m.isCompleted) {
        errMsg = this.#ctr.$errorMask;
      }
    }

    let v = this.$value;
    let isParsedOrEmpty = false;
    if (txt) {
      if (this.canParseInput(txt)) {
        try {
          v = this.parseInput(txt);
          isParsedOrEmpty = true;
        } catch (err) {
          v = this.$value;
          errMsg ||= this.#ctr.$errorParse;
        }
      }
    } else {
      isParsedOrEmpty = true;
      v = undefined;
    }

    this.renderPostfix(this._opts.postfix);
    const wasErr = !errMsg && !!this._inputError;
    this._inputError = errMsg;
    const act = (): void => {
      if (this._inputError || wasErr) {
        this.goValidate(ValidateFromCases.onChange);
      }
      isParsedOrEmpty && this.setValue(v, SetValueReasons.userInput, true);
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
      this.declineInput(pos, mi.value); // fix when ###: "12|" + "3b" => 123|
    } else if (el.value !== mi.value) {
      el.value = mi.value;
      document.activeElement === el && el.setSelectionRange(pos, pos); // without checking on focus setSelectionRange sets focus on Safari
    }
    isFocused && this.renderMaskHolder(this._opts.maskholder, mi.leftLength - declinedAdd);

    return mi.value;
  }

  /** Add/update maskholder or skip if it's not defined */
  private renderMaskHolder(text: string | false | undefined | null, leftLength: number): void {
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

  #declineInputEnd?: () => void;
  /** Make undo for input after 100ms when user types not allowed chars
   * point nextCaret for custom undo value
   * @tutorial Troubleshooting
   * * declineInput doesn't trigger beforeinput & input events (do it manually if required) */
  protected declineInput(nextCaret?: number, nextValue?: string): void {
    if (!this._beforeSnap) {
      return;
    }
    const { v, pos } = TextHistory.historyFromSnapshot(this._beforeSnap);
    nextCaret ??= pos;
    nextValue ??= v;
    delete this._beforeSnap;

    const isChanged = v !== nextValue;
    isChanged && nextValue != null && this._refHistory?.save(v, nextValue); // update history if last value is different

    this.#declineInputEnd = (): void => {
      this.#declineInputEnd = undefined;
      clearTimeout(t);
      this.$refInput.value = nextValue!;
      this.$refInput.setSelectionRange(nextCaret!, nextCaret!);
      this.refMask && this.renderMaskHolder(this._opts.maskholder, this.refMask.leftLength);
      this.renderPostfix(this._opts.postfix);

      v === nextValue && this._refHistory?.removeLast();
    };

    const t = setTimeout(this.#declineInputEnd, 100);
  }

  protected override setValue(v: ValueType | undefined, reason: SetValueReasons, skipInput = false): boolean | null {
    !skipInput && this.setInputValue(v as string, reason);
    const isChanged = super.setValue(v, reason);
    this._isValid !== false && this.goHideError();
    return isChanged;
  }

  /** Called to update/reset value for <input/> */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected setInputValue(v: string, reason: SetValueReasons): void {
    this._inputError && this.goHideError(); // after focusLost value resets to prev valid but message left: combobox controls
    delete this._inputError;
    const prev = this.$refInput.value;
    const str = v != null ? ((v as any).toString() as string) : "";
    this.$refInput.value = str;
    // possible when element $initValue changed but element isn't rendered yet
    if (this.$isReady) {
      this._opts.mask && this.maskInputProcess(null);
      str !== prev && this._refHistory?.save(prev, this.$refInput.value);
      this.renderPostfix(this._opts.postfix);
    }
  }

  protected override setClearState(): ValueType | undefined {
    const next = super.setClearState();
    if (this.$refBtnClear) {
      this.$refBtnClear.setAttribute("clear", this.#ctr.$isEmpty(next) ? "" : "back");
    }
    return next;
  }

  override focus(): boolean {
    if (this.$isDisabled) {
      return false;
    }
    this.$refInput.focus();
    return document.activeElement === this.$refInput;
  }
}

customElements.define(tagName, WUPTextControl);
// todo example how to create bult-in dropdown before the main input (like phone-number with ability to select countryCode)
// gotInput > setMask > parseValue >... setValue ....> toString > setInput > setMask
