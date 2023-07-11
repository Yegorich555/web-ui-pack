declare global {
  namespace WUP.Text.Mask {
    type TestFn = (str: string, charIndex: number) => boolean | { value: string };
    interface VarChunk {
      index: number;
      pattern: string;
      isTouched?: true;

      value: string;
      test: TestFn;
      /** Returns whether chunk is variable or static */
      isVar: true;
      min: number;
      max: number;
      isCompleted?: boolean;
    }
    interface StaticChunk {
      index: number;
      pattern: string;
      isTouched?: true;
      /** Returns whether chunk is variable or static */
      isVar?: false;
      value?: undefined;
    }
    type InputChunk = VarChunk | StaticChunk;
    interface Options {
      /** Add next constant-symbol to allow user don't worry about non-digit values @default true
       * @WARN prediction:false is partially supported (delete behavior forces prediction logic) */
      prediction?: boolean;
      /** Add missed zero: for pattern '0000-00' and string '1 ' result will be "0001-" @default true   */
      lazy?: boolean;
    }

    interface HandledInput extends HTMLInputElement {
      _maskPrev?: {
        position: number;
        value: string;
        insertText: string | null;
      };
    }
  }
}

export default class MaskTextInput {
  #ctr = this.constructor as typeof MaskTextInput;

  /** Corrected result */
  value = "";
  /** Returns text of first chunk if it's static or "" */
  prefix = "";
  /** Pattern splits into chunks. With detailed info about process */
  chunks: WUP.Text.Mask.InputChunk[] = [];
  /** Last processed chunk */
  lastChunk: WUP.Text.Mask.InputChunk = { index: -1, pattern: "" };
  /** Returns whether value fits pattern (isComplete) `'#.#' + '2' => true` */
  isCompleted = false;
  /** Returns whether value completely fits pattern (isComplete) `'#.#' + '2.2' => true` */
  isCompletedFull = false;
  /** Returns count chars of pattern that missed in value (used to maskHolder) */
  leftLength = 0;

  /** Format string according to pattern
   * @param pattern
   * * 0000-00-00 - for date yyyy-MM-dd
   * * ##0.##0.##0.##0 - for IPaddress
   * * \# - optional digit
   * * 0 - required digit
   * * \* - any char
   * * *{1,5} - any 1..5 chars
   * * //[a-zA-Z]// - regex > 1 letter
   * * //[a-zA-Z]//{1,5} - regex > 1..5 letters
   * * '|0' or '\x00' - static char '0'
   * * '|#' or '\x01' - static char '#'
   * * '|*' or '\x02' - static char '\*'
   * * '|/' or '\x03' - static char '/'
   *  */
  constructor(public pattern: string, rawValue: string, private options?: WUP.Text.Mask.Options) {
    this.options = { prediction: true, lazy: true, ...options };
    this.parse(rawValue);
    this.prefix = !this.chunks[0].isVar ? this.chunks[0].pattern : "";
  }

  /** Returns whether char is digit or not */
  static testDigit(str: string, charIndex: number): boolean {
    const ascii = str.charCodeAt(charIndex);
    const isNum = ascii > 47 && ascii < 58;
    return isNum;
  }

  static testAnyChar(): boolean {
    return true;
  }

  // /** Returns maskholder according to pattern for '##0.##0' returns '000.000' */
  // static parseHolder(pattern: string): string {
  //   return pattern.replace(/[#]g/, "0").replace(/[\0]g/, "0").replace(/[\1]g/, "#");
  // }

