import WUPTextAreaInput, { charsBefore, pointAt } from "./textArea.input";
import TextRichHistory from "./textRich.history";
import * as Utils from "./textRich.utils";

/** Tool name, tool & checker of element by `is` */
type ToolEntry = [keyof WUP.TextRich.ToolValues, WUP.TextRich.Tool, ((el: Element) => boolean) | undefined];

/** Contenteditable element with html value: applies formats & handles typing (pending formats, tokens, recognizing etc.) */
export default class WUPTextRichInput extends WUPTextAreaInput {
  /** Static $tools of control (by name): sanitizer keeps their formats (see setTools) */
  _tools = {} as WUP.TextRich.Tools;
  /** Static $wrapChars of control: opening => closing char */
  _wrapChars = new Map<string, string>();
  /** History of control: custom changes are saved via it (see changeContent) */
  _history?: TextRichHistory;
  /** Returns true if tool works: it's rendered in toolbar (hidden ones too); otherwise it isn't recognized & typed as token */
  _isActive?: (name: keyof WUP.TextRich.ToolValues) => boolean;
  /** Called when formats at caret can be changed without selection change: content or pending formats */
  _onFormats?: () => void;
  /** Entries of `_tools` with checker of element by `is`: cached via setTools */
  _entries: ToolEntry[] = [];

  /** Sanitized html (empty string if there is no text or embeds): see Utils.Html.fromEditor */
  override get value(): string {
    this._cached ??= Utils.Html.fromEditor(this, this._tools);
    return this._cached;
  }

  override set value(v: string) {
    if (v && v === this.value) {
      return; // re-render resets selection & scroll (empty value still clears empty lines)
    }
    this._cached = undefined;
    this.replaceChildren(Utils.Html.toEditor(v, this._tools));
  }

  /** Sets tools & updates their caches: call it when tools or toolbar are changed (see `_isActive`) */
  setTools(tools: WUP.TextRich.Tools): void {
    this._tools = tools;
    this._entries = (Object.entries(tools) as Array<[keyof WUP.TextRich.ToolValues, WUP.TextRich.Tool]>).map(
      ([k, t]) => [k, t, t.is && ((el) => t.is!(el as HTMLElement) !== undefined)]
    );
    const embeds = this._entries.filter(([, t, is]) => t.kind === "embed" && is);
    this._isEmbed = embeds.length ? (el) => embeds.some(([, , is]) => is!(el)) : undefined;
    // tool with values (mentions of users etc.): value is chosen via menu (`trigger`)
    this.#recognizers = this._entries
      .filter(([k, t]) => t.recognize && !t.values?.length && this._isActive?.(k))
      .map(([, t]) => t);
  }

  /** Returns selection (anchor & focus) as char offsets (line break & embed = 1 char): valid even if nodes are re-rendered;
   *  wraps loose inline content into lines at first (Chrome doesn't wrap the 1st line: `abc<div>def</div>`, `<div><br></div>abc`) */
  getSelectionPos(): [number, number] {
    const sel = window.getSelection()!;
    // (editor, index) => (child, 0), the end of editor => the end of the last child: otherwise index is wrong
    // after wrapping (or out of editor: IndexSizeError) & formats find no line (caret isn't inside it)
    const childPos = (n: Node, offset: number): [Node, number] => {
      let c: Node | null = n === this ? this.childNodes[offset] ?? this.lastChild : null;
      if (!c) {
        return [n, offset];
      }
      const isEnd = c !== this.childNodes[offset];
      // list isn't line: into its 1st item or to the end of the last one (& of nested list at the end of item)
      const inner = (x: Node): Node | null =>
        Utils.listTags.has(x.nodeName)
          ? (x as Element)[isEnd ? "lastElementChild" : "firstElementChild"]
          : (isEnd && Utils.listTags.has(x.lastChild?.nodeName ?? "") && x.lastChild) || null;
      for (let x = inner(c); x; x = inner(c)) {
        c = x;
      }
      return isEnd ? [c, c.nodeType === Node.TEXT_NODE ? (c as Text).length : c.childNodes.length] : [c, 0];
    };
    const [an, ao] = childPos(sel.anchorNode!, sel.anchorOffset);
    const [fn1, fo] = childPos(sel.focusNode!, sel.focusOffset);
    const isMoved = an !== sel.anchorNode || fn1 !== sel.focusNode;
    // again after wrapping: empty editor gets the 1st line (caret goes into it)
    (Utils.Lines.wrap(this) || isMoved) && sel.setBaseAndExtent(...childPos(an, ao), ...childPos(fn1, fo));
    const isEmbed = this._isEmbed;
    return [
      charsBefore(this, sel.anchorNode!, sel.anchorOffset, isEmbed),
      charsBefore(this, sel.focusNode!, sel.focusOffset, isEmbed),
    ];
  }

