/** Implements custom history undo/redo for input-text */
export default class TextHistory {
  /** Array of history input changes */
  _histUndo: string[] = [];
  /** Array of history-back input changes */
  _histRedo?: string[];

  // eslint-disable-next-line no-useless-constructor
  constructor(
    public refInput:
      | HTMLInputElement
      | (HTMLElement & Pick<HTMLInputElement, "value" | "selectionStart" | "selectionEnd" | "setSelectionRange">)
  ) {
    // call manuall handlers instead to reduce event-listeners
    // this.refInput.addEventListener("keydown", (e) => this.handleKeyDown(e as KeyboardEvent));
    // this.refInput.addEventListener("beforeinput", (e) => this.handleBeforeInput(e as InputEvent));
  }

  /** Call this handler on input.on('keydown');
   * @returns "true" if was undo/redo action & history exists */
  handleKeyDown(e: KeyboardEvent): boolean {
    if (e.altKey) {
      return false;
    }
    // WARN: issue: click btnClear + shake iPhone to call undo - undo isn't called in this case (because no history saved into browser itself)
    // WARN: need handle only redo because undo works from browser-side itself but undo - doesn't still beforeInput.preventDefault()
    let isUndo = (e.ctrlKey || e.metaKey) && e.code === "KeyZ"; // 1st browser undo doesn't work after btnClear
    const isRedo = (isUndo && e.shiftKey) || (e.ctrlKey && e.code === "KeyY" && !e.metaKey);
    isUndo &&= !isRedo;
    if (isUndo || isRedo) {
      e.preventDefault(); // prevent original onInput and call manually
      if (isUndo && !this._histUndo.length) {
        return false;
      }
      if (isRedo && !this._histRedo?.length) {
        return false;
      }
      setTimeout(() => {
        this.refInput.dispatchEvent(
          new InputEvent("beforeinput", {
            cancelable: true,
            bubbles: true,
            inputType: isUndo ? "historyUndo" : "historyRedo", //  synthetic event otherwise default can be ignored by browser itself if browser-history is empty
          })
        );
      }); // fire it after empty timeout so keyDown can buble to top at first
      return true;
    }
    return false;
  }

  /** Call this handler on input.on('before');
   * @returns "true" if was undo/redo action */
  handleBeforeInput(e: InputEvent): boolean {
    // need to handle beforeInput because browser can call it without keyDown events - on IOS need to shake smartphone
    let isHandle = true; // inputEvent must be prevented if history is empty - possible when browser calls historyUndo
    let isUndoRedoSuccess = false;
    let isRedo = false;
    switch (e.inputType) {
      case "historyRedo": // Ctrl+Shift+Z
        isRedo = true;
      // eslint-disable-next-line no-fallthrough
      case "historyUndo": // Ctrl+Z
        // WARN: historyUndo can be fired is user shakes iPhone or click Undo button in editMenu
        isUndoRedoSuccess = this.undoRedo(isRedo);
        break;
      default:
        this.save();
        isHandle = false;
        break;
    }

    if (isHandle) {
      e.preventDefault(); // prevent default to avoid browser-internal-history cleaning
      isUndoRedoSuccess &&
        setTimeout(() => {
          this.refInput.dispatchEvent(
            new InputEvent("input", { cancelable: false, bubbles: true, inputType: e.inputType })
          ); // fire manually because need to process undo/redo (but without browser-internal history)
        }); // fire it in empty timeout so beforeInput can bubble to top at first
    }

    return isHandle;
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

  /** Undo/redo input value (only if canHandleUndo() === true)
   * @param customCaretPos - point value if need to ignore caret-position
   * @returns true if action succeeded (history not empty) */
  undoRedo(isRedo: boolean, customCaretPos?: number): boolean {
    const from = isRedo ? this._histRedo : this._histUndo;
    if (from?.length) {
      const el = this.refInput;
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
      customValue ?? this.refInput.value,
      customCaretPos ?? (this.refInput.selectionEnd || 0)
    );
    const isChanged = this._histUndo[this._histUndo.length - 1] !== snap;
    isChanged && this._histUndo!.push(snap);
  }
}
