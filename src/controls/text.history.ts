const enum InputTypes {
  /** Same as insert but possible with update last snasphot to merge several append to single */
  append,
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
  posIns: number;
  /** Removed part of text */
  removed?: string;
  /** Inserted part of text */
  inserted?: string;
}

/** Implements custom history undo/redo for input-text */
export default class TextHistory {
  /** Convert values to history-snapshot; required for undo/redo logic of input */
  static historyToSnapshot(s: string, pos: number): string {
    return String.fromCharCode(pos) + s;
  }

  /** Parse history-snapshot; required for undo/redo logic of input */
  static historyFromSnapshot(h: string): { v: string; pos: number } {
    return { pos: h.charCodeAt(0), v: h.substring(1) };
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

  /** Used to separate history when user types text in ordinary way */
  static delimiters = " .,!?-/\\|_";

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

  /** Converts snapshot to string representation */
  snapshotEncode(snap: Snapshot): string {
    return `${String.fromCharCode(snap.action, snap.pos1, snap.pos2, snap.posIns) + (snap.removed ?? "")}\0${
      snap.inserted ?? ""
    }`;
  }

  /** Converts snapshot from string representation */
  snapshotDecode(snap: string): Required<Snapshot> {
    const i = snap.indexOf("\0", 4);
    return {
      action: snap.charCodeAt(0),
      pos1: snap.charCodeAt(1),
      pos2: snap.charCodeAt(2),
      posIns: snap.charCodeAt(3),
      removed: snap.substring(4, i),
      inserted: snap.substring(i + 1),
    };
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
    // WARN: input event can be fired 1 by 1 without timeouts: try to avoid any timeouts here
    this.#inpDebounce?.call(this);
    this._histTimeout && clearTimeout(this._histTimeout);
    this.#inpBubble?.call(this);
    delete this._histTimeout;
    this._stateBeforeInput = undefined;

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
        // all types here: https://rawgit.com/w3c/input-events/v1/index.html#interface-InputEvent-Attributes
        if (e.inputType.startsWith("insert")) {
          this._stateBeforeInput.action = e.inputType === "insertText" ? InputTypes.append : InputTypes.insert;
          this._stateBeforeInput.inserted = e.data;
        } else if (e.inputType.startsWith("delete")) {
          this._stateBeforeInput.action =
            e.inputType === "deleteContentBackward" ? InputTypes.deleteBefore : InputTypes.deleteAfter;
        }

        isUndoRedo = false;
        break;
    }

    if (isUndoRedo) {
      e.preventDefault(); // prevent default to avoid browser-internal-history cleaning
      if (isUndoRedoSuccess) {
        this._stateBeforeInput = false;
        this.#inpBubble = () => {
          clearTimeout(tid);
          this.#inpBubble = undefined;
          this.refInput.dispatchEvent(
            new InputEvent("input", { cancelable: false, bubbles: true, inputType: e.inputType })
          ); // fire manually because need to process undo/redo (but without browser-internal history)
        };
        const tid = setTimeout(this.#inpBubble); // fire it in empty timeout so beforeInput can bubble to top at first
      }
    }
    return isUndoRedo;
  }

  /** required to fix custom bubbling with timetout */
  #inpBubble?: () => void;
  /* when user types fast beforeInput can be fired stepByStep without timeouts */
  #inpDebounce?: () => void;
  /** Call this handler on input.on('input'); */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleInput(e: InputEvent): void {
    if (this._stateBeforeInput) {
      const was = this._stateBeforeInput.value;
      this.save(this._stateBeforeInput);

      const v = this.refInput.value;
      this.#inpDebounce = () => {
        clearTimeout(t);
        this.#inpDebounce = undefined;
        const next = this.refInput.value;
        const isChanged = next !== v;
        isChanged && this.save(was, next); // if mask/format are applied need to call save again with replace behavior
      };
      const t = setTimeout(this.#inpDebounce); // update last history if input value is changed during handleInput
    } else if (this._stateBeforeInput !== false) {
      console.error("WUP.History error. Event [input] fired without [beforeinput] event. Undo-history is cleared");
      this._hist = [];
      this._histPos = null;
    } else {
      this._stateBeforeInput = undefined;
    }
  }

