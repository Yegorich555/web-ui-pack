declare global {
  namespace WUP.Text.Mask {
    type TestFn = (str: string, charIndex: number) => boolean;
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
  /** Returns whether value completely fits pattern (isComplete) */
  isCompleted = false;
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
            ++(setToChunk("*", true, (s, si) => reg.test(s[si])) as WUP.Text.Mask.VarChunk).max;
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
          if (chunk.test(value, i)) {
            if (chunk.isCompleted && chunks[pi + 1]?.pattern[0] === char) {
              break; // set the char for next chunk if possible
            }
            chunk.value += value[i];
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

    // define whether all chunks processed
    this.isCompleted = last.index === endIndex && (!last.isVar || !!last.isCompleted);
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
          el.selectionStart = pos;
          el.selectionEnd = pos;
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

  /** Add char at pointed position;
   *  @returns next cursor position */
  insert(char: string, pos: number): number {
    const prevPos = pos;

    const atTheEnd = pos >= this.value.length;
    if (!atTheEnd) {
      const { chunk, posChunk } = this.findChunkByCursor(pos);
      if (!chunk.isVar) {
        const shiftRight = (chunk.value ?? chunk.pattern).length - posChunk;
        pos += shiftRight; // leap through the static chunk
      }
    }
    const prev = this.value;
    const next = prev.substring(0, pos) + char + prev.substring(pos);
    this.parse(next);

    if (this.value === prev) {
      return prevPos; // return prevPosition if char isn't appended
    }
    pos = atTheEnd ? this.value.length : pos + 1;
    if (atTheEnd && this.isCompleted && !this.lastChunk.isVar) {
      pos -= this.lastChunk.pattern.length;
    }
    return pos;
  }

  resetChunk(c: WUP.Text.Mask.InputChunk): void {
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
      const lastIndex = this.chunks.length - 1;
      if (chunk.index === 0 && isBefore) {
        pos = chunk.pattern.length; // impossible to remove prefix: so set cursor to the end
      } else {
        const next = this.chunks[chunk.index + 1] as WUP.Text.Mask.VarChunk;
        const prev = this.chunks[chunk.index - 1] as WUP.Text.Mask.VarChunk;
        // case impossible anymore: next && !next.text && resetChunk(next); // clear state next chunk after separator
        const canRemove = prev && !next?.isTouched && prev.value.length !== prev.max && chunk.index !== lastIndex; // whether possible to remove separator

        canRemove && this.resetChunk(chunk); // clear current chunk if possible
        // 1|-- + delete
        // 1--| + backspace
        if (isBefore) {
          pos -= posChunk; // go to prevChunk
          posChunk = prev.value.length;
          if (!canRemove && prev) {
            !next?.isTouched && this.resetChunk(chunk); // '123.|' + Backspace => 12
            chunk = prev; // "123.|456" + Backspace => "12|.456" or "12|4.56" (depends on min of prev)
          }
        } else if (!canRemove) {
          // "123|.456" + Delete
          if (chunk.index !== lastIndex) {
            pos += chunk.pattern.length - posChunk; // move cursor to the end
          }
          if (next?.isTouched) {
            chunk = next; // if next not empty go to next:  "123|.456" + Delete => "123.|56"
            posChunk = 0;
          }
        }
      }
    }

    if (chunk.isVar) {
      if (isBefore) {
        --pos;
        --posChunk;
      }
      if (chunk.value.length === 1) {
        const nextIsPostfix = chunk.index === this.chunks.length - 2; // 'pref 1| post' + Backspace => 'pref |'
        const nextVal = this.value.substring(0, pos) + (nextIsPostfix ? "" : this.value.substring(pos + 1));
        this.parse(nextVal); // '123.|4.567' + Delete = > 123.567
        return pos;
      }
      chunk.value = chunk.value.substring(0, posChunk) + chunk.value.substring(posChunk + 1);
      chunk.isCompleted = chunk.value.length >= chunk.min;
      if (!chunk.isCompleted) {
        // shift/recalc chunks
        let prev = chunk;
        for (let i = chunk.index + 2; i < this.chunks.length; i += 2) {
          const next = this.chunks[i] as WUP.Text.Mask.VarChunk;
          if (!next.value.length || !next.isTouched) {
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
//   const t = new MaskTextInput("$ ##0 USD");
//   const delAfter = (v: string): void => {
//     t.parse(v);
//     const pos = t.deleteAfter(v.indexOf("|"));
//     console.warn(`${t.value.substring(0, pos)}|${t.value.substring(pos)}`, t.chunks);
//   };

//   const delBefore = (v: string): void => {
//     t.parse(v);
//     const pos = t.deleteBefore(v.indexOf("|"));
//     console.warn(`${t.value.substring(0, pos)}|${t.value.substring(pos)}`, t.chunks);
//   };

//   delBefore("$ 5 USD|");
//   delAfter("123.4|.789.387");
// })();

// type/delete 1 2 3 => historyUndo[1,2]
// Ctrl+Z get historyUndo.pop + push into Redo

// new MaskTextInput("0 //[a-c]//", "").chunks.forEach((c) => console.warn(c));
