import WUPTextControl, { WUPTextIn } from "./text";
import { WUPcssScrollSmall } from "../styles";

const tagName = "wup-textarea";
export namespace WUPTextareaIn {
  export interface Def {}
  export interface Opt {}
  export type Generics<
    ValueType = string,
    ValidationKeys extends WUPText.ValidationMap = WUPTextarea.ValidationMap,
    Defaults = Def,
    Options = Opt
  > = WUPTextIn.Generics<ValueType, ValidationKeys, Defaults & Def, Options & Opt>;
  // type Validation<T = string> = Generics<T>["Validation"];
  export type GenDef<T = string> = Generics<T>["Defaults"];
  export type GenOpt<T = string> = Generics<T>["Options"];
}

declare global {
  namespace WUPTextarea {
    interface ValidationMap extends WUPText.ValidationMap {}
    interface EventMap extends WUPText.EventMap {}
    interface Defaults<T = string> extends WUPTextareaIn.GenDef<T> {}
    interface Options<T = string> extends WUPTextareaIn.GenOpt<T> {}
    interface JSXProps<T extends WUPTextareaControl> extends WUPText.JSXProps<T> {}
  }

  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: WUPTextareaControl;
  }

  // add element to tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: WUPTextarea.JSXProps<WUPTextareaControl>;
    }
  }
}

/** Form-control with text-input
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
    <wup-textarea name="textarea" validations="myValidations"/>
  </wup-form>;
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <span contenteditable="true" />
 *      <strong>{$options.label}</strong>
 *   </span>
 *   <button clear/>
 * </label>
 */
export default class WUPTextareaControl<
  ValueType = string,
  EventMap extends WUPTextarea.EventMap = WUPTextarea.EventMap
> extends WUPTextControl<ValueType, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextareaControl;

  static get $style(): string {
    return `${super.$style}
        :host strong { top: 1.6em; }
        :host [contenteditable] {
          min-height: 4em;
          max-height: 4em;
          resize: none;
          display: inline-block; ${/* it removes extra space below */ ""}
          cursor: text;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: break-word;
          overflow: auto;
          margin: var(--ctrl-padding);
          padding: 0;
          margin-left: 0;
          margin-right: 0;
        }
        ${WUPcssScrollSmall(":host [contenteditable]")}`;
  }

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUPTextarea.Defaults = {
    ...WUPTextControl.$defaults,
  };

  $options: WUPTextarea.Options<ValueType> = {
    ...this.#ctr.$defaults,
    // @ts-expect-error
    validationRules: undefined, // don't copy it from defaults to optimize memory
  };

  protected override _opts = this.$options;

  $refInput = document.createElement("span") as HTMLInputElement & HTMLSpanElement;
  constructor() {
    super();
    // this.$refInput.placeholder = " "; / it doesn't work for span
    this.$refInput.select = () => {
      const range = document.createRange();
      range.selectNodeContents(this.$refInput);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
    };
    Object.defineProperty(this.$refInput, "value", {
      set: (v) => (this.$refInput.innerHTML = v),
      get: () => this.$refInput.innerHTML,
    });

    Object.defineProperty(this.$refInput, "selectionStart", {
      set: (start) => (this.selection = { start, end: this.selection!.end }),
      get: () => this.selection?.start ?? null,
    });

    Object.defineProperty(this.$refInput, "selectionEnd", {
      set: (end) => (this.selection = { start: this.selection!.start, end }),
      get: () => this.selection?.end ?? null,
    });
  }

  /** Fix for contenteditable (it doesn't contain selectionStart & selectionEnd props) */
  private get selection(): null | { start: number; end: number } {
    if (document.activeElement !== this.$refInput) {
      return null;
    }
    const sel = window.getSelection();
    if (!sel) {
      return null;
    }
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(this.$refInput);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;

    return {
      start,
      end: start + range.toString().length,
    };
  }

  private set selection(sel) {
    if (document.activeElement !== this.$refInput) {
      return;
    }
    let charIndex = 0;
    const range = document.createRange();
    range.setStart(this.$refInput, 0);
    range.collapse(true);
    const nodeStack: Node[] = [this.$refInput];
    let node;
    let foundStart = false;
    let stop = false;

    // from https://stackoverflow.com/questions/13949059/persisting-the-changes-of-range-objects-after-selection-in-html/13950376#13950376
    if (sel) {
      // eslint-disable-next-line no-cond-assign
      while (!stop && (node = nodeStack.pop())) {
        if (node.nodeType === Node.TEXT_NODE) {
          const nextCharIndex = charIndex + (node as Text).length;
          if (!foundStart && sel.start >= charIndex && sel.start <= nextCharIndex) {
            range.setStart(node, sel.start - charIndex);
            foundStart = true;
          }
          if (foundStart && sel.end >= charIndex && sel.end <= nextCharIndex) {
            range.setEnd(node, sel.end - charIndex);
            stop = true;
          }
          charIndex = nextCharIndex;
        } else {
          let i = node.childNodes.length;
          while (i--) {
            nodeStack.push(node.childNodes[i]);
          }
        }
      }
    }

    const s = window.getSelection()!;
    s.removeAllRanges();
    s.addRange(range);
  }

  protected override renderControl(): void {
    super.renderControl();
    this.$refInput.setAttribute("contenteditable", true);
    this.$refInput.setAttribute("role", "textbox");
    const { id } = this.$refInput;
    this.$refInput.removeAttribute("id");
    this.$refInput.setAttribute("aria-labelledby", id);
    this.$refTitle.id = id;
  }

  // protected override gotChanges(propsChanged: Array<keyof WUPTextarea.Options> | null): void {
  //   super.gotChanges(propsChanged as any);
  // }

  protected override gotBeforeInput(e: WUPText.GotInputEvent): void {
    super.gotBeforeInput(e);
    let data: string | null = null;
    // eslint-disable-next-line default-case
    switch (e.inputType) {
      case "insertParagraph":
        data = "\n";
        this.insertText(data);
        break;
    }

    if (data) {
      e.preventDefault();
      this.$refInput.dispatchEvent(new InputEvent("input", { inputType: e.inputType, data }));
    }
  }

  protected insertText(text: string): void {
    const fr = document.createDocumentFragment();
    // add a new line
    const content = document.createTextNode(text);
    fr.appendChild(content);
    fr.appendChild(document.createTextNode(" " /* "\u00a0" */)); // othwerise chrome doesn't go to next line
    // fr.appendChild(document.createElement("br")); // add the br, or p, or something else
    // make the br replace selection
    let range = window.getSelection()!.getRangeAt(0);
    range.deleteContents();
    range.insertNode(fr);
    // create a new range
    range = document.createRange();
    range.setStartAfter(content);
    range.collapse(true);
    // make the cursor there
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    // autoscroll to cursor
    const tempAnchorEl = document.createElement("br");
    range.insertNode(tempAnchorEl);
    tempAnchorEl.scrollIntoView({ block: "end" });
    tempAnchorEl.remove(); // remove after scrolling is done
  }

  protected override gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    super.gotKeyDown(e);
    if (e.key === "Enter") {
      e.submitPrevented = true;
    }
  }
}

customElements.define(tagName, WUPTextareaControl);
// todo check how it works with mask
