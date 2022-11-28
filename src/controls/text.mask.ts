export interface IMaskInputOptions {
  /** Add next constant-symbol to allow user don't worry about non-digit values @default true */
  prediction?: boolean;
  /** Add missed zero: for pattern '0000-00' and string '1 ' result will be "0001-" @default true   */
  lazy?: boolean;
}

interface IDigChunk {
  index: number;
  text: string;
  isTouched?: true;

  isDig: true;
  min: number;
  max: number;
  isCompleted?: boolean;
}
interface ISymChunk {
  index: number;
  text: string;
  isTouched?: true;
  isDig?: false;
}
type IInputChunk = IDigChunk | ISymChunk;
interface HandledInput extends HTMLInputElement {
  _maskPrev?: {
    position: number;
    value: string;
    insertText: string | null;
  };
}

export default class MaskTextInput {
  /** Corrected result */
  value = "";
  /** Returns lastChunk that processed */
  prefix = "";
  /** Pattern splits into chunks. With detailed info about process */
  chunks: IInputChunk[] = [];
  /** Last processed chunk */
  #lastChunk: IInputChunk = { index: -1, text: "" };
  /** Returns whether value completely fits pattern (isComplete) */
  isCompleted = false;
  /** Returns count chars of pattern that missed in value (used to maskHolder) */
  leftLength = 0;

  /** Format string accoring to pattern
   * @param pattern 0000-00-00 (for date yyyy-MM-dd), ##0.##0.##0.##0 (for IPaddress), $ ### ### ### ### ### ##0 (for currency)
   * #### where # - optional, 0 - required numbers */
  constructor(public pattern: string, private options?: IMaskInputOptions) {
    this.options = { prediction: true, lazy: true, ...options };
    this.parse("");
    this.prefix = !this.chunks[0].isDig ? this.chunks[0].text : "";
  }

  /* Call it on 'beforeinput' event to improve logic */
  static handleBeforInput(e: InputEvent): void {
    const el = e.target as HandledInput;
    if (el.selectionStart == null || el.selectionStart !== el.selectionEnd) {
      delete el._maskPrev;
      return;
    }

    el._maskPrev = {
      position: el.selectionStart!,
      value: el.value,
      insertText: e.data,
    };
  }

  // /** Returns maskholder according to pattern for '##0.##0' returns '000.000' */
  // static parseHolder(pattern: string): string {
  //   return pattern.replace(/[#]g/, "0").replace(/[\0]g/, "0").replace(/[\1]g/, "#");
  // }

  /** Splits pointed pattern to chunks */
  static parsePattern(pattern: string): IInputChunk[] {
    const chunks: IInputChunk[] = [];
    let lastChunk: IInputChunk | null = null;
    const setToChunk = (char: string, isDigit: boolean | undefined): IInputChunk => {
      if (!lastChunk || lastChunk.isDig !== isDigit) {
        lastChunk = { text: char } as IDigChunk;
        if (isDigit) {
          lastChunk.isDig = true;
          lastChunk.max = 0;
          lastChunk.min = 0;
        }
        lastChunk.index = chunks.push(lastChunk) - 1;
      } else {
        lastChunk.text += char;
      }
      return lastChunk;
    };

    // 1st step: define pattern chunks
    for (let i = 0; i < pattern.length; ++i) {
      const p = pattern[i];
      switch (p) {
        case "0":
          ++(setToChunk(p, true) as IDigChunk).max;
          ++(lastChunk! as IDigChunk).min;
          break;
        case "#":
          ++(setToChunk(p, true) as IDigChunk).max;
          break;
        default:
          setToChunk(p, undefined);
          break;
      }
    }

    return chunks;
  }

