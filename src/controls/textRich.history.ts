import TextHistory, { InputState, InputTypes } from "./text.history";

/** Converts state to history-snapshot: `${selectionStart},${selectionEnd},${html}` */
const toSnapshot = (st: InputState): string => `${st.pos1},${st.pos2},${st.value}`;

/** Implements custom history undo/redo for rich text (formatting is included);
 * snapshot contains html & selection before changes (positions of selection are related to text but not to html) */
export default class TextRichHistory extends TextHistory {
  /** Max count of snapshots (the oldest is removed) */
  static maxSnapshots = 100;

  /** Last char typed by user; `null` if last saved changes isn't typing
   * (the next typing is merged into the last typing: to undo words instead of chars) */
  #lastChar: string | null = null;
  /** Position of caret after last typing */
  #lastPos = 0;
  /** Snapshot of the current state before the 1st undo (to redo the last changes) */
  #head = "";

  override saveSnapshot(st: InputState, next?: string): void {
    // save fired several times at once for the same changes: custom changes after input etc.
    if (!this._histTimeout && st.value !== (next ?? this.refInput.value)) {
      const ch = st.action === InputTypes.append ? st.inserted || "" : null;
      const { delimiters } = TextHistory;
      const canMerge =
        ch !== null &&
        this.#lastChar !== null &&
        st.pos1 === this.#lastPos &&
        (!delimiters.includes(ch) || delimiters.includes(this.#lastChar)); // separate by [space] etc.
      if (!canMerge) {
        this._hist.push(toSnapshot(st));
        this._hist.length > TextRichHistory.maxSnapshots && this._hist.shift();
      }
      this.#lastChar = ch;
      this.#lastPos = st.pos1 + (ch?.length ?? 0); // it's compared only after typing (selection of contenteditable is expensive)
    }
    this._histTimeout && clearTimeout(this._histTimeout);
  }

  override undoRedo(isRedo: boolean): boolean {
    if (!this.canUndoRedo(isRedo)) {
      return false;
    }
    const el = this.refInput;
    if (this._histPos == null) {
      this._histPos = this._hist.length - 1;
      this.#head = toSnapshot(this.inputState);
    }
    // redo: state after changes is state before the next changes
    const snap = isRedo ? this._hist[++this._histPos + 1] ?? this.#head : this._hist[this._histPos--];
    const [pos1, pos2] = snap.split(",", 2); // the rest is html
    el.value = snap.substring(pos1.length + pos2.length + 2);
    el.setSelectionRange(+pos1, +pos2);
    this.#lastChar = null; // otherwise the next typing is merged into snapshot that isn't the last anymore
    return true;
  }
}
