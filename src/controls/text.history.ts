const enum InputTypes {
  insert,
  deleteAfter,
  deleteBefore,
  replace,
}

interface InputState {
  pos1: number;
  pos2: number;
  inserted: string | null;
  action: InputTypes;
  value: string;
}

interface Snapshot {
  /** Action applied to input */
  action: InputTypes;
  /** selectionStart before input change */
  pos1: number;
  /** selectionEnd before input change */
  pos2: number;
  /** position where text changed */
  posIns?: number;
  /** Removed part of text */
  removed?: string;
  /** Inserted part of text */
  inserted?: string;
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
            if (iNext > -1) {
              inserted.pos = i;
              inserted.v = next.substring(i, iNext + 1);
            }
            if (iPrev > -1) {
              removed.pos = i;
              removed.v = prev.substring(i, iPrev + 1);
            }
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
      action: InputTypes.replace,
      inserted: null,
      value: v,
    };
  }

  /** Call this handler on input.onBefore;
   * @returns "true" if was processed undo/redo action */
  handleBeforeInput(e: InputEvent): boolean {
    // need to handle beforeInput because browser can call it without keyDown events - on IOS need to shake smartphone
    let isUndoRedo = true; // inputEvent must be prevented if history is empty - possible when browser calls historyUndo
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
        this._stateBeforeInput = this.inputState;
        if (e.inputType.startsWith("insert")) {
          this._stateBeforeInput.action = InputTypes.insert;
          this._stateBeforeInput.inserted = e.data;
        } else if (e.inputType.startsWith("delete")) {
          this._stateBeforeInput.action =
            e.inputType === "deleteContentBackward" ? InputTypes.deleteBefore : InputTypes.deleteAfter;
        }

        isUndoRedo = false;
        break;
    }

    if (isUndoRedo) {
      this._stateBeforeInput = false;

      e.preventDefault(); // prevent default to avoid browser-internal-history cleaning
      isUndoRedoSuccess &&
        setTimeout(() => {
          this.refInput.dispatchEvent(
            new InputEvent("input", { cancelable: false, bubbles: true, inputType: e.inputType })
          ); // fire manually because need to process undo/redo (but without browser-internal history)
        }); // fire it in empty timeout so beforeInput can bubble to top at first

      setTimeout(() => {
        this._stateBeforeInput = undefined;
      });
    }

    return isUndoRedo;
  }

  /** Call this handler on input.on('input'); */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleInput(e: InputEvent): void {
    if (this._stateBeforeInput) {
      const was = this._stateBeforeInput.value;
      this.save(this._stateBeforeInput);

      // todo don't use it for textArea ???
      const v = this.refInput.value;
      setTimeout(() => {
        const next = this.refInput.value;
        const isChanged = next !== v;
        isChanged && this.save(was, next); // update last history if input value is changed
      });
    } else if (this._stateBeforeInput !== false) {
      console.error("WUP.History error. Event [input] fired without [beforeinput] event. Undo-history is cleared");
      this._hist = [];
      this._histPos = null;
    }
  }

  _hist: Snapshot[] = []; // todo cast to string
  _histTimeout?: ReturnType<typeof setTimeout> | null;
  /** Save to history based on inputState */
  save(prev: string, next: string): void;
  save(beforeState: InputState): void;
  save(arg1: InputState | string, arg2?: string): void {
    // remove undo-part of history because new will be added
    if (this._histPos != null) {
      this._hist.splice(this._histPos + 1);
      this._histPos = null;
    }

    // define stateBefore: try to get previous or use from args
    let stateBefore: InputState;
    if (typeof arg1 === "string") {
      if (this._stateBeforeInput) {
        stateBefore = this._stateBeforeInput;
      } else {
        stateBefore = this.inputState;
        stateBefore.value = arg1;
      }
      stateBefore.action = InputTypes.replace; // when pointed prev & next this is custom action => out of default input change
    } else {
      stateBefore = arg1;
    }
    this._stateBeforeInput = stateBefore;
    const { pos1, pos2, action, value: prev } = stateBefore;

    // init new snapshot or get/udate previous
    let snap: Snapshot;
    if (this._histTimeout) {
      snap = this._hist[this._hist.length - 1]; // need update prev history in this case
      snap.action = InputTypes.replace;
    } else {
      snap = { action, pos1, pos2, removed: prev.substring(pos1, pos2) };
    }

    switch (snap.action) {
      case InputTypes.insert:
        snap.inserted = stateBefore.inserted || "";
        break;
      case InputTypes.deleteAfter:
        if (pos1 === pos2) {
          snap.removed = prev[pos1];
        }
        break;
      case InputTypes.deleteBefore:
        if (pos1 === pos2) {
          snap.removed = prev[pos1 - 1];
        }
        break;
      default:
        {
          const diff = TextHistory.findDiff(prev, arg2 ?? this.refInput.value);
          // 123| => 1,234|: removed 23 inserted 34
          if (diff.inserted) {
            snap.inserted = diff.inserted.v;
            snap.posIns = diff.inserted.pos;
          }
          if (diff.removed) {
            snap.removed = diff.removed.v;
            snap.posIns = diff.removed.pos;
          }
        }
        break;
    }

    // update prev history if input changes was in 1 loop OR append new
    if (this._histTimeout) {
      clearTimeout(this._histTimeout);
      this._hist[this._hist.length - 1] = snap;
    } else {
      this._hist.push(snap); // todo add logic to join chars to prev snapshot: maybe separate by '[space].<\|/:'
    }
    this._histTimeout = setTimeout(() => {
      this._histTimeout = null;
      this._stateBeforeInput = undefined;
    }, 1);

    this.testMe && console.warn("saved", snap, { hist: this._hist, stateBefore });
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
      this.testMe && console.warn("remove last", this._hist);
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
      let posIns = pos1;
      if (pos1 === pos2) {
        if (action === InputTypes.deleteBefore) {
          pos1 -= removed.length;
        }
      }
      posIns = snap.posIns ?? pos1;
      v = v.substring(0, posIns) + inserted + v.substring(posIns + (removed?.length || 0));
      this.refInput.value = v;
      const pos = posIns + (inserted?.length || 0);
      this.refInput.setSelectionRange(pos, pos);
    } else {
      const posIns = snap.posIns ?? pos1;
      const pos = action === InputTypes.deleteBefore && pos1 === pos2 ? pos1 - removed.length : posIns;
      v = v.substring(0, pos) + removed + v.substring(pos + (inserted?.length || 0));
      this.refInput.value = v;
      this.refInput.setSelectionRange(pos1, pos2);

      --this._histPos;
    }
    this.testMe && console.warn("done", v);
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
