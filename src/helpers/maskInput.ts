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
  isDig: true;
  min: number;
  max: number;
  isCompleted?: boolean;
}

interface ISymChunk {
  index: number;
  text: string;
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
  // todo need to define new cursor position if it was pointed in options

  const chunks = parsePattern(pattern);

  if (!value) {
    const $1 = chunks[0];
    const text = $1.isDig ? "" : $1.text; // returns prefix if possible //WARN: what about suffix when prefix not defined ???
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
          --ci; // : otherwise skip this char
        }
      }
    } else {
      // console.warn("before", { chunk, pi, i, v: value[i] });
      canShift = 0;
      for (let ci = 0; ci < chunk.text.length && i < value.length; ++ci) {
        if (chunk.text[ci] === value[i] || /[., _+-/\\]/.test(value[i])) {
          ++i;
          canShift = null;
        }
      }
      // !matches && --i;
      // console.log("after", { chunk, pi, i, v: value[i] });
      // i += chunk.text.length; // analyze of chars doesn't required since it's not changable
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
    isCompleted:
      pi >= chunks.length && (!chunks[pi - 1].isDig || chunks[pi - 1].text.length >= (chunks[pi - 1] as IDigChunk).min),
    leftLength,
    chunks,
    lastChunk: chunks[pi - 1],
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
export function maskBeforeInput(
  e: InputEvent,
  pattern: string,
  options?: IMaskInputOptions
): { showRemovedChunk?: boolean } | undefined {
  options = { prediction: true, lazy: true, ...options };

  const isAdd = e.inputType === "insertText" || "insertFromPaste";
  const isDel = !isAdd && e.inputType === "deleteContentForward";
  const isBackDel = !isAdd && !isDel && e.inputType === "deleteContentBackward";
  if (!isAdd && !isDel && !isBackDel) {
    return;
  }

  const el = e.target as HTMLInputElement;
  if (el.selectionStart !== el.selectionEnd) {
    return;
  }
  (e.target as any)._prev = {
    position: el.selectionStart,
    value: el.value,
    text: e.data,
  };

  if (isAdd) {
    return;
  }

  const v = el.value;
  const from = el.selectionStart!;

  // Process delete: when user tries to remove not digit chunk need to remove the whole chunk + 1 num
  if (!options?.prediction || from !== el.selectionEnd) {
    return; // skip action if several chars are selected
  }

  const removeIndex = (isBackDel ? 0 : 1) + from - 1; // char that will be removed
  if (removeIndex >= v.length || removeIndex < 0) {
    return; // nothing to remove
  }

  // case when 1234-- for pattern 0000-- and user tries to remove last number; prediction adds removed separator again
  // let i = removeIndex;
  const mr = maskInput(el.value, pattern, options);
  const { chunk: removeChunk, cursor } = findChunkByCursor.call(mr, removeIndex);
  let i = isBackDel ? removeIndex - removeChunk.text.length + 1 : removeIndex;
  if (removeChunk.isDig) {
    // console.warn({ i });
    // if (removeChunk.text.length === 1 && i === 0) {
    //   el.selectionStart = i;
    //   el.selectionEnd = i;
    // }
    // todo: case1 when user removes required digits it's replaced by zeros but need to shift other digits from chunks
    return; // digits are removed by default
  }

  const nextChunk = mr.chunks[isBackDel ? removeChunk.index - 1 : removeChunk.index + 1];
  let next: string;
  if (
    isBackDel &&
    nextChunk?.isDig &&
    nextChunk.text.length > nextChunk.min &&
    (removeChunk !== mr.lastChunk || nextChunk.text.length < nextChunk.max)
  ) {
    if (removeChunk === mr.lastChunk && nextChunk.text.length < nextChunk.max) {
      return; // rule: "12.|"" + Backspace >>> remove only separator since optional number are possible
    }
    next = v; // rule: "123.|45.789.387" + Backspace >>> 12|.45.789.387 for ##0.##0.##0.##0
  } else {
    next = v.substring(0, i) + v.substring(from); // remove chunk otherwise it's impossible
    const willVal = next.substring(0, i) + next.substring(i + 1);
    if (isDel && next === maskInput(willVal, pattern, options).text) {
      // todo: case1 when user removes required digits it's replaced by zeros but need to shift other digits from chunks
      const iNextChunk = removeIndex - (cursor - removeChunk.text.length); // startIndex char of next chunk
      i = iNextChunk; // rule: '+|1(23' + Del >>> '+1(|3'; "123|.456.789.387" + Del '123|.456.789.387'
    }
  }

  // console.warn({ next, i, iNextChunk, v, mr, nextChunk, from, removeChunk });
  if (!next) {
    return { showRemovedChunk: true }; // rule: "+1(|..." + Backspace >>> nothing to remove and need to hide&show symbol
  }

  el.value = next;
  el.selectionStart = i;
  el.selectionEnd = i;
}

// console.warn(maskInput("+1(234) 9675-123", "+1(000) 000-0000"));
// console.warn(maskInput("1234-4-", "0000-00-00"));
// console.warn(maskInput("4+1(23", "+1(000) 000-0000"));
// console.warn(maskInput("+41(23", "+1(000) 000-0000"));

export class MaskInput {
  #lastChunk: IInputChunk = { index: -1, text: "" };
  chunks: IInputChunk[] = [];
  value = "";
  isCompleted = false;
  leftLength = 0;

  constructor(public pattern: string, private options?: IMaskInputOptions) {
    this.options = { prediction: true, lazy: true, ...options };
    this.parse("");
  }

  /** Converts pointed value to masked-value and update internal state */
  parse(value: string): string {
    const mr = maskInput(value, this.pattern, this.options);
    this.value = mr.text;
    this.chunks = mr.chunks;
    this.#lastChunk = this.chunks[this.chunks.length - 1];
    this.isCompleted = mr.isCompleted;
    this.leftLength = mr.leftLength;
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

  /** Add char at pointed position; returns next cursor position */
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
}

// const m = new MaskInput("+1(000) 000-0000");
// console.warn(m.parse);
// 12a|345678
// 123.456.78
