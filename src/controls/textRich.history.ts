import TextHistory, { InputState, InputTypes } from "./text.history";

/** Snapshot: `${selectionStart},${selectionEnd},${html}` */
const toSnapshot = (st: InputState): string => `${st.pos1},${st.pos2},${st.value}`;

/** Undo/redo for rich text: snapshots of html & selection (text positions) before changes */
export default class TextRichHistory extends TextHistory {
  /** The oldest snapshot is removed after it */
  static maxSnapshots = 100;

  /** Last typed char; `null` if last change isn't typing (typing is merged: undo words instead of chars) */
  #lastChar: string | null = null;
  /** Caret after last typing */
  #lastPos = 0;
  /** State before the 1st undo (to redo the last changes) */
  #head = "";

  override saveSnapshot(st: InputState, next?: string): void {
    // skip repeated save for the same changes: custom changes after input etc.
    if (!this._histTimeout && st.value !== (next ?? this.refInput.value)) {
      const ch = st.action === InputTypes.append ? st.inserted || "" : null;
      const { delimiters } = TextHistory;
      const canMerge =
        ch !== null &&
        this.#lastChar !== null &&
        st.pos1 === this.#lastPos &&
        (!delimiters.includes(ch) || delimiters.includes(this.#lastChar)); // split by space etc.
      if (!canMerge) {
        this._hist.push(toSnapshot(st));
        this._hist.length > TextRichHistory.maxSnapshots && this._hist.shift();
      }
      this.#lastChar = ch;
      this.#lastPos = st.pos1 + (ch?.length ?? 0); // used only after typing (reading selection is expensive)
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
    // redo: state after changes = state before the next ones
    const snap = isRedo ? this._hist[++this._histPos + 1] ?? this.#head : this._hist[this._histPos--];
    const [pos1, pos2] = snap.split(",", 2); // the rest is html
    el.value = snap.substring(pos1.length + pos2.length + 2);
    el.setSelectionRange(+pos1, +pos2);
    this.#lastChar = null; // don't merge the next typing into an old snapshot
    return true;
  }
}
