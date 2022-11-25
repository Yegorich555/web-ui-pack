/* eslint-disable consistent-return */
export interface IMaskInputOptions {
  /** Add next constant-symbol to allow user don't worry about non-digit values @default true */
  prediction?: boolean;
  /** Add missed zero: for pattern '0000-00' and string '1 ' result will be "0001-" @default true   */
  lazy?: boolean;
}

interface IMaskInputResult {
  /** Corrected result */
  text: string;
  /** Returns whether value completely fits pattern (isComplete) */
  isCompleted: boolean;
  /** Returns count chars of pattern that missed in value (used to maskHolder) */
  leftLength: number;
  /** Pattern splits into chunks. With detailed info about process */
  chunks: IInputChunk[];
  /** Returns lastChunk that processed */
  lastChunk: IInputChunk;
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

function parsePattern(pattern: string): IInputChunk[] {
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

/**
 * Format string accoring to pattern
 * @param value string that must be processed
 * @param pattern 0000-00-00 (for date yyyy-MM-dd), ##0.##0.##0.##0 (for IPaddress), $ ### ### ### ### ### ##0 (for currency)
 * #### where # - optional, 0 - required numbers
 */
export default function maskInput(value: string, pattern: string, options?: IMaskInputOptions): IMaskInputResult {
  options = { prediction: true, lazy: true, ...options };
  const chunks = parsePattern(pattern);

  if (!value) {
    const $1 = chunks[0];
    $1.isTouched = true;
    if ($1.isDig) {
      $1.text = "";
    }
    const { text } = $1; // returns prefix if possible //WARN: what about suffix when prefix not defined ???
    return {
      isCompleted: false,
      text,
      leftLength: pattern.length - text.length,
      chunks,
      lastChunk: $1,
    };
  }

  let pi = 0;
  let canShift: number | null = null;
  for (let i = 0; pi < chunks.length && i < value.length; ++pi) {
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
        } else if (options.lazy && /[., _+-/\\]/.test(String.fromCharCode(ascii)) && ci) {
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

  if (options.prediction && pi !== chunks.length) {
    const last = chunks[pi - 1];
    if (last.isDig && last.max === last.text.length) {
      ++pi; // append suffix if prev digitChunk is filled completely
    }
  }

  if (pi === chunks.length - 1 && (chunks[pi - 1] as IDigChunk).isCompleted) {
    ++pi; // append suffix at the end if all chunks are completed & only lacks suffix
  }

  // find leftLength for maskholder
  const last = chunks[pi - 1];
  let leftLength = last.isDig ? last.max - last.text.length : 0; // if last proccess chunk is digit than need to call diff actual and max
  for (let i = pi; i < chunks.length; ++i) {
    leftLength += chunks[i].text.length;
  }

  const r: IMaskInputResult = {
    text: chunks.reduce((str, c, i) => (i < pi ? str + c.text : str), ""),
    // isCompleted: pi >= chunks.length && (!last.isDig || last.text.length >= last.min),
    isCompleted: pi >= chunks.length && (!last.isDig || !!last.isCompleted),
    leftLength,
    chunks,
    lastChunk: last,
  };

  return r;
}

/** Returns chunk related to input.selectionStart */
function findChunkByCursor(this: IMaskInputResult, inputCursor: number): { chunk: IInputChunk; cursor: number } {
  const chunk = this.chunks.find((c) => {
    inputCursor -= c.text.length;
    return inputCursor < 0;
  })!;
  return { chunk, cursor: chunk.text.length + inputCursor };
}

/* Call it on 'beforeinput' event to improve logic */
export function maskBeforeInput(e: InputEvent): void {
  const el = e.target as HTMLInputElement;
  if (el.selectionStart !== el.selectionEnd) {
    delete (el as any)._prev;
    return;
  }

  (el as any)._prev = {
    position: el.selectionStart,
    value: el.value,
    text: e.data,
  };
}

export class MaskInput {
  #lastChunk: IInputChunk = { index: -1, text: "" };
  chunks: IInputChunk[] = [];
  value = "";
  isCompleted = false;
  leftLength = 0;
  prefix = "";

  constructor(public pattern: string, private options?: IMaskInputOptions) {
    this.options = { prediction: true, lazy: true, ...options };
    this.parse("");
    this.prefix = this.chunks[0].isDig ? this.chunks[0].text : "";
  }

  /** Converts pointed value to masked-value and update internal state */
  parse(value: string): string {
    const mr = maskInput(value, this.pattern, this.options);
    // todo remove calculation from maskInput
    this.chunks = mr.chunks;
    this.updateState();
    return this.value;
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
        // || chunk.text.length === chunk.max) {
        // shift to the next chunk if insert into separator or digitChunk reached max
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

  /** Delete a char after pointed position: when user presses 'Delete';
   *  @returns next cursor position */
  deleteAfter(position: number): number {
    throw new Error("Method not implemented.");
  }

  /** Delete a char before pointed position: when user presses 'Backspace'
   *  @returns next cursor position */
  deleteBefore(position: number): number {
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

    --position;
    let { chunk, posChunk } = this.findChunkByCursor(position);
    if (!chunk.isDig) {
      if (chunk.index === 0) {
        position = chunk.text.length; // impossible to remove prefix: so set cursor to the end
      } else {
        const next = this.chunks[chunk.index + 1] as IDigChunk;
        !next?.text && resetChunk(chunk);
        next && !next.text && resetChunk(next); // clear state next chunk after separator

        position -= posChunk + 1;
        chunk = this.chunks[chunk.index - 1]; // go to prevChunk
        posChunk = chunk.text.length - 1;
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

      this.updateState();
    }

    return position;
  }

  /** Update state based on chunks; call it when chunks are changed to recalc value etc. */
  private updateState(): void {
    // find last processed chunk
    let l = this.chunks.findIndex((c) => !c.isTouched) - 1;
    const endIndex = this.chunks.length - 1;
    if (l === -2) {
      l = endIndex;
    } else if (l === endIndex && (this.chunks[l] as IDigChunk).isCompleted) {
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

    // console.warn("update state", this, this.#lastChunk);
  }
}

/**
 * +1(234) 343|-4: remove char, shiftDigits. If lastDigit isEmpty: remove isTouched
 * +1(234) 343|-: remove char, shiftDigits. if lastDigit incompleted: remove separator chunk
 * +1(234) 343-4|: remove char, shiftDigits. if lastDigit incompleted: remove next separator chunk
 * ##0|.##0
 */

// const testChunks = [
//   { text: "+1(", index: 0, isTouched: true },
//   { text: "123", isDig: true, max: 3, min: 3, index: 1, isTouched: true, isCompleted: true },
//   { text: ") ", index: 2, isTouched: true },
//   /** removed chunks */
//   { text: "21", isDig: true, max: 3, min: 3, index: 3, isTouched: true, isCompleted: false },
//   { text: "-", index: 4, isTouched: true },

//   { text: "", isDig: true, max: 4, min: 4, index: 5, isTouched: true, isCompleted: false },
// ];

// const testChunks2 = [
//   { text: "+1(", index: 0, isTouched: true },
//   { text: "123", isDig: true, max: 3, min: 3, index: 1, isTouched: true, isCompleted: true },
//   { text: ") ", index: 2, isTouched: true },
//   /** removed chunks */
//   { text: "213", isDig: true, max: 3, min: 3, index: 3, isTouched: true, isCompleted: false },
//   { text: "-", index: 4, isTouched: true },
//   { text: "4", isDig: true, max: 4, min: 4, index: 5, isTouched: true, isCompleted: false },
// ];