  /** Splits pointed pattern to chunks */
  static parsePattern(pattern: string): WUP.Text.Mask.InputChunk[] {
    const chunks: WUP.Text.Mask.InputChunk[] = [];
    let lastChunk: WUP.Text.Mask.InputChunk | null = null;
    const setToChunk = (char: string, isVar?: boolean, testFn?: WUP.Text.Mask.TestFn): WUP.Text.Mask.InputChunk => {
      if (!lastChunk || (lastChunk as WUP.Text.Mask.VarChunk).test !== testFn) {
        lastChunk = { pattern: char } as WUP.Text.Mask.VarChunk;
        if (isVar) {
          lastChunk.test = testFn!;
          lastChunk.isVar = true;
          lastChunk.max = 0;
          lastChunk.min = 0;
          lastChunk.value = "";
        }
        lastChunk.index = chunks.push(lastChunk) - 1;
      } else {
        lastChunk.pattern += char;
      }
      return lastChunk;
    };

    const pr = pattern
      .replace(/([^|]|^)\|0/g, "$1\x00")
      .replace(/([^|]|^)\|#/g, "$1\x01")
      .replace(/([^|]|^)\|\*/g, "$1\x02")
      .replace(/([^|]|^)\|\//g, "$1\x03")
      .replace(/\/\//g, "\x04")
      .replace(/\|\|/g, "|");

    // 1st step: define pattern chunks
    for (let i = 0; i < pr.length; ++i) {
      const p = pr[i];
      switch (p) {
        case "*":
          ++(setToChunk(p, true, this.testAnyChar) as WUP.Text.Mask.VarChunk).max;
          ++(lastChunk! as WUP.Text.Mask.VarChunk).min;
          break;
        case "0":
          ++(setToChunk(p, true, this.testDigit) as WUP.Text.Mask.VarChunk).max;
          ++(lastChunk! as WUP.Text.Mask.VarChunk).min;
          break;
        case "#":
          ++(setToChunk(p, true, this.testDigit) as WUP.Text.Mask.VarChunk).max;
          break;
        case "\x04":
          {
            const end = pr.indexOf("\x04", i + 1);
            if (end === -1) {
              setToChunk("//");
              break;
            }
            const reg = new RegExp(pr.substring(i + 1, end));
            ++(
              setToChunk("*", true, (s, si) => {
                let v = s[si];
                if (reg.test(v)) {
                  return true;
                }
                v = s[si].toLowerCase();
                if (reg.test(v)) {
                  return { value: v };
                }
                v = s[si].toUpperCase();
                if (reg.test(v)) {
                  return { value: v };
                }
                return false;
              }) as WUP.Text.Mask.VarChunk
            ).max;
            ++(lastChunk! as WUP.Text.Mask.VarChunk).min;
            i = end;
          }
          break;
        case "\x00":
          setToChunk("0");
          break;
        case "\x01":
          setToChunk("#");
          break;
        case "\x02":
          setToChunk("*");
          break;
        case "\x03":
          setToChunk("/");
          break;

        case "{": {
          if (lastChunk!.isVar) {
            const end = pr.indexOf("}", i + 1);
            if (end === -1) {
              setToChunk(p);
              break;
            }
            const [min, max] = pr.substring(i + 1, end).split(/, */);
            const lc = lastChunk! as WUP.Text.Mask.VarChunk;
            lc.min = Math.max(lc.min, +min);
            lc.max = Math.max(lc.max, lc.min, +(max ?? 0));
            lc.pattern = lc.pattern.repeat(lc.max);
            i = end;
            break;
          }
          setToChunk(p);
          break;
        }
        default:
          setToChunk(p);
          break;
      }
    }

    if (chunks.some((c, i, arr) => i > 0 && c.isVar === arr[i - 1].isVar)) {
      const msg = `MaskInput. Pattern ${pattern} is wrong: static & variable chunks must alternate`;
      const details = { chunks, pattern };
      console.warn(msg, details);
      throw new SyntaxError(msg); // case when pattern '0*{1,2}' goes to chunks [isVar,isVar]
    }

    return chunks;
  }

  /** Converts pointed value to masked-value and update internal state */
  parse(value: string): string {
    const chunks = MaskTextInput.parsePattern(this.pattern);

    let canShift: number | null = null;
    let pi = 0;
    for (let i = 0; pi < chunks.length; ++pi) {
      const chunk = chunks[pi];
      chunk.isTouched = true;
      if (chunk.isVar) {
        chunk.value = "";
        for (let ci = 0; ci < chunk.max && i < value.length; ++ci, ++i) {
          const char = value[i];
          const r = chunk.test(value, i);
          if (r) {
            if (chunk.isCompleted && chunks[pi + 1]?.pattern[0] === char) {
              break; // set the char for next chunk if possible
            }
            chunk.value += (r as { value: string }).value || value[i];
            chunk.isCompleted = chunk.value.length >= chunk.min;
          } else if (canShift != null && chunks[pi - 1].pattern[0] === char) {
            const prev = chunks[pi - 1];
            while (prev.pattern.length > ++canShift && prev.pattern[canShift] === value[i + 1]) {
              ++i; // if chunk.length > 1 need to shift more: "4+1(23" >>> "+1(423"
            }
            --ci;
            continue; // shift behavior: "+1(234) 9675-123" >>> "+1(234) 967-5123"
          } else if (chunk.isCompleted && chunks[pi + 1]?.pattern[0] === char) {
            break; // skip chunk if length fits min
          } else if (this.options!.lazy && /[., _+-/\\]/.test(char) && ci && chunk.test === this.#ctr.testDigit) {
            // WARN: it works only for digits
            const cnt = chunk.min - ci;
            if (cnt > 0) {
              chunk.value = "0".repeat(chunk.min - ci) + chunk.value; // add zero before (lazy mode)
            }
            chunk.isCompleted = true;
            // ++i;
            break;
          } else {
            --ci; // otherwise skip this char
          }
        }
      } else {
        canShift = 0;
        for (let ci = 0; ci < chunk.pattern.length && i < value.length; ++ci) {
          if (chunk.pattern[ci] === value[i] || /[., _+-/\\]/.test(value[i])) {
            ++i;
            canShift = null;
          }
        }
      }
      if (i === value.length) {
        break;
      }
    }

    this.chunks = chunks;
    this.updateState();
    return this.value;
  }

  /** Update state based on chunks; call it when chunks are changed to recalc value etc. */
  updateState(): void {
    // find last processed chunk
    let l = this.chunks.findIndex((c) => !c.isTouched) - 1;
    const endIndex = this.chunks.length - 1;
    if (l === -2) {
      l = endIndex;
    } else if (l === endIndex - 1 && (this.chunks[l] as WUP.Text.Mask.VarChunk).isCompleted) {
      ++l; // append postfix at the end if all chunks are completed & only lacks postfix
    } else if (this.options!.prediction && l !== endIndex) {
      const last = this.chunks[l];
      if (last.isVar && last.max === last.value.length) {
        ++l; // append postfix if prev digitChunk is filled completely
      }
    }
    this.lastChunk = this.chunks[l];
    this.lastChunk.isTouched = true;

    // find leftLength for maskholder
    const last = this.lastChunk;
    this.leftLength = last.isVar ? last.max - last.value.length : 0; // if last proccess chunk is digit than need to call diff actual and max
    for (let i = last.index + 1; i <= endIndex; ++i) {
      this.leftLength += this.chunks[i].pattern.length;
    }

    // get text from chunks
    this.value = "";
    for (let i = 0; i <= last.index; ++i) {
      this.value += this.chunks[i].value ?? this.chunks[i].pattern;
    }

    const isLeftRequired = this.chunks.some((c, i) => i > last.index && (c as WUP.Text.Mask.VarChunk).min);
    // define whether all chunks processed
    this.isCompleted = (last.index === endIndex || !isLeftRequired) && (!last.isVar || !!last.isCompleted);
    this.isCompletedFull = this.isCompleted && last.index === endIndex;
  }

  /* Call it on 'beforeinput' event to improve logic */
  handleBeforInput(e: InputEvent): void {
    const el = e.target as WUP.Text.Mask.HandledInput;

    if (el.selectionStart !== el.selectionEnd) {
      delete el._maskPrev;
      return;
    }

    let pos = el.selectionStart || 0;
    // eslint-disable-next-line default-case
    switch (e!.inputType) {
      case "insertText":
      case "insertFromPaste": {
        const { chunk, posChunk } = this.findChunkByCursor(pos);
        if (!chunk.isVar && chunk.index === this.chunks.length - 1) {
          pos -= posChunk; // move cursor before postfix
          el.setSelectionRange(pos, pos);
        }
      }
    }

    el._maskPrev = {
      position: pos,
      value: el.value,
      insertText: e.data,
    };
  }

  /* Call it on 'input' event */
  handleInput(e: InputEvent): { declinedAdd: number; position: number } {
    const el = e.target as WUP.Text.Mask.HandledInput;
    const v = el.value;

    let position = el.selectionStart || 0;
    let declinedAdd = 0;

    const saved = el._maskPrev;
    if (saved) {
      switch (e!.inputType) {
        case "insertText":
        case "insertFromPaste":
          position = this.insert(saved.insertText!, saved.position);
          declinedAdd = Math.max(v.length - this.value.length, 0);
          break;
        case "deleteContentForward":
          position = this.deleteAfter(saved.position);
          declinedAdd = Math.min(v.length - this.value.length, 0);
          break;
        case "deleteContentBackward":
          position = this.deleteBefore(saved.position);
          declinedAdd = Math.min(v.length - this.value.length, 0);
          break;
        default:
          // console.warn(e!.inputType);
          this.parse(el.value);
          break;
      }
    } else {
      this.parse(el.value);
    }
    delete el._maskPrev;

    return { position, declinedAdd };
  }

  /** Returns chunk according to pointed cursor position + position inside chunk */
  findChunkByCursor(pos: number): { chunk: WUP.Text.Mask.InputChunk; posChunk: number } {
    const chunk = this.chunks.find((c) => {
      pos -= (c.value ?? c.pattern).length;
      return pos <= 0;
    })!;
    return { chunk, posChunk: (chunk.value ?? chunk.pattern).length + pos };
  }

  /** Leap through static chunk if required */
  adjustCaret(pos: number): number {
    const r = this.findChunkByCursor(pos);

    if (
      r.chunk.isVar &&
      r.chunk.value.length === r.chunk.max &&
      r.posChunk === r.chunk.max &&
      r.chunk.index !== this.chunks.length - 2
    ) {
      pos += r.chunk.max - r.posChunk;
      r.chunk = this.chunks[r.chunk.index + 1]; // leap through the full var chunk if caret at the end
      r.posChunk = r.chunk.pattern.length; // `|+0 (000)` & '1' => `+1 (|000)`
      pos += r.posChunk;
    }
    if (!r.chunk.isVar) {
      const shiftRight = (r.chunk.value ?? r.chunk.pattern).length - r.posChunk;
      pos += shiftRight; // leap through the static chunk (except posftix)
    }
    return pos;
  }

  /** Add char at pointed position;
   *  @returns next cursor position */
  insert(char: string, pos: number): number {
    const prevPos = pos;

    const atTheEnd = pos >= this.value.length;
    pos = atTheEnd ? pos : this.adjustCaret(pos); // leap through the static chunk
    const prev = this.value;
    const next = prev.substring(0, pos) + char + prev.substring(pos);
    this.parse(next);

    if (this.value === prev) {
      return prevPos; // return prevPosition if char isn't appended
    }
    if (atTheEnd) {
      pos = this.value.length;
      if (this.isCompletedFull && !this.lastChunk.isVar) {
        pos -= this.lastChunk.pattern.length;
      }
    } else {
      pos = this.adjustCaret(pos + 1); // leap through the static chunk
    }
    return pos;
  }

  resetChunk(c: WUP.Text.Mask.InputChunk): void {
    if (!c) {
      return;
    }
    delete c.isTouched;
    if (c.isVar) {
      c.value = "";
    }
  }

  private deleteChar(pos: number, isBefore: boolean): number {
    /**
     * +1(234) 343|-4: remove char, shiftDigits. If lastDigit isEmpty: remove isTouched
     * +1(234) 343|-: remove char, shiftDigits. if lastDigit incompleted: remove separator chunk
     * +1(234) 343-4|: remove char, shiftDigits. if lastDigit incompleted: remove next separator chunk
     */
    let { chunk, posChunk } = this.findChunkByCursor(pos);
    if (!isBefore && chunk.isVar && chunk.value.length === posChunk && this.chunks[chunk.index + 1]) {
      chunk = this.chunks[chunk.index + 1]; // go to next chunk when '4|.789' + Delete
      posChunk = 0;
    }

    if (!chunk.isVar) {
      // const lastIndex = this.chunks.length - 1;
      if (chunk.index === 0 && isBefore) {
        return chunk.pattern.length; // impossible to remove prefix: so set cursor to the end
      }
      const next = this.chunks[chunk.index + 1] as WUP.Text.Mask.VarChunk;
      const prev = this.chunks[chunk.index - 1] as WUP.Text.Mask.VarChunk;
      const isPrevPartial = prev && prev.value.length !== prev.max;
      const isNextEmpty = !next?.value || !next.isTouched;
      if (isBefore) {
        // Backspace
        // "123.|" + Backspace => "12|"
        // "12.|" + Backspace => "12|"
        // "123.|45" + Backspace => "12|.45"
        // "12.|45" + Backspace => "1|.45"
        const canDel = !next || isNextEmpty;
        if (canDel) {
          this.resetChunk(next);
          this.resetChunk(chunk);
        }
        pos -= posChunk; // go to prevChunk
        posChunk = prev.value.length;
        const isLast = chunk.index === this.chunks.length - 1; // allow to delete prev-char with postfix
        const canDelPrev = canDel ? !isPrevPartial || isLast : true;
        if (canDelPrev) {
          chunk = prev; // allow to delete char from prev-var-chunk also
        }
      } else {
        // Delete
        // "123|." + Delete => "123.|"
        // "12|." + Delete => "12|"
        // "123|.45" + Delete => "123.|5"
        // "12|.45" + Delete => "12.|5"
        const canDel = next && isNextEmpty && isPrevPartial;
        if (canDel) {
          this.resetChunk(chunk);
        } else if (next) {
          // go to nextChunk
          pos += chunk.pattern.length - posChunk; // move cursor to the end
          posChunk = 0;
          chunk = next;
        }
      }
    }

    if (chunk.isVar) {
      if (isBefore) {
        --pos;
        --posChunk;
      }
      // WARN: it produces wrong result for  "+1 (|234) 567-" + Backspace
      if (chunk.value.length === 1) {
        const nextIsPostfix = chunk.index === this.chunks.length - 2; // 'pref 1| post' + Backspace => 'pref |'
        const nextVal = this.value.substring(0, pos) + (nextIsPostfix ? "" : this.value.substring(pos + 1));
        const l = this.options!.lazy;
        this.options!.lazy = false; // temp disable lazy to fix for "+1 (|234) 567-" => with lazy we have '+2 (345) 067-'
        this.parse(nextVal); // '123.|4.567' + Delete = > 123.567
        this.options!.lazy = l;
        return pos;
      }
      chunk.value = chunk.value.substring(0, posChunk) + chunk.value.substring(posChunk + 1);
      chunk.isCompleted = chunk.value.length >= chunk.min;
      if (!chunk.isCompleted) {
        // shift/recalc chunks
        let prev = chunk;
        for (let i = chunk.index + 2; i < this.chunks.length; i += 2) {
          const next = this.chunks[i] as WUP.Text.Mask.VarChunk;
          if (!next.value.length || !next.isTouched || !prev.test(next.value, 0)) {
            this.resetChunk(next);
            break;
          }
          prev.value += next.value[0];
          next.value = next.value.substring(1);
          prev = next;
        }
        if (prev !== chunk) {
          chunk.isCompleted = true;
          prev.isCompleted = prev.value.length >= prev.min; // recalc last chunk
          !prev.isCompleted && this.resetChunk(this.chunks[prev.index + 1]); // reset next separator if prev not completed
        } else {
          // if no digit chunks at the right need to remove separator
          const next = this.chunks[chunk.index + 1];
          next && delete next.isTouched;
        }
      }
    }

    this.updateState();
    return pos;
  }

  /** Delete a char after pointed position: when user presses 'Delete';
   *  @returns next cursor position */
  deleteAfter(position: number): number {
    return this.deleteChar(position, false);
  }

  /** Delete a char before pointed position: when user presses 'Backspace'
   *  @returns next cursor position */
  deleteBefore(position: number): number {
    return this.deleteChar(position, true);
  }
}

// (() => {
//   const t = new MaskTextInput("##0.##0.##0.##0", "123.4.5.|");
//   const delAfter = (v: string): void => {
//     t.parse(v);
//     const pos = t.deleteAfter(v.indexOf("|"));
//     console.warn(`'${t.value.substring(0, pos)}|${t.value.substring(pos)}'`, t.chunks);
//   };

//   const delBefore = (v: string): void => {
//     t.parse(v);
//     const pos = t.deleteBefore(v.indexOf("|"));
//     console.warn(`${t.value.substring(0, pos)}|${t.value.substring(pos)}`, t.chunks);
//   };

//   delBefore("123.|");
//   delBefore("12.|");
//   delBefore("123.|45");
//   delBefore("12.|45");
//   delBefore("1|.45");
//   delAfter("123|.");
//   delAfter("12|.");
//   delAfter("123|.45");
//   delAfter("12|.45");
// })();

// type/delete 1 2 3 => historyUndo[1,2]
// Ctrl+Z get historyUndo.pop + push into Redo

// new MaskTextInput("0 //[a-c]//", "").chunks.forEach((c) => console.warn(c));