  /** Sets selection by char offsets (see getSelectionPos) */
  setSelectionPos([a, f]: [number, number]): void {
    const isEmbed = this._isEmbed;
    window.getSelection()!.setBaseAndExtent(...pointAt(this, a, isEmbed), ...pointAt(this, f, isEmbed));
  }

  /** Returns formats of selection (+ pending ones for the next typed text): tool => value
   *  of the nearest element at selection start or of its line (see `is` & `kind`) */
  getFormats(): Map<keyof WUP.TextRich.ToolValues, unknown> {
    const m = new Map<keyof WUP.TextRich.ToolValues, unknown>();
    const sel = window.getSelection();
    const n = sel?.rangeCount ? Utils.Ranges.firstNode(sel.getRangeAt(0)) : null;
    if (n && this.contains(n)) {
      const line = Utils.Lines.at(n, this);
      this._entries.forEach(([name, t, is]) => {
        const el = is && (t.kind === "line" || t.kind === "lineStyle" ? line : Utils.Formats.parents(n, is, this)[0]);
        const v = el ? t.is!(el as HTMLElement) : undefined;
        v !== undefined && m.set(name, v);
      });
      this.#pending.forEach((v, k) => (v === false ? m.delete(k) : m.set(k, v)));
    }
    return m;
  }

  /** Applies tool with value to selection: inline format with collapsed selection is pending for the next typed text
   *  (like quill), otherwise `format` of tool or default one is applied (see formatSelection)
   * @param isSet set value (dropdown item, asked value etc.), otherwise toggle format (button)
   * @param control for `format` of tool */
  applyFormat(
    name: keyof WUP.TextRich.ToolValues,
    value: unknown,
    isSet: boolean,
    control: WUP.TextRich.FormatContext["control"]
  ): void {
    const tool = this._tools[name];
    const sel = window.getSelection()!;
    if (sel.isCollapsed && ((tool.kind === "inline" && !tool.ask && !tool.trigger) || name === "clean")) {
      // pending format for the next typed text (Ctrl+B and type)
      const f = this.getFormats();
      const p = this.#pending;
      if (name === "clean") {
        this._entries.forEach(([k, t]) => t.kind === "inline" && !t.ask && !t.trigger && f.has(k) && p.set(k, false));
      } else {
        const isOff = !value || (!isSet && Utils.Formats.isMatch(f.get(name), value)); // toggle
        p.set(name, !isOff && value);
      }
      this.#pendingAt = [sel.anchorNode!, sel.anchorOffset];
      this._onFormats?.();
    } else {
      this.changeContent(() => this.formatSelection(tool, value, isSet, control));
    }
  }

  /** $insert placed caret: formatSelection doesn't restore selection */
  #isInserted = false;

  /** Applies `format` of tool or default one & restores selection by positions (format can move or split nodes);
   *  then joins split text nodes & removes empty `style` attributes */
  protected formatSelection(
    tool: WUP.TextRich.Tool,
    value: unknown,
    isSet: boolean,
    control: WUP.TextRich.FormatContext["control"]
  ): void {
    const pos = this.getSelectionPos();
    this.#isInserted = false;
    const range = window.getSelection()!.getRangeAt(0); // after getSelectionPos: it wraps lines
    let lines = tool.format && Utils.Lines.of(range, this); // before custom format: it can move range
    let texts: Text[] | undefined;
    const editor = this;
    const ctx: WUP.TextRich.FormatContext = {
      range,
      value,
      isSet,
      get lines() {
        return (lines ??= Utils.Lines.of(range, editor));
      },
      get texts() {
        return (texts ??= Utils.Ranges.split(range));
      },
      editor,
      tool,
      control,
      applyDefault: () => this.formatByKind(ctx),
    };
    tool.format ? tool.format(ctx) : this.formatByKind(ctx);
    this.normalize();
    this.querySelectorAll("[style='']").forEach((el) => el.removeAttribute("style"));
    !this.#isInserted && this.setSelectionPos(pos);
  }

