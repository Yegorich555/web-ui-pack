import TextHistory, { InputState, InputTypes } from "./text.history";

/** Converts state to history-snapshot: `${selectionStart},${selectionEnd},${html}` */
const toSnapshot = (pos1: number, pos2: number, v: string): string => `${pos1},${pos2},${v}`;

/** Parses history-snapshot */
function fromSnapshot(s: string): { pos1: number; pos2: number; v: string } {
  const i = s.indexOf(",");
  const j = s.indexOf(",", i + 1);
  return { pos1: +s.substring(0, i), pos2: +s.substring(i + 1, j), v: s.substring(j + 1) };
}

/** Implements custom history undo/redo for rich text (formatting is included);
 * snapshot contains html & selection before changes (positions of selection are related to text but not to html) */
export default class TextRichHistory extends TextHistory {
  /** Max count of snapshots (the oldest is removed) */
  static maxSnapshots = 100;

  /** Last saved changes is typing: the next typing is merged into it (to undo words instead of chars) */
  #isAppend = false;
  /** Last char typed by user */
  #lastChar = "";
  /** Position of caret after last changes */
  #lastPos = 0;
  /** Snapshot of the current state before the 1st undo (to redo the last changes) */
  #head = "";

  override save(prev: string, next: string): void;
  override save(beforeState: InputState): void;
  override save(arg1: InputState | string, arg2?: string): void {
    // remove undo-part of history because new will be added
    if (this._histPos != null) {
      this._hist.splice(this._histPos + 1);
      this._histPos = null;
    }

    let st: InputState;
    if (typeof arg1 === "string") {
      st = this._stateBeforeInput || { ...this.inputState, value: arg1 };
      st.action = InputTypes.replace;
    } else {
      st = arg1;
    }
    this._stateBeforeInput = st;

    // save fired several times at once for the same changes: custom changes after input etc.
    const isSameChanges = !!this._histTimeout;
    if (!isSameChanges && st.value !== (arg2 ?? this.refInput.value)) {
      const isAppend = st.action === InputTypes.append;
      const ch = st.inserted || "";
      const { delimiters } = TextHistory;
      const canMerge =
        isAppend &&
        this.#isAppend &&
        st.pos1 === this.#lastPos &&
        (!delimiters.includes(ch) || delimiters.includes(this.#lastChar)); // separate by [space] etc.
      if (!canMerge) {
        this._hist.push(toSnapshot(st.pos1, st.pos2, st.value));
        this._hist.length > TextRichHistory.maxSnapshots && this._hist.shift();
      }
      this.#isAppend = isAppend;
      this.#lastChar = ch;
    }
    this.#lastPos = this.refInput.selectionEnd || 0;

    this._histTimeout && clearTimeout(this._histTimeout);
    this._histTimeout = setTimeout(() => {
      this._histTimeout = null;
      this._stateBeforeInput = undefined;
    }, 1);
  }

  override removeLast(): void {
    const li = this.lastIndex;
    if (li >= 0) {
      this._hist.splice(li);
      this._histPos != null && --this._histPos;
    }
  }

  override undoRedo(isRedo: boolean): boolean {
    if (!this.canUndoRedo(isRedo)) {
      return false;
    }
    const el = this.refInput;
    if (this._histPos == null) {
      this._histPos = this._hist.length - 1;
      this.#head = toSnapshot(el.selectionStart || 0, el.selectionEnd || 0, el.value);
    }
    let snap: string;
    if (isRedo) {
      ++this._histPos;
      snap = this._hist[this._histPos + 1] ?? this.#head; // state after changes is state before the next changes
    } else {
      snap = this._hist[this._histPos];
      --this._histPos;
    }
    const { pos1, pos2, v } = fromSnapshot(snap);
    el.value = v;
    el.setSelectionRange(pos1, pos2);
    this.#isAppend = false; // otherwise the next typing is merged into snapshot that isn't the last anymore
    return true;
  }
}
