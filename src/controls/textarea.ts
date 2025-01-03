import { SetValueReasons } from "./baseControl";
import WUPTextControl from "./text";
import WUPTextareaInput from "./textarea.input";

WUPTextareaInput.$use();

const tagName = "wup-textarea";
declare global {
  namespace WUP.Textarea {
    interface EventMap extends WUP.Text.EventMap {}
    interface ValidityMap extends WUP.Text.ValidityMap {}
    interface Options<T = string, VM = ValidityMap>
      extends Omit<WUP.Text.Options<T, VM>, "mask" | "maskholder" | "prefix" | "postfix"> {}
    interface JSXProps<C = WUPTextareaControl>
      extends Omit<WUP.Text.JSXProps<C>, "mask" | "maskholder" | "prefix" | "postfix"> {}
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPTextareaControl; // add element to document.createElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with multiline text-input
       *  @see {@link WUPTextareaControl} */
      [tagName]: WUP.Base.ReactHTML<WUPTextareaControl> & WUP.Textarea.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Form-control with multiline text-input
       *  @see {@link WUPTextareaControl} */
      [tagName]: HTMLAttributes<WUPTextareaControl> & WUP.Textarea.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Form-control with multiline text-input
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/control/textarea}
 * @example
  const el = document.createElement("wup-textarea");
  el.$options.name = "textarea";
  el.$options.validations = {
    required: true,
    max: 250
  };

  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-textarea w-name="textarea" w-validations="myValidations"/>
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <span contenteditable="true" />
 *      <strong>{$options.label}</strong>
 *   </span>
 *   <button clear/>
 * </label>
 * @tutorial Troubleshooting
 * * known issue: NVDA doesn't read multiline text https://github.com/nvaccess/nvda/issues/13369
 * to resolve it set WUPTextareaControl.$defaults.selectOnFocus = true */
export default class WUPTextareaControl<
  ValueType = string,
  TOptions extends WUP.Textarea.Options = WUP.Textarea.Options,
  EventMap extends WUP.Textarea.EventMap = WUP.Textarea.EventMap
> extends WUPTextControl<ValueType, TOptions, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  // #ctr = this.constructor as typeof WUPTextareaControl;

  static get $style(): string {
    return `${super.$style}
        :host strong { top: 1.6em; }
        :host [contenteditable=true] {
          min-height: 4em;
          max-height: 4em;
        }`;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUP.Textarea.Options = {
    ...WUPTextControl.$defaults,
    validationRules: {
      ...WUPTextControl.$defaults.validationRules,
      // WARN: validations min/max must depends only on visible chars
      min: (v, setV, c, r) => WUPTextControl.$defaults.validationRules.min!.call!(c, v?.replace(/\n/g, ""), setV, c, r),
      max: (v, setV, c, r) => WUPTextControl.$defaults.validationRules.max!.call!(c, v?.replace(/\n/g, ""), setV, c, r),
    },
  };

  $refInput = document.createElement("wup-areainput") as HTMLInputElement;

  protected override renderControl(): void {
    super.renderControl();
    const { id } = this.$refInput;
    this.$refInput.removeAttribute("id");
    this.$refInput.setAttribute("aria-labelledby", id);
    this.$refTitle.id = id;
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.Textarea.Options> | null): void {
    super.gotChanges(propsChanged);
    const o = this._opts as WUP.Text.Options;
    delete o.mask;
    delete o.maskholder;
    delete o.prefix;
    delete o.postfix;
  }

  protected override renderPrefix(): void {
    // not supported
  }

  protected override renderPostfix(): void {
    // not supported
  }

  // protected override gotBeforeInput(e: WUP.Text.GotInputEvent): void {
  //   super.gotBeforeInput(e);
  //   let data: string | null = null;
  //   switch (e.inputType) {
  //     case "insertLineBreak":
  //     case "insertParagraph":
  //       data = "\n";
  //       this.insertText(data);
  //       break;
  //     default:
  //       console.warn(e.inputType, e.data);
  //       break;
  //   }

  //   if (data) {
  //     e.preventDefault();
  //     this.$refInput.dispatchEvent(new InputEvent("input", { inputType: e.inputType, data }));
  //   }
  // }

  // protected override gotInput(e: WUP.Text.GotInputEvent): void {
  //   super.gotInput(e);
  //   console.warn({ v: this.$refInput.value });
  // }

  // protected insertText(text: string): void {
  //   let range = window.getSelection()!.getRangeAt(0);
  //   range.deleteContents(); // delete all prev selected part

  //   const fr = document.createDocumentFragment();
  //   const content = document.createTextNode(text);
  //   fr.appendChild(content);

  //   // issue: when insertText: and endswith "\nAbc " need to remove last empty space
  //   // issue: when delete an empty space: chrome adds <br>
  //   if (text === "\n" && this.$refInput.selectionEnd === this.$refInput.textContent!.length) {
  //     fr.appendChild(document.createTextNode(" ")); // WARN: otherwise Chrome doesn't go to next line
  //   }
  //   range.insertNode(fr);

  //   // create a new range
  //   range = document.createRange();
  //   range.setStartAfter(content);
  //   range.collapse(true);
  //   // make the cursor there
  //   const sel = window.getSelection()!;
  //   sel.removeAllRanges();
  //   sel.addRange(range);
  //   // autoscroll to cursor
  //   const tempAnchorEl = document.createElement("br");
  //   range.insertNode(tempAnchorEl);
  //   tempAnchorEl.scrollIntoView({ block: "nearest" });
  //   tempAnchorEl.remove(); // remove after scrolling is done
  // }

  protected override gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    super.gotKeyDown(e);
    if (e.key === "Enter") {
      e.submitPrevented = true;
    }
  }

  protected override gotBeforeInput(e: WUP.Text.GotInputEvent): void {
    if (e.inputType.startsWith("format")) {
      // todo need to process this for customHistory in the future
      e.preventDefault(); // prevent Bold,Italic etc. styles until textrich is developed
    } else {
      super.gotBeforeInput(e);
    }
    // delete (this.$refInput as unknown as WUPTextareaInput)._cached;
  }

  protected override gotFocusLost(): void {
    super.gotFocusLost();
    this.setInputValue(this.$value as string, SetValueReasons.userInput); // update because newLine is replaced
  }
}

// prettify defaults before create
let rr: Array<keyof WUP.Text.Options> | undefined = ["mask", "maskholder", "prefix", "postfix"];
rr.forEach((k) => delete WUPTextareaControl.$defaults[k as keyof WUP.Textarea.Options]);
rr = undefined;

customElements.define(tagName, WUPTextareaControl);

// NiceToHave display of btnClear affects on internal width - is it ok ???