  /** Creates token (placeholder, mention): `{firstName}`, `@john` */
  protected createToken(tool: WUP.TextRich.Tool, value: unknown): HTMLElement {
    const el = Utils.Formats.create(tool, value);
    el.textContent = tool.trigger! + value + (this._wrapChars.get(tool.trigger!) ?? "");
    return el;
  }

  /** Applies default format by `kind`: sets value if `isSet`, otherwise toggles format */
  protected formatByKind(ctx: WUP.TextRich.FormatContext): void {
    const { tool, value, isSet, editor } = ctx; // lines & texts are lazy: read below only where needed
    switch (tool.kind) {
      case "inline": {
        const any = (el: Element): boolean => tool.is!(el as HTMLElement) !== undefined;
        if (tool.trigger && isSet && value !== false) {
          // token replaces selection or token around caret
          const cur = Utils.Formats.parents(ctx.range.startContainer, any, editor)[0];
          cur && Utils.Ranges.select(cur);
          this.$insert(this.createToken(tool, value));
          break;
        }
        const { texts } = ctx;
        const f = (el: Element): boolean => Utils.Formats.isMatch(tool.is!(el as HTMLElement), value);
        if (isSet || !value) {
          Utils.Formats.removeInline(texts, any, editor);
          value && Utils.Formats.addInline(texts, Utils.Formats.create(tool, value), editor, f);
        } else {
          // single value only: remove other values (sub vs super)
          value !== true && Utils.Formats.removeInline(texts, (el) => any(el) && !f(el), editor);
          texts.every((t) => Utils.Formats.parents(t, f, editor).length)
            ? Utils.Formats.removeInline(texts, f, editor)
            : Utils.Formats.addInline(texts, Utils.Formats.create(tool, value), editor, f);
        }
        break;
      }
      case "line":
      case "lineStyle": {
        const { lines } = ctx;
        const isOff = !value || (!isSet && lines.every((l) => Utils.Formats.isMatch(tool.is?.(l), value)));
        lines.forEach((l) => {
          if (tool.kind === "line") {
            // new element: otherwise <div> keeps attributes of format (class etc.)
            Utils.Lines.setTag(l, isOff ? document.createElement("div") : Utils.Formats.create(tool, value));
          } else {
            tool.set!(l, isOff ? undefined : value);
          }
        });
        break;
      }
      case "embed":
        this.$insert(Utils.Formats.create(tool, value)); // caret goes after it
        break;
      default: // action
    }
  }

  /** Runs custom change of editor: saves history, updates value (fires `input`) & toolbar */
  changeContent(fn: () => void): void {
    const h = this._history;
    const prev = this.value;
    // otherwise history saves selection after changes (wrong for insertion)
    const isState = h && !h._stateBeforeInput;
    isState && (h._stateBeforeInput = h.inputState);
    fn();
    this._cached = undefined;
    if (this.value !== prev) {
      h?.save(prev, this.value);
      this._keepCache = true; // value is sanitized already: skip it on input
      this.fireInput();
    } else if (isState) {
      h._stateBeforeInput = undefined;
    }
    this._onFormats?.();
  }

  /** Replaces selection with node & places caret after it */
  $insert(node: Node): void {
    const sel = window.getSelection()!;
    const r = sel.getRangeAt(0);
    const last = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node.lastChild : node;
    r.deleteContents();
    r.insertNode(node);
    last && r.setStartAfter(last);
    sel.collapse(r.startContainer, r.startOffset); // empty fragment (deletion): Chrome keeps selection not collapsed
    this.#isInserted = true;
  }

  /** Fires `input` to update value of control after custom changes */
  protected fireInput(): void {
    this.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }

  /** Pending formats for the next typed text: tool => value (`false` removes format) */
  #pending = new Map<keyof WUP.TextRich.ToolValues, unknown>();
  /** Caret position of pending formats: they're reset when caret moves */
  #pendingAt?: [Node, number];

  /** Called on selection change inside editor: pending formats are reset if caret moves */
  gotSelect(): void {
    const sel = window.getSelection()!;
    const p = this.#pendingAt;
    p && (sel.anchorNode !== p[0] || sel.anchorOffset !== p[1]) && this.#pending.clear();
  }

  /** Called when control loses focus: pending formats are reset & recognizing is resumed */
  gotFocusLost(): void {
    this.#pending.clear();
    this.#isAutoPaused = false;
  }

