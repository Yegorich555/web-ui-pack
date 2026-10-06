import { inheritDefaults } from "../baseElement";
import { SetValueReasons } from "./baseControl";
import WUPTextControl from "./text";
import WUPTextAreaInput from "./textArea.input";

WUPTextAreaInput.$use();

const tagName = "wup-textarea";
declare global {
  namespace WUP.TextArea {
    interface EventMap extends WUP.Text.EventMap {}
    interface ValidityMap extends WUP.Text.ValidityMap {}
    interface Options<T = string, VM = ValidityMap>
      extends Omit<WUP.Text.Options<T, VM>, "mask" | "maskholder" | "prefix" | "postfix"> {}
    interface JSXProps<C = WUPTextAreaControl>
      extends Omit<WUP.Text.JSXProps<C>, "w-mask" | "w-maskholder" | "w-prefix" | "w-postfix"> {}
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPTextAreaControl; // add element to document.createElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with multiline text-input
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/control/textArea}
       *  @see {@link WUPTextAreaControl} */
      [tagName]: WUP.Base.ReactHTML<WUPTextAreaControl> & WUP.TextArea.JSXProps; // add element to tsx/jsx intellisense (react)
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
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/control/textArea}
       *  @see {@link WUPTextAreaControl} */
      [tagName]: HTMLAttributes<WUPTextAreaControl> & WUP.TextArea.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Form-control with multiline text-input
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/control/textArea}
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
 *      <wup-areainput contenteditable="true" role="textbox" aria-multiline="true" />
 *      <strong>{$options.label}</strong>
 *   </span>
 *   <button clear/>
 * </label>
 * @tutorial Troubleshooting
 * * known issue: NVDA doesn't read multiline text https://github.com/nvaccess/nvda/issues/13369
 * to resolve it set WUPTextAreaControl.$defaults.selectOnFocus = true */
export default class WUPTextAreaControl<
  ValueType = string,
  TOptions extends WUP.TextArea.Options = WUP.TextArea.Options,
  EventMap extends WUP.TextArea.EventMap = WUP.TextArea.EventMap
> extends WUPTextControl<ValueType, TOptions, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  // #ctr = this.constructor as typeof WUPTextAreaControl;

  static get $style(): string {
    return super.$style;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUP.TextArea.Options = inheritDefaults(WUPTextControl.$defaults, {
    validationRules: inheritDefaults(WUPTextControl.$defaults.validationRules, {
      // WARN: validations min/max must depend on visible chars only
      min: (v, setV, c, r) => WUPTextControl.$defaults.validationRules.min!.call!(c, v?.replace(/\n/g, ""), setV, c, r),
      max: (v, setV, c, r) => WUPTextControl.$defaults.validationRules.max!.call!(c, v?.replace(/\n/g, ""), setV, c, r),
    }),
  });

  $refInput = document.createElement("wup-areainput") as HTMLInputElement;

  protected override renderControl(): void {
    super.renderControl();
    const { id } = this.$refInput;
    this.$refInput.removeAttribute("id");
    this.$refInput.setAttribute("aria-labelledby", id);
    this.$refTitle.id = id;
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.TextArea.Options> | null): void {
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
      e.preventDefault(); // prevent Bold,Italic etc. styles for plain text (formatting is implemented in TextRichControl)
    } else {
      super.gotBeforeInput(e);
    }
    // delete (this.$refInput as unknown as WUPTextAreaInput)._cached;
  }

  protected override gotFocusLost(): void {
    super.gotFocusLost();
    this.setInputValue(this.$value as string, SetValueReasons.userInput); // update because newLine is replaced
  }
}

// prettify defaults before create
let rr: Array<keyof WUP.Text.Options> | undefined = ["mask", "maskholder", "prefix", "postfix"];
rr.forEach((k) => delete WUPTextAreaControl.$defaults[k as keyof WUP.TextArea.Options]);
rr = undefined;

customElements.define(tagName, WUPTextAreaControl);

// todo readonly: user can type because only [aria-readonly] is set on contenteditable => prevent beforeinput when $isReadOnly (as TextRich does)
