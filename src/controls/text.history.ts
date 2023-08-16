const enum InputTypes {
  insert,
  deleteAfter,
  deleteBefore,
  replace,
}

interface InputState {
  pos1: number;
  pos2: number;
  selected: string;
  before: string;
  after: string;
  inserted: string | null;
  action: InputTypes | null;
  fullValue?: string;
}

/** Implements custom history undo/redo for input-text */
export default class TextHistory {
  /** Convert values to history-snapshot; required for undo/redo logic of input */
  static historyToSnapshot(s: string, pos: number): string {
    return `${s.substring(0, pos)}\0${s.substring(pos)}`;
  }

  /** Parse history-snapshot; required for undo/redo logic of input */
  static historyFromSnapshot(h: string): { v: string; pos: number } {
    const pos = h.indexOf("\0");
    const v = h.substring(0, pos) + h.substring(pos + 1);
    return { pos, v };
  }

  /** Returns simple changes for 2 strings */
  static findDiff(
    prev: string,
    next: string
  ): { inserted: { v: string; pos: number } | null; removed: { v: string; pos: number } | null } {
    const inserted = { v: "", pos: 0 };
    const removed = { v: "", pos: 0 };

    const len = Math.max(prev.length, next.length);
    for (let i = 0; i < len; ++i) {
      if (prev[i] !== next[i]) {
        // find last changed
        for (let iPrev = prev.length - 1, iNext = next.length - 1; ; --iPrev, --iNext) {
          if (prev[iPrev] !== next[iNext]) {
            // console.log({ i, iPrev, iNext });
            inserted.pos = i;
            inserted.v = next.substring(i, iNext + 1);
            removed.pos = i;
            removed.v = prev.substring(i, iPrev + 1);
            break;
          }
        }
        break;
      }
    }

    return { inserted: inserted.v ? inserted : null, removed: removed.v ? removed : null };
  }