  /** Inserts text typed at token edge outside it: otherwise browser extends token (`{firstName}x`)
   * @returns false if caret isn't at token edge */
  protected insertOutOfToken(text: string): boolean {
    const sel = window.getSelection()!;
    const n = sel.focusNode;
    if (!sel.isCollapsed || !n) {
      return false;
    }
    const isToken = (el: Element): boolean =>
      this._entries.some(([, t, is]) => t.kind === "inline" && t.trigger && is?.(el));
    const off = sel.focusOffset;
    const kids = n.childNodes;
    // caret inside token (the outer one) or next to it (after insertion): browser types into the previous node
    const el =
      Utils.Formats.parents(n, isToken, this).pop() ??
      [kids[off - 1], kids[off]].find((x): x is Element => x instanceof Element && isToken(x));
    if (!el) {
      return false;
    }
    const isStart = !Utils.Ranges.textAt(el, n, off, true);
    if (!isStart && Utils.Ranges.textAt(el, n, off)) {
      return false; // caret in the middle: edit token text
    }
    const t = document.createTextNode(text);
    isStart ? el.before(t) : el.after(t);
    sel.collapse(t, t.length);
    return true;
  }

  /** Returns inline formats (except tokens) whose elements end at caret (or start if `isStart`): tool & the outer element */
  protected formatsAt(isStart?: boolean): Array<[keyof WUP.TextRich.ToolValues, Element]> {
    const sel = window.getSelection()!;
    const n = sel.focusNode;
    const arr: Array<[keyof WUP.TextRich.ToolValues, Element]> = [];
    if (sel.isCollapsed && n) {
      this._entries.forEach(([name, t, is]) => {
        const el = is && t.kind === "inline" && !t.trigger && Utils.Formats.parents(n, is, this).pop(); // the outer one
        el && !Utils.Ranges.textAt(el, n, sel.focusOffset, isStart) && arr.push([name, el]);
      });
    }
    return arr;
  }

  /** Elements left via arrows (see leaveFormats): text typed out of them isn't joined on recognizing (see `recognize`) */
  #left = new WeakSet<Element>();

  /** ArrowRight at the end of formatted element (bold, link etc.) or ArrowLeft at its start: the next typed text goes out of it,
   *  the opposite arrow returns into it (caret stays visually)
   * @returns false if there is nothing to leave/return */
  leaveFormats(isRight: boolean): boolean {
    const p = this.#pending;
    const back = this.formatsAt(isRight).filter(([k]) => p.get(k) === false); // left via the opposite arrow
    const arr = back.length ? back : this.formatsAt(!isRight).filter(([k]) => p.get(k) !== false);
    if (!arr.length) {
      return false;
    }
    arr.forEach(([k, el]) => {
      if (back.length) {
        p.delete(k);
      } else {
        p.set(k, false);
        this.#left.add(el);
      }
    });
    const sel = window.getSelection()!;
    this.#pendingAt = [sel.anchorNode!, sel.anchorOffset];
    this._onFormats?.();
    return true;
  }