  /** Converts pointed value to masked-value and update internal state */
  parse(value: string): string {
    const chunks = MaskTextInput.parsePattern(this.pattern);

    if (!value) {
      const $1 = chunks[0];
      $1.isTouched = true;
      if ($1.isDig) {
        $1.text = "";
      }
    } else {
      let canShift: number | null = null;
      for (let i = 0, pi = 0; pi < chunks.length && i < value.length; ++pi) {
        const chunk = chunks[pi];
        chunk.isTouched = true;
        if (chunk.isDig) {
          chunk.text = "";
          for (let ci = 0; ci < chunk.max && i < value.length; ++ci, ++i) {
            const ascii = value.charCodeAt(i);
            const isNum = ascii > 47 && ascii < 58;
            if (isNum) {
              chunk.text += String.fromCharCode(ascii);
              chunk.isCompleted = chunk.text.length >= chunk.min;
            } else if (canShift != null && chunks[pi - 1].text[0] === String.fromCharCode(ascii)) {
              const prev = chunks[pi - 1];
              while (prev.text.length > ++canShift && prev.text[canShift] === value[i + 1]) {
                ++i; // if chunk.length > 1 need to shift more: "4+1(23" >>> "+1(423"
              }
              --ci;
              continue; // shift behavior: "+1(234) 9675-123" >>> "+1(234) 967-5123"
            } else if (chunk.isCompleted && chunks[pi + 1]?.text.charCodeAt(0) === ascii) {
              break; // skip chunk if length fits min
            } else if (this.options!.lazy && /[., _+-/\\]/.test(String.fromCharCode(ascii)) && ci) {
              const cnt = chunk.min - ci;
              if (cnt > 0) {
                chunk.text = "0".repeat(chunk.min - ci) + chunk.text; // add zero before (lazy mode)
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
          for (let ci = 0; ci < chunk.text.length && i < value.length; ++ci) {
            if (chunk.text[ci] === value[i] || /[., _+-/\\]/.test(value[i])) {
              ++i;
              canShift = null;
            }
          }
        }
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
    } else if (l === endIndex - 1 && (this.chunks[l] as IDigChunk).isCompleted) {
      ++l; // append suffix at the end if all chunks are completed & only lacks suffix
    } else if (this.options!.prediction && l !== endIndex) {
      const last = this.chunks[l];
      if (last.isDig && last.max === last.text.length) {
        ++l; // append suffix if prev digitChunk is filled completely
      }
    }
    this.#lastChunk = this.chunks[l];

    // find leftLength for maskholder
    const last = this.#lastChunk;
    this.leftLength = last.isDig ? last.max - last.text.length : 0; // if last proccess chunk is digit than need to call diff actual and max
    for (let i = last.index + 1; i <= endIndex; ++i) {
      this.leftLength += this.chunks[i].text.length;
    }

    // get text from chunks
    this.value = "";
    for (let i = 0; i <= last.index; ++i) {
      this.value += this.chunks[i].text;
    }

    // define whether all chunks processed
    this.isCompleted = last.index === endIndex && (!last.isDig || !!last.isCompleted);
  }

  /* Call it on 'input' event */
  handleInput(e: InputEvent): { declinedAdd: number; position: number } {
    const el = e.target as HandledInput;
    const v = el.value;

    let position = el.selectionStart ?? el.value.length;
    let declinedAdd = 0;

    const prev = el._maskPrev;
    if (prev) {
      switch (e!.inputType) {
        case "insertText":
        case "insertFromPaste":
          position = this.insert(prev.insertText!, prev.position);
          declinedAdd = Math.max(v.length - this.value.length, 0);
          break;
        case "deleteContentForward":
          position = this.deleteAfter(prev.position);
          break;
        case "deleteContentBackward":
          position = this.deleteBefore(prev.position);
          declinedAdd = Math.min(v.length - this.value.length, 0);
          break;
        case "historyUndo":
          this.parse(el.value);
          break; // todo implement: https://stackoverflow.com/questions/16195644/in-chrome-undo-does-not-work-properly-for-input-element-after-contents-changed-p
        case "historyRedo":
          this.parse(el.value);
          break;
        default:
          // console.warn(e!.inputType);
          this.parse(el.value);
          break;
      }
    } else {
      this.parse(el.value);
    }

    return { position, declinedAdd };
  }

  /** Returns chunk according to pointed cursor position + position inside chunk */
  findChunkByCursor(pos: number): { chunk: IInputChunk; posChunk: number } {
    const chunk = this.chunks.find((c) => {
      pos -= c.text.length;
      return pos < 0;
    })!;
    return { chunk, posChunk: chunk.text.length + pos };
  }

  /** Add char at pointed position;
   *  @returns next cursor position */
  insert(char: string, pos: number): number {
    const prevPos = pos;
    const atTheEnd = pos >= this.value.length;
    if (!atTheEnd) {
      const { chunk, posChunk } = this.findChunkByCursor(pos);
      if (!chunk.isDig) {
        const shiftRight = chunk.text.length - posChunk;
        pos += shiftRight;
      }
    }

    const prev = this.value;
    const next = prev.substring(0, pos) + char + prev.substring(pos);
    this.parse(next);
    if (this.value === prev) {
      return prevPos; // return prevPosition if char isn't appended
    }
    pos += 1;
    if (atTheEnd) {
      pos = this.value.length;
      if (this.isCompleted && !this.#lastChunk.isDig) {
        return pos - this.#lastChunk.text.length; // if last is suffix we need to set cursor before
      }
    }
    return pos;
  }

  private deleteChar(position: number, isBefore: boolean): number {
    /**
     * +1(234) 343|-4: remove char, shiftDigits. If lastDigit isEmpty: remove isTouched
     * +1(234) 343|-: remove char, shiftDigits. if lastDigit incompleted: remove separator chunk
     * +1(234) 343-4|: remove char, shiftDigits. if lastDigit incompleted: remove next separator chunk
     */

    const resetChunk = (c: IInputChunk): void => {
      delete c.isTouched;
      if (c.isDig) {
        c.text = "#".repeat(c.max - c.min) + "0".repeat(c.min);
      }
    };

    isBefore && --position;
    let { chunk, posChunk } = this.findChunkByCursor(position);
    if (!chunk.isDig) {
      if (chunk.index === 0 && isBefore) {
        position = chunk.text.length; // impossible to remove prefix: so set cursor to the end
      } else {
        const next = this.chunks[chunk.index + 1] as IDigChunk;
        const prev = this.chunks[chunk.index - 1] as IDigChunk;
        !next?.text && resetChunk(chunk); // clear current chunk if next isEmpty or not exists
        next && !next.text && resetChunk(next); // clear state next chunk after separator
        const canRemove = prev && !next.isTouched && prev.text.length !== prev.max; // whether possible to remove separator
        canRemove && resetChunk(chunk); // clear current chunk if possible
        // 1|-- + delete
        // 1--| + backspace
        if (isBefore) {
          position -= posChunk + (canRemove ? 0 : 1); // go to prevChunk
          posChunk = prev.text.length - 1;
          if (!canRemove) {
            chunk = prev; // "123.|456" + Backspace => "12|.456" or "12|4.56" (depends on min of prev)
          }
        } else if (!canRemove) {
          // "123|.456" + Delete
          position += chunk.text.length - posChunk; // move cursor to the end
          if (next?.isTouched) {
            chunk = next; // if next not empty go to next:  "123|.456" + Delete => "123.|56"
            posChunk = 0;
          }
        }
      }
    }

    if (chunk.isDig) {
      const was = chunk.isDig;
      chunk.text = chunk.text.substring(0, posChunk) + chunk.text.substring(posChunk + 1);
      chunk.isCompleted = chunk.text.length >= chunk.min;
      if (was && !chunk.isCompleted) {
        // shift/recalc chunks
        let prev = chunk;
        for (let i = chunk.index + 2; i < this.chunks.length; i += 2) {
          const next = this.chunks[i] as IDigChunk;
          if (!next.text.length || !next.isTouched) {
            resetChunk(next);
            break;
          }
          prev.text += next.text[0];
          next.text = next.text.substring(1);
          prev = next;
        }
        if (prev !== chunk) {
          chunk.isCompleted = true;
          prev.isCompleted = prev.text.length >= prev.min; // recalc last chunk
        } else {
          // if no digit chunks at the right need to remove separator
          const next = this.chunks[chunk.index + 1];
          if (next) {
            delete next.isTouched;
          }
        }
      }
    }

    this.updateState();
    return position;
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

// todo test with $ xx0 USD
