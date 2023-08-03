/** Implements custom history undo/redo for input-text */
export default class TextHistory {
  /** Array of history input changes */
  _histUndo: string[] = [];
  /** Array of history-back input changes */
  _histRedo?: string[];

  // eslint-disable-next-line no-useless-constructor
  constructor(
    public input:
      | HTMLInputElement
      | Pick<HTMLInputElement, "value" | "selectionStart" | "selectionEnd" | "setSelectionRange">
  ) {}

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

  /** Undo/redo input value (only if canHandleUndo() === true)
   * @param customCaretPos - point value if need to ignore caret-position
   * @returns true if action succeeded (history not empty) */
  undoRedo(isRedo: boolean, customCaretPos?: number): boolean {
    const from = isRedo ? this._histRedo : this._histUndo;
    if (from?.length) {
      const el = this.input;
      if (!this._histRedo) {
        this._histRedo = [];
      }
      const to = !isRedo ? this._histRedo! : this._histUndo!;
      to.push(this.historyToSnapshot(el.value, el.selectionStart || 0));

      const hist = this.historyFromSnapshot(from.pop()!);
      el.value = hist.v;
      const pos = customCaretPos ?? hist.pos;
      el.setSelectionRange(pos, pos);
      return true;
    }

    return false;
  }

  /** Save to history value & caret position
   * @param customValue point if need to save custom history
   * @param customCaretPos point if need to save custom history
   */
  save(customValue?: string, customCaretPos?: number): void {
    // todo debounce 1ms to replace prev-saved value - for case when save called n-times in loop
    // todo optimize saves - need store only changes - not whole text
    const snap = this.historyToSnapshot(
      customValue ?? this.input.value,
      customCaretPos ?? (this.input.selectionEnd || 0)
    );
    const isChanged = this._histUndo[this._histUndo.length - 1] !== snap;
    isChanged && this._histUndo!.push(snap);
  }
}