  /** Inserts typed text with formats shown by toolbar: pending ones or of elements ending at caret
   *  (otherwise Chrome types after link)
   * @returns false if browser can insert it as usual */
  protected insertTyped(text: string): boolean {
    const sel = window.getSelection()!;
    if (!this.#pending.size) {
      const isEnd = !!this.formatsAt().length;
      isEnd && sel.collapse(...Utils.Ranges.insertText(sel.focusNode!, sel.focusOffset, text));
      return isEnd;
    }
    const tools = this._tools;
    const r = sel.getRangeAt(0);
    r.deleteContents();
    // move caret out of elements of removed/changed formats (`true` - added toggle format)
    this.#pending.forEach((v, k) => {
      const is = (x: Element): boolean => tools[k].is!(x as HTMLElement) !== undefined;
      const el = v !== true && Utils.Formats.parents(r.startContainer, is, this).pop(); // the outer one
      el && Utils.Formats.splitAt(el, r, this._isEmbed);
    });
    const t = document.createTextNode(text);
    let node: Node = t;
    this.#pending.forEach((v, k) => {
      const is = (x: Element): boolean => Utils.Formats.isMatch(tools[k].is!(x as HTMLElement), v);
      if (v !== false && !Utils.Formats.parents(r.startContainer, is, this).length) {
        const el = Utils.Formats.create(tools[k], v);
        el.appendChild(node);
        node = el;
      }
    });
    r.insertNode(node);
    sel.collapse(t, t.length);
    this.#pending.clear();
    return true;
  }

  /** Wraps selection into typed char & its pair (see `_wrapChars`), keeps content selected;
   *  edge whitespaces stay outside (double click on Windows selects trailing space, triple click - line break)
   * @returns false if char has no pair or selection has no visible content */
  wrapSelection(open: string): boolean {
    const close = this._wrapChars.get(open);
    const sel = window.getSelection()!;
    if (sel.isCollapsed || !close) {
      return false;
    }
    const r = sel.getRangeAt(0);
    const inner = document.createRange(); // from the 1st visible char (or embed) to the last one
    const w = document.createTreeWalker(r.commonAncestorContainer, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n: Node | null = w.currentNode; n; n = w.nextNode()) {
      if (!Utils.Ranges.intersects(r, n)) {
        continue;
      }
      if (n.nodeType === Node.TEXT_NODE) {
        const t = n as Text;
        const from = t === r.startContainer ? r.startOffset : 0;
        const s = t.data.slice(0, t === r.endContainer ? r.endOffset : undefined);
        const i = s.slice(from).search(/\S/);
        if (i !== -1) {
          inner.collapsed && inner.setStart(t, from + i);
          inner.setEnd(t, s.trimEnd().length);
        }
      } else if (this._isEmbed?.(n as Element)) {
        inner.collapsed && inner.setStartBefore(n);
        inner.setEndAfter(n);
        while (n.lastChild) {
          n = n.lastChild; // skip embed content
        }
        w.currentNode = n;
      }
    }
    if (inner.collapsed) {
      return false;
    }
    this.changeContent(() => {
      // live range: its end stays before closing char & shifts by inserted opening char
      const { startContainer, startOffset } = inner;
      Utils.Ranges.insertText(inner.endContainer, inner.endOffset, close);
      inner.setStart(...Utils.Ranges.insertText(startContainer, startOffset, open));
      Utils.Ranges.select(inner);
    });
    return true;
  }

  /** Returns text between trigger & its pair (see `_wrapChars`) at the end of string (`{someProp}` => `someProp`)
   * @returns `undefined` if there is no pair at the end or text is empty or has whitespaces */
  typedValue(s: string, trigger: string): string | undefined {
    const pair = this._wrapChars.get(trigger);
    if (!pair || !s.endsWith(pair)) {
      return undefined;
    }
    const i = s.lastIndexOf(trigger, s.length - pair.length - 1);
    const v = i < 0 ? "" : s.slice(i + trigger.length, -pair.length);
    return v && !/\s/.test(v) ? v : undefined;
  }

  /** Returns token completed by typed pair of trigger (see `_wrapChars`) even if it isn't in values
   *  (`{someProp` + `}` gives placeholder `someProp`) unless `is` rejects it; typed text is selected to be replaced
   * @returns tool name & value or `undefined` if typed text isn't token */
  tokenEnd(data: string): [keyof WUP.TextRich.ToolValues, string] | undefined {
    const sel = window.getSelection()!;
    const n = sel.focusNode as Text | null;
    if (!sel.isCollapsed || n?.nodeType !== Node.TEXT_NODE) {
      return undefined;
    }
    const s = n.data.slice(0, sel.focusOffset) + data;
    let typed: string | undefined;
    const found = this._entries.find(([k, t]) => {
      const tr = t.kind === "inline" && t.trigger;
      typed = tr ? this.typedValue(s, tr) : undefined;
      // `is` can reject value: unknown placeholder etc.
      return typed && this._isActive?.(k) && t.is?.(this.createToken(t, typed)) !== undefined;
    });
    if (!found) {
      return undefined;
    }
    sel.setBaseAndExtent(n, sel.focusOffset - typed!.length - found[1].trigger!.length, n, sel.focusOffset);
    return [found[0], typed!];
  }

  /** Tools with `recognize` that work (see `_isActive`): cached via setTools */
  #recognizers: WUP.TextRich.Tool[] = [];
  /** Elements of recognized text in line at caret (`<a href="https://a.com">https://a.com</a>`): taken before input,
   *  so they follow their text after it */
  #auto: Element[] = [];
  /** Undo/redo pauses recognizing of new text till caret leaves word (whitespace, Enter, navigation keys, click, blur) */
  #isAutoPaused = false;

  /** Resumes recognizing paused by undo/redo: caret leaves word (navigation keys, click) */
  resumeRecognize(): void {
    this.#isAutoPaused = false;
  }

  /** Returns line of node (see Utils.Lines.at) or editor for loose content: Chrome doesn't wrap the 1st line */
  protected lineOf(n: Node): HTMLElement {
    return Utils.Lines.at(n, this) ?? this;
  }

  /** Remembers elements of recognized text in line at caret (their text gives the same element): see `recognize` */
  collectAuto(): void {
    const tools = this.#recognizers;
    const n = window.getSelection()?.focusNode;
    this.#auto = [];
    if (tools.length && n && this.contains(n)) {
      // eslint-disable-next-line no-restricted-syntax
      for (const x of this.lineOf(n).getElementsByTagName("*")) {
        tools.some(
          (t) =>
            t.is!(x as HTMLElement) !== undefined && Utils.Formats.isSame(Utils.Formats.create(t, x.textContent!), x)
        ) && this.#auto.push(x);
      }
    }
  }

  /** Wraps recognized word at caret into element of tool while user types: link, email etc. (see `Tool.recognize`);
   *  element of recognized text follows its text: it's updated on typing & removed if text isn't recognized anymore;
   *  new element is a separate undo step (after undo text isn't recognized till caret leaves word)
   * @returns false if nothing is changed */
  recognize(): boolean {
    const sel = window.getSelection()!;
    const n = sel.focusNode;
    const tools = this.#recognizers;
    if (!tools.length || !sel.isCollapsed || !n || !this.contains(n)) {
      return false;
    }
    const line = this.lineOf(n);
    if (line.tagName === "PRE") {
      return false; // code block
    }
    const isEmbed = this._isEmbed;
    const [before, rest] = Utils.Lines.textAround(line, n, sel.focusOffset, isEmbed);
    const after = /^\S*/.exec(rest)![0]; // the rest of word
    let s = before + after;
    let found = this.recognizeEnd(s, tools);
    while (!found && /[\s.,;:!?'")\]}-]$/.test(s)) {
      s = s.slice(0, -1); // `(see https://example.com).`, typed whitespace or separator (`+1 (359) 232-`)
      found = this.recognizeEnd(s, tools);
    }
    const at = charsBefore(line, n, sel.focusOffset, isEmbed); // caret
    const end = at - before.length + s.length; // without punctuation
    const start = found ? end - found[0].length : Math.max(0, at - 1);
    // elements of recognized text around caret (with typed whitespace etc.): replaced or removed
    const r = document.createRange();
    r.setStart(...pointAt(line, start, isEmbed));
    r.setEnd(...pointAt(line, Math.max(end, at + after.length), isEmbed));
    // element left via arrow joins text typed only inside it
    const olds = this.#auto.filter(
      (x) => line.contains(x) && Utils.Ranges.intersects(r, x) && (!this.#left.has(x) || x.contains(n))
    );
    const update = (fn?: () => void): true => {
      this.changeContent(() => {
        olds.forEach((x) => x.replaceWith(...x.childNodes));
        fn?.(); // wraps new text
        line.normalize();
        sel.collapse(...pointAt(line, at, isEmbed));
      });
      return true;
    };
    if (!found) {
      return !!olds.length && update();
    }
    const [text, el] = found;
    r.setEnd(...pointAt(line, end, isEmbed));
    if (
      // the same tag (link with other text etc.): text is formatted already
      Array.prototype.some.call(
        line.getElementsByTagName(el.tagName),
        (x) => !olds.includes(x) && Utils.Ranges.intersects(r, x)
      ) ||
      (olds.length === 1 && olds[0].textContent === text && Utils.Formats.isSame(olds[0], el)) || // nothing is changed
      (!olds.length && this.#isAutoPaused)
    ) {
      return false;
    }
    !olds.length && this._history?.commit(); // new element: separate undo step
    return update(() => {
      r.setStart(...pointAt(line, start, isEmbed));
      r.setEnd(...pointAt(line, end, isEmbed));
      Utils.Formats.addInline(Utils.Ranges.split(r), el, line); // element per part: text can be split by formats
    });
  }

  /** Inserts typed text instead of selection with element of recognized text (placeholder of command etc.) as plain text:
   *  otherwise Chrome keeps element (link with the previous url); typed text is recognized again (see `recognize`)
   * @returns false if selection has no such elements */
  protected replaceAuto(text: string): boolean {
    const sel = window.getSelection()!;
    if (sel.isCollapsed) {
      return false;
    }
    const r = sel.getRangeAt(0);
    const arr = this.#auto.filter((x) => Utils.Ranges.intersects(r, x));
    if (!arr.length) {
      return false;
    }
    r.deleteContents();
    arr.forEach((x) => x.isConnected && x.replaceWith(...x.childNodes));
    const t = document.createTextNode(text);
    r.insertNode(t);
    sel.collapse(t, t.length);
    return true;
  }

  /** Called after typing or deleting: syncs recognized text with its element (see `recognize`) */
  gotRecognize(data: string | null): void {
    this.recognize();
    data && !data.trim() && (this.#isAutoPaused = false); // caret leaves word
  }

  /** Returns true if element is recognized text (link etc.) or token (mention etc.): it isn't continued in the next line */
  #isWrapped = (x: Element): boolean =>
    this._entries.some(([, t, is]) => t.kind === "inline" && (!!t.recognize || !!t.trigger) && is!(x));

  /** Called after line break: Chrome copies formats of caret into the new line, so empty copies of recognized text, tokens
   *  & formats turned off (Bold toggled off, left via arrow) are removed; pending formats stay for the next typed text */
  protected gotLineBreak(): void {
    const sel = window.getSelection()!;
    const n = sel.focusNode!; // in editor: it's called on input of line break
    const p = this.#pending;
    const isOff = (x: Element): boolean =>
      Array.from(p).some(([k, v]) => v === false && this._tools[k].is!(x as HTMLElement) !== undefined);
    Utils.Formats.parents(n, (x) => !x.textContent && (this.#isWrapped(x) || isOff(x)), this.lineOf(n)).forEach((x) =>
      x.replaceWith(...x.childNodes)
    );
    p.size && (this.#pendingAt = [sel.anchorNode!, sel.anchorOffset]); // otherwise caret moved to the new line resets them
  }

  /** Called before line break: caret at the end of recognized text (link etc.) goes out of its element,
   *  otherwise browser adds line break into it */
  protected leaveAuto(): void {
    this.recognize();
    this.#isAutoPaused = false;
    const sel = window.getSelection()!;
    const n = sel.focusNode;
    if (!sel.isCollapsed || !n || !this.contains(n)) {
      return;
    }
    const el = Utils.Formats.parents(n, this.#isWrapped, this.lineOf(n)).pop();
    if (el && !Utils.Ranges.textAt(el, n, sel.focusOffset)) {
      const r = document.createRange();
      r.setStartAfter(el);
      sel.collapse(r.startContainer, r.startOffset);
    }
  }

  /** Returns recognized end of text & its element by the 1st matched tool (see `Tool.recognize`) */
  protected recognizeEnd(s: string, tools: WUP.TextRich.Tool[]): [string, HTMLElement] | undefined {
    let found: [string, HTMLElement] | undefined;
    tools.some((t) => {
      const r = t.recognize!;
      const text = typeof r === "function" ? r(s) : r.exec(s)?.[0];
      const el = text && s.endsWith(text) && Utils.Formats.create(t, text);
      found = el && t.is!(el) !== undefined ? [text, el] : undefined; // invalid url etc.
      return found;
    });
    return found;
  }

  /** Replaces selection with sanitized html: blocks split the current line at caret */
  insertHTML(html: string): void {
    const f = Utils.Html.toEditor(html, this._tools);
    const sel = window.getSelection()!;
    this.getSelectionPos(); // wraps loose content: otherwise caret at editor root has no line
    this.deleteLines(sel.getRangeAt(0)) || sel.getRangeAt(0).deleteContents(); // the rest of the last line joins the 1st one
    const r = sel.getRangeAt(0);
    const line = Utils.Lines.at(r.startContainer, this);
    const first = f.firstElementChild;
    if (!first) {
      return;
    }
    if ((f.childNodes.length === 1 && first.tagName === "DIV") || !line || line.tagName === "LI") {
      // inline content: lines are separated by <br>
      const frag = document.createDocumentFragment();
      const flatten = (el: Element): void => {
        if (Utils.listTags.has(el.tagName)) {
          Array.from(el.children).forEach(flatten);
          return;
        }
        frag.lastChild && frag.append(document.createElement("br"));
        Array.from(el.childNodes).forEach((n) =>
          Utils.listTags.has(n.nodeName) ? flatten(n as Element) : frag.append(n)
        );
      };
      Array.from(f.children).forEach(flatten);
      this.$insert(frag);
      return;
    }
    const last = f.lastChild!;
    Utils.Formats.splitAt(line, r, this._isEmbed); // empty parts are removed
    r.insertNode(f);
    window.getSelection()!.collapse(last, last.childNodes.length);
  }

  /** Deletes range across lines instead of browser (it wraps moved content into `<span style>`):
   *  the rest of the last line joins the 1st one; if the 1st line is deleted from its start, the last line keeps its tag
   *  (triple click on heading + Delete doesn't turn the next paragraph into heading);
   *  if everything is deleted, the empty line becomes a plain paragraph
   * @returns false if range is in a single line or nested lists are involved (browser deletes it) */
  protected deleteLines(sr: AbstractRange | undefined): boolean {
    const a = sr && Utils.Lines.at(sr.startContainer, this);
    const b = sr && Utils.Lines.at(sr.endContainer, this);
    if (!a || !b || a === b || a.contains(b) || b.parentElement!.closest("li")) {
      return false;
    }
    const isEmbed = this._isEmbed;
    const pos = charsBefore(this, sr.startContainer, sr.startOffset, isEmbed);
    const isRest = // content after range in the last line
      charsBefore(b, sr.endContainer, sr.endOffset, isEmbed) < charsBefore(b, b, b.childNodes.length, isEmbed);
    const isKeep = !charsBefore(a, sr.startContainer, sr.startOffset, isEmbed); // the 1st line is deleted entirely
    if (!isKeep && isRest && b.querySelector("ol,ul")) {
      return false;
    }
    const r = document.createRange();
    r.setStart(sr.startContainer, sr.startOffset);
    r.setEnd(sr.endContainer, sr.endOffset);
    r.deleteContents();
    const remove = (l: HTMLElement): void => {
      const list = l.parentElement!;
      l.remove();
      Utils.listTags.has(list.tagName) && !list.firstElementChild && list.remove();
    };
    if (isKeep) {
      if (!isRest) {
        // everything is deleted: plain paragraph without leftovers
        b.replaceChildren(document.createElement("br"));
        Utils.Lines.setTag(b, document.createElement("div")).removeAttribute("style");
      }
      remove(a);
    } else {
      if (isRest) {
        a.lastChild?.nodeName === "BR" && a.lastChild.remove(); // otherwise it breaks merged line
        a.append(...b.childNodes);
      }
      remove(b);
    }
    this.normalize();
    this.setSelectionPos([pos, pos]);
    return true;
  }

  /** Called on `beforeinput` before changes: undo/redo pauses recognizing (otherwise undone link is recognized again
   *  on typing), other input collects elements of recognized text (see `recognize`) */
  gotBeforeInput(e: InputEvent): void {
    e.inputType.startsWith("history") ? (this.#isAutoPaused = true) : this.collectAuto();
  }

  /** Replaces browser input with custom changes: sanitized paste, typed text (pending formats, out of tokens & recognized
   *  text), deleting across lines; line break leaves recognized text
   * @returns true if input is replaced: event is prevented & `input` is fired (without inputType) */
  replaceInput(e: InputEvent): boolean {
    const t = e.inputType;
    const s = t === "insertText" && e.data;
    (t === "insertParagraph" || t === "insertLineBreak") && this.leaveAuto();
    const isPaste = t === "insertFromPaste" || t === "insertFromPasteAsQuotation" || t === "insertFromDrop";
    const html = isPaste && e.dataTransfer?.getData("text/html");
    if (html) {
      // sanitized: otherwise browser pastes anything (images, colors etc.)
      e.preventDefault();
      const [r] = e.getTargetRanges();
      this.focus({ preventScroll: true });
      r && Utils.Ranges.select(r);
      this.insertHTML(html);
    } else if (
      (s && (this.replaceAuto(s) || this.insertOutOfToken(s) || this.insertTyped(s))) ||
      (t.startsWith("delete") && this.deleteLines(e.getTargetRanges()[0]))
    ) {
      e.preventDefault();
    } else {
      return false;
    }
    this.fireInput(); // saves history by state before changes
    return true;
  }

  /** Called on `input`: syncs recognized text with its element (see `recognize`), cleans the new line (see gotLineBreak) */
  gotInput(e: InputEvent): void {
    const t = e.inputType;
    (t === "insertText" || t === "insertReplacementText" || t?.startsWith("delete")) && this.gotRecognize(e.data);
    (t === "insertParagraph" || t === "insertLineBreak") && this.gotLineBreak();
  }
}

customElements.define("wup-richinput", WUPTextRichInput);