  // eslint-disable-next-line no-useless-constructor
  constructor(
    public refInput:
      | HTMLInputElement
      | (HTMLElement & Pick<HTMLInputElement, "value" | "selectionStart" | "selectionEnd" | "setSelectionRange">)
  ) {
    // call manualy handlers instead to reduce event-listeners
    // this.refInput.addEventListener("keydown", (e) => this.handleKeyDown(e as KeyboardEvent));
    // this.refInput.addEventListener("beforeinput", (e) => this.handleBeforeInput(e as InputEvent));
    // this.refInput.addEventListener("input", (e) => this.handleInput(e as InputEvent));
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
      if (!this.canUndoRedo(isRedo)) {
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

  _stateBeforeInput?: InputState | false;
  /** Returns basic input state */
  get inputState(): InputState {
    const pos1 = this.refInput.selectionStart || 0;
    const pos2 = this.refInput.selectionEnd || 0;
    const v = this.refInput.value;
    return {
      pos1,
      pos2,
      selected: v.substring(pos1, pos2),
      before: v[pos1 - 1] || "",
      after: v[pos1] || "",
      inserted: v,
      action: null,
    };
  }

  /** Call this handler on input.onBefore;
   * @returns "true" if was processed undo/redo action */
  handleBeforeInput(e: InputEvent): boolean {
    // need to handle beforeInput because browser can call it without keyDown events - on IOS need to shake smartphone
    let isHandled = true; // inputEvent must be prevented if history is empty - possible when browser calls historyUndo
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
        {
          let action: InputTypes | null = null;
          if (e.inputType.startsWith("insert")) {
            // when insert char in ordinary way need to merge it
            action = InputTypes.insert;
          } else if (e.inputType.startsWith("delete")) {
            action = e.inputType === "deleteContentBackward" ? InputTypes.deleteBefore : InputTypes.deleteAfter;
          }
          this._stateBeforeInput = this.inputState;
          this._stateBeforeInput.action = action;
          this._stateBeforeInput.inserted = e.data;
          this._stateBeforeInput.fullValue = this.refInput.value; // todo skip for textArea???
          isHandled = false;
        }
        break;
    }

    if (isHandled) {
      this._stateBeforeInput = false;
      e.preventDefault(); // prevent default to avoid browser-internal-history cleaning
      isUndoRedoSuccess &&
        setTimeout(() => {
          this.refInput.dispatchEvent(
            new InputEvent("input", { cancelable: false, bubbles: true, inputType: e.inputType })
          ); // fire manually because need to process undo/redo (but without browser-internal history)
        }); // fire it in empty timeout so beforeInput can bubble to top at first
    }

    return isHandled;
  }

  /** Call this handler on input.on('input'); */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleInput(e: InputEvent): void {
    let was: string | undefined;
    if (this._stateBeforeInput) {
      was = this._stateBeforeInput.fullValue;
      this.save(this._stateBeforeInput);
      this._stateBeforeInput = undefined;

      // todo don't use it for textArea ???
      const v = this.refInput.value;
      setTimeout(() => {
        const isChanged = this.refInput.value !== v;
        isChanged && this.updateLast(was!); // update last history if input value is changed
      });
    } else if (this._stateBeforeInput !== false) {
      console.error(
        "WUP-TEXT. History error. Event [input] fired without [beforeinput] event. Undo-history is cleared"
      );
      this._hist = [];
      this._histPos = null;
    }
  }

  _hist: any[] = []; // todo cast to string
  /** Save to history based on inputState */
  save(state: InputState): void {
    const { pos1, pos2, selected, inserted, action } = state;

    // prev = "abc|"
    // next = "123|"
    // insert & remove
    // '123' => '12
    // 1: '12|3' + a => undo: '12a3' -a
    // 2: '12' + 'abc' => undo "12abc" - a
    // "" => "a"
    // "12" > '1.2'
    let removed = selected;
    let snap;
    // todo types + & - are similar
    switch (state.action) {
      case InputTypes.insert:
        snap = { action, pos1, pos2, inserted, removed };
        break;
      case InputTypes.deleteAfter:
        if (pos1 === pos2) {
          removed = state.after;
        }
        snap = { action, pos1, pos2, removed };
        break;
      case InputTypes.deleteBefore:
        if (pos1 === pos2) {
          removed = state.before;
        }
        snap = { action, pos1, pos2, removed };
        break;
      default: // full replace - possible when input cleared
        snap = { action, pos1, pos2, removed, inserted };
        break;
    }
    if (this._histPos != null) {
      this._hist.splice(this._histPos + 1); // remove undo-part of history because new added
      this._histPos = null;
    }
    this._hist.push(snap); // todo add logic to join chars to prev snapshot: maybe separate by '[space].<\|/:'
    this.testMe && console.warn(snap, this._hist);
  }

  /** Call it manually when before input value updated outside default events */
  append(newValue: string): void {
    const state = this.inputState;
    state.inserted = newValue;
    state.selected = this.refInput.value;
    state.action = InputTypes.replace;
    this.save(state);
  }

  /** Returns last history index */
  get lastIndex(): number {
    return this._histPos ?? this._hist.length - 1;
  }

  /** Call this to remove last history */
  removeLast(): void {
    const li = this.lastIndex;
    if (li >= 0) {
      this._hist.splice(li);
      if (this._histPos != null) {
        --this._histPos;
      }
    }
  }

  /** Called to update last history if input-value is modified in input event */
  updateLast(was: string): void {
    const h = this._hist[this.lastIndex];
    if (h) {
      const diff = TextHistory.findDiff(was, this.refInput.value);
      // 123| => 1,234|: removed 23 inserted 34
      if (diff.inserted) {
        // otherwise need somehow full replace inserted but need beforeState.value compare with new
        h.inserted = diff.inserted.v;
        h.posIns = diff.inserted.pos;
      }
      if (diff.removed) {
        h.removed = diff.removed.v;
        h.posIns = diff.removed.pos;
      }
      this.testMe && console.warn("updated", h, diff);
    }
  }

  /** Returns whether is possible to process undo/redo actions */
  canUndoRedo(isRedo: boolean): boolean {
    if (!this._hist.length) {
      return false;
    }
    if (this._histPos == null) {
      return !isRedo;
    }
    if (!isRedo) {
      return this._histPos >= 0;
    }
    return this._histPos < this._hist.length - 1;
  }

  _histPos?: number | null;
  /** Update input value & selection according to history  */
  undoRedo(isRedo: boolean): boolean {
    if (!this.canUndoRedo(isRedo)) {
      return false;
    }

    let v = this.refInput.value;
    if (this._histPos == null) {
      this._histPos = this._hist.length - 1;
    }
    if (isRedo) {
      ++this._histPos;
    }
    const snap = this._hist[this._histPos];
    const i = this._histPos;
    this.testMe && console.warn(isRedo ? "redo" : "undo", { snap, i, v: this.refInput.value });
    // eslint-disable-next-line prefer-const
    let { pos1, pos2, inserted, removed, action } = snap;
    removed ??= "";
    inserted ??= "";
    // undo
    if (isRedo) {
      if (action === InputTypes.replace) {
        pos1 = 0; // because text was completely replaced
        v = inserted;
      } else {
        if (pos1 === pos2) {
          if (action === InputTypes.deleteBefore) {
            pos1 -= removed.length;
          }
        }
        const posIns = snap.posIns ?? pos1;
        v = v.substring(0, posIns) + inserted + v.substring(posIns + (removed?.length || 0));
      }
      this.refInput.value = v;
      const pos = pos1 + (inserted?.length || 0);
      this.refInput.setSelectionRange(pos, pos);
    } else {
      const posIns = snap.posIns ?? pos1;
      const pos = action === InputTypes.deleteBefore && pos1 === pos2 ? pos1 - removed.length : posIns;
      v = v.substring(0, pos) + removed + v.substring(pos + (inserted?.length || 0));
      this.refInput.value = v;
      this.refInput.setSelectionRange(pos1, pos2);

      --this._histPos;
    }
    this.testMe && console.warn("done", this.refInput.selectionStart, this.refInput.selectionEnd, v);
    return true;
  }

  testMe = false;
}

// const expect = (actual: any) => ({
//   toStrictEqual: (expected: any) => {
//     console.warn(actual, "vs", expected);
//   },
// });

// expect(TextHistory.findDiff("ab", "ab.").inserted).toStrictEqual({ v: ".", pos: 2 });
// expect(TextHistory.findDiff("ab", ".ab").inserted).toStrictEqual({ v: ".", pos: 0 });
// expect(TextHistory.findDiff("ab", "a.b").inserted).toStrictEqual({ v: ".", pos: 1 });

// expect(TextHistory.findDiff("ab", "ab12").inserted).toStrictEqual({ v: "12", pos: 2 });
// expect(TextHistory.findDiff("ab", "34ab").inserted).toStrictEqual({ v: "34", pos: 0 });
// expect(TextHistory.findDiff("ab", "a56b").inserted).toStrictEqual({ v: "56", pos: 1 });

// expect(TextHistory.findDiff("ab.", "ab").removed).toStrictEqual({ v: ".", pos: 2 });
// expect(TextHistory.findDiff(".ab", "ab").removed).toStrictEqual({ v: ".", pos: 0 });
// expect(TextHistory.findDiff("a.b", "ab").removed).toStrictEqual({ v: ".", pos: 1 });