  _hist: string[] = [];
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
    let isUpdate = false; // update last snapshot
    if (this._histTimeout) {
      isUpdate = true; // if save fired several times at once then 2nd time: is mask/format changes
      const ls = this._hist[this._hist.length - 1];
      snap = this.snapshotDecode(ls); // need update prev history in this case
      if (snap.action === InputTypes.append && snap.inserted!.length > 1) {
        // remove last appended char & add to current snapshot (implemented in findDiff below)
        // expected if save fired 2nd time it's mask-changes and need
        this._hist[this._hist.length - 1] = ls.substring(0, ls.length - 1);
        isUpdate = false;
        snap.pos1 = pos1;
        snap.pos2 = pos2;
        snap.removed = "";
      }
      snap.action = InputTypes.replace;
    } else {
      snap = { action, pos1, pos2, posIns: pos1, removed: prev.substring(pos1, pos2) };
    }

    switch (snap.action) {
      case InputTypes.append:
        if (!snap.removed && this._hist.length) {
          // merge changes in single snapshot: when user types 'abc' => it's collected to single snapshot
          const sl = this.snapshotDecode(this._hist[this._hist.length - 1]);
          if (
            sl.action === InputTypes.append &&
            sl.posIns + sl.inserted.length === snap.posIns &&
            (!TextHistory.delimiters.includes(stateBefore.inserted!) || // separate by [space] etc.
              TextHistory.delimiters.includes(sl.inserted[sl.inserted.length - 1])) // but allow to save delimiters all insingle set
          ) {
            isUpdate = true;
            sl.inserted += stateBefore.inserted!;
            snap = sl;
            break;
          }
        }
        snap.inserted = stateBefore.inserted!;
        break;
      case InputTypes.insert:
        snap.inserted = stateBefore.inserted!;
        break;
      case InputTypes.deleteAfter:
        if (pos1 === pos2) {
          snap.removed = prev[pos1];
        }
        break;
      case InputTypes.deleteBefore:
        if (pos1 === pos2) {
          snap.removed = prev[pos1 - 1];
          snap.posIns = pos1 - 1;
        }
        break;
      default:
        {
          // replace
          const diff = TextHistory.findDiff(prev, arg2 ?? this.refInput.value);
          // extra case with number format: 123| => 1,234|: removed 23 inserted 34
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

    const sn = this.snapshotEncode(snap);
    // update prev history if input changes was in 1 loop OR append new
    if (isUpdate) {
      this._histTimeout && clearTimeout(this._histTimeout);
      this._hist[this._hist.length - 1] = sn;
    } else {
      this._hist.push(sn);
    }
    this._histTimeout = setTimeout(() => {
      this._histTimeout = null;
      this._stateBeforeInput = undefined;
    }, 1);
  }

  /** Returns last history index */
  get lastIndex(): number {
    return this._histPos ?? this._hist.length - 1;
  }

  /** Call this to remove last history */
  removeLast(): void {
    const li = this.lastIndex;
    if (li >= 0) {
      const snap = this.snapshotDecode(this._hist[li]);
      if (snap.action === InputTypes.append && snap.inserted.length > 1) {
        snap.inserted = snap.inserted.substring(0, snap.inserted.length - 1); // remove only last char in such case
        this._hist[li] = this.snapshotEncode(snap);
      } else {
        this._hist.splice(li);
        if (this._histPos != null) {
          --this._histPos;
        }
      }
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
    const snap = this.snapshotDecode(this._hist[this._histPos]);
    // eslint-disable-next-line prefer-const
    let { pos1, pos2, posIns, inserted, removed } = snap;
    // undo
    if (isRedo) {
      v = v.substring(0, posIns) + inserted + v.substring(posIns + removed.length);
      this.refInput.value = v;
      const posSel = posIns + inserted.length;
      this.refInput.setSelectionRange(posSel, posSel);
    } else {
      v = v.substring(0, posIns) + removed + v.substring(posIns + inserted.length);
      this.refInput.value = v;
      this.refInput.setSelectionRange(pos1, pos2);

      --this._histPos;
    }
    return true;
  }
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
