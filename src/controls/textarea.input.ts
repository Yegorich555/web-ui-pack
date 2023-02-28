// import WUPBaseElement from "../baseElement";
import WUPBaseElement from "../baseElement";
import { WUPcssScrollSmall } from "../styles";

let isFirst = true;
/** Represents contenteditable element with custom input props as value, select etc. */
export default class WUPTextareaInput extends HTMLElement {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextareaInput;

  static get $style(): string {
    return `:host {
          display: inline-block; ${/* it removes extra space below */ ""}
          cursor: text;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: break-word;
          overflow: auto;
          margin: 0; padding: 0;
        }
        ${WUPcssScrollSmall(":host")}`;
  }

  constructor() {
    super();
    if (isFirst) {
      WUPBaseElement.$refStyle!.append(this.#ctr.$style.replace(/:host/g, `${this.tagName}`));
      isFirst = false;
    }
  }

  $options: Record<string, any> = {};
  #isInit = true;
  connectedCallback(): void {
    if (this.#isInit) {
      this.setAttribute("contenteditable", "true");
      this.setAttribute("role", "textbox");
      this.setAttribute("aria-multiline", "true");
      this.#isInit = false;
    }
  }

  /** Makes the selection equal to the current object. */
  select(): void {
    const range = document.createRange();
    range.selectNodeContents(this);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /* Get/set readonly */
  get readOnly(): boolean {
    return this.hasAttribute("aria-readonly");
  }

  set readOnly(v: boolean) {
    WUPBaseElement.prototype.setAttr.call(this, "aria-readonly", v);
  }

  /** Get/set innerHTML (br converted into '\n') */
  get value(): string {
    return (
      this.innerHTML
        // .replace(/\n $/, "\n")
        .replace(/<div><br><\/div>/g, "\n") // Chrome newLine
        .replace(/<br>|<div>/g, "\n")
        .replace(/<\/div>/g, "")
        .replace(/^&nbsp;/, "")
    );
  }

  set value(v: string) {
    this.innerHTML = v;
  }

  /**
   * Sets the start and end positions of a selection in a text field.
   * @param start The offset into the text field for the start of the selection.
   * @param end The offset into the text field for the end of the selection.
   */
  setSelectionRange(start: number | null, end: number | null): void {
    this.selection = { start: start || 0, end: end || 0 };
  }

  /** Gets or sets the starting position or offset of a text selection. */
  get selectionStart(): number | null {
    return this.selection?.start ?? null;
  }

  set selectionStart(v: number | null) {
    this.selection = { start: v || 0, end: this.selection?.end as number };
  }

  /** Gets or sets the end position or offset of a text selection. */
  get selectionEnd(): number | null {
    return this.selection?.end ?? null;
  }

  set selectionEnd(v: number | null) {
    this.selection = { start: this.selection?.start as number, end: v || 0 };
  }

  /** Fix for contenteditable (it doesn't contain selectionStart & selectionEnd props) */
  get selection(): null | { start: number; end: number } {
    if (document.activeElement !== this) {
      return null;
    }
    const sel = window.getSelection();
    if (!sel) {
      return null;
    }
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(this);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;

    return {
      start,
      end: start + range.toString().length,
    };
  }

  set selection(sel) {
    if (document.activeElement !== this) {
      return;
    }
    let charIndex = 0;
    const range = document.createRange();
    range.setStart(this, 0);
    range.collapse(true);
    const nodeStack: Node[] = [this];
    let node;
    let foundStart = false;
    let stop = false;

    // from https://stackoverflow.com/questions/13949059/persisting-the-changes-of-range-objects-after-selection-in-html/13950376#13950376
    /* istanbul ignore else */
    if (sel) {
      // eslint-disable-next-line no-cond-assign
      while (!stop && (node = nodeStack.pop())) {
        if (node.nodeType === Node.TEXT_NODE) {
          const nextCharIndex = charIndex + (node as Text).length;
          /* istanbul ignore else */
          if (!foundStart && sel.start >= charIndex && sel.start <= nextCharIndex) {
            range.setStart(node, sel.start - charIndex);
            foundStart = true;
          }
          /* istanbul ignore else */
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
}

customElements.define("wup-areainput", WUPTextareaInput);
