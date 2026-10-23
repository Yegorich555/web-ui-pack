import WUPTextAreaInput, { charsBefore, pointAt, walkText } from "../textArea/textArea.input";
import TextRichHistory from "./textRich.history";
import * as Utils from "./textRich.utils";

/** Tool name, tool & checker of element by `is` */
type ToolEntry = [keyof WUP.TextRich.ToolValues, WUP.TextRich.Tool, ((el: Element) => boolean) | undefined];

/** Input types of inserted content: paste or drop */
const insertTypes = /^insertFrom(Paste|Drop)/;
/** Input types of deleted content that leave caret for typing: Delete, Backspace, Ctrl+X etc. (not drag & drop, IME) */
const deleteTypes = /^delete(?!ByDrag|CompositionText)/;

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
  /** Applies rendered tool by key `name:value` (see recognizeLine)
   * @returns false if it isn't rendered */
  _applyKey?: (key: string) => boolean;
  /** Returns true if paste & drop keep formats: see $options.copyPasteFormatted */
  _isFormatted?: () => boolean;
  /** Shift+Enter is pressed (set on keydown): Safari fires `insertParagraph` for it as for Enter (see replaceInput) */
  _isShiftEnter = false;
  protected override _editable = "true"; // formats are applied by tools, plain text is pasted by `replaceInput`
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
    this.#markdown = new Map();
    this._entries.forEach(([, t]) => {
      const r = t.recognize;
      // RegExp with group (empty alternative matches empty string, so result has item per group):
      // its copy with indices (flag `d`, without `g`)
      t.kind === "inline" &&
        r instanceof RegExp &&
        new RegExp(`${r.source}|`, r.flags).exec("")!.length > 1 &&
        this.#markdown.set(t, new RegExp(r.source, `${r.flags.replace(/[gd]/g, "")}d`));
    });
    // tool with values too (mention): `is` gets recognized text & can accept values only (typed `@john`)
    this.#recognizers = this._entries.filter(([k, t]) => this.#isAuto(t) && this._isActive?.(k)).map(([, t]) => t);
    // markdown applies tool like toolbar button: tool with values (font size etc.) needs value
    this.#markdowns = this._entries.filter(
      ([k, t, is]) => this.#markdown.has(t) && is && !t.values?.length && this._isActive?.(k)
    );
  }

  /** Returns selection (anchor & focus) as char offsets (line break & embed = 1 char): valid even if nodes are re-rendered;
   *  wraps loose inline content into lines at first (Chrome doesn't wrap the 1st line: `abc<div>def</div>`, `<div><br></div>abc`) */
  getSelectionPos(): [number, number] {
    const sel = window.getSelection()!;
    // (editor, index) => (child, 0), the end of editor => the end of the last child: otherwise index is wrong
    // after wrapping (or out of editor: IndexSizeError) & formats find no line (caret isn't inside it)
    const childPos = (n: Node, offset: number): [Node, number] => {
      let c: Node | null = n === this ? this.childNodes[offset] ?? this.lastChild : null;
      // caret can't be inside `<br>` or embed (Chrome leaves `<br>` when everything is deleted): it goes into line
      // wrapping them (see below)
      if (!c || c.nodeName === "BR" || (c instanceof Element && this._isEmbed?.(c))) {
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
    if (!this.#isInserted) {
      this.setSelectionPos(pos);
      // caret stays: pending formats too (line format replaces line, otherwise caret in new element resets them)
      const sel = window.getSelection()!;
      this.#pending.size && (this.#pendingAt = [sel.anchorNode!, sel.anchorOffset]);
    }
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
          // token replaces selection with tokens at its edges (typed `@john` is recognized already) or token around caret
          const { range: r } = ctx;
          const [a, b] = [r.startContainer, r.endContainer].map((n) => Utils.Formats.parents(n, any, editor)[0]);
          a && r.setStartBefore(a);
          b && r.setEndAfter(b);
          Utils.Ranges.select(r);
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
    this.dropHolder(); // it isn't content
    const h = this._history;
    const prev = this.value;
    this.#autoAt = undefined; // the last change isn't recognizing
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

  /** Replaces selection with node & places caret after it; empty fragment deletes selection: inline formats of deleted
   *  text stay for the next typed text (see keepFormats) */
  $insert(node: Node): void {
    const sel = window.getSelection()!;
    const r = sel.getRangeAt(0);
    const last = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node.lastChild : node;
    const was = !last && !r.collapsed ? this.getFormats() : undefined; // of deleted text
    r.deleteContents();
    r.insertNode(node);
    last && r.setStartAfter(last);
    sel.collapse(r.startContainer, r.startOffset); // empty fragment (deletion): Chrome keeps selection not collapsed
    const line = !last && Utils.Lines.at(r.startContainer, this);
    if (line && Utils.Lines.isEmpty(line, this._isEmbed)) {
      // deletion leaves empty line (& empty formats): otherwise caret goes to the previous line
      line.replaceChildren(
        document.createElement("br"),
        ...Array.prototype.filter.call(line.children, (el: Element) => Utils.listTags.has(el.tagName))
      );
      sel.collapse(line, 0);
    }
    was && this.keepFormats(was);
    this.#isInserted = true;
  }

  /** Inline formats of deleted text stay for the next typed text like on Enter (typed `- ` in bold gives list item with
   *  bold text), except recognized text & tokens (see gotLineBreak)
   * @param was formats of deleted text (see getFormats) */
  protected keepFormats(was: Map<keyof WUP.TextRich.ToolValues, unknown>): void {
    const sel = window.getSelection()!;
    const now = this.getFormats();
    was.forEach((v, k) => {
      const t = this._tools[k];
      t.kind === "inline" && !this.#isAuto(t) && !t.trigger && now.get(k) !== v && this.#pending.set(k, v);
    });
    this.#pendingAt = [sel.anchorNode!, sel.anchorOffset];
  }

  /** Fires `input` to update value of control after custom changes */
  protected fireInput(): void {
    this.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }

  /** Pending formats for the next typed text: tool => value (`false` removes format) */
  #pending = new Map<keyof WUP.TextRich.ToolValues, unknown>();
  /** Caret position of pending formats: they're reset when caret moves */
  #pendingAt?: [Node, number];

  /** Called on selection change inside editor: pending formats are reset if caret moves, recognizing can't be undone
   *  via Escape (see undoAuto) */
  gotSelect(): void {
    const sel = window.getSelection()!;
    const p = this.#pendingAt;
    p && (sel.anchorNode !== p[0] || sel.anchorOffset !== p[1]) && this.#pending.clear();
    const a = this.#autoAt;
    a && (!sel.isCollapsed || sel.focusNode !== a[0] || sel.focusOffset !== a[1]) && (this.#autoAt = undefined);
    sel.focusNode !== this.#holder?.[0] && this.dropHolder();
  }

  /** Called when control loses focus: pending formats are reset & recognizing is resumed */
  gotFocusLost(): void {
    this.dropHolder();
    this.#pending.clear();
    this.#isAutoPaused = false;
    this.#autoAt = undefined;
  }

  /** Returns true if element is token (placeholder, mention): see `Tool.trigger` */
  #isToken = (el: Element): boolean =>
    this._entries.some(([, t, is]) => t.kind === "inline" && !!t.trigger && !!is?.(el));

  /** Token edited inside (typed or deleted text): taken before input (see checkToken) */
  #token?: Element;

  /** Token edited inside (see `#token`) stays only if `is` accepts its new text, otherwise it becomes plain text
   *  (`@jo|hn` + `123` => `@jo123hn` isn't mention if `is` accepts values only): called on input before history saves it,
   *  so it's the same undo step */
  checkToken(): void {
    const el = this.#token;
    this.#token = undefined;
    if (!el?.isConnected || this.#isToken(el)) {
      return;
    }
    const sel = window.getSelection()!;
    const line = this.lineOf(el);
    const isEmbed = this._isEmbed;
    const at = charsBefore(line, sel.focusNode!, sel.focusOffset, isEmbed); // caret: unwrapping moves its node
    el.replaceWith(...el.childNodes);
    line.normalize();
    sel.collapse(...pointAt(line, at, isEmbed));
    this._cached = undefined;
  }

  /** Inserts text typed at token edge outside it: otherwise browser extends token (`{firstName}x`); selection is
   *  collapsed (see replaceSelection)
   * @returns false if caret isn't at token edge */
  protected insertOutOfToken(text: string): boolean {
    const sel = window.getSelection()!;
    const n = sel.focusNode!;
    const isToken = this.#isToken;
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
      return false; // caret in the middle: edit token text (see checkToken)
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

  /** Invisible char & token left via arrow (see leaveFormats): it's after/before token with caret outside, otherwise Chrome
   *  paints caret inside token; it's removed on the next change, caret move & blur (see dropHolder) */
  #holder?: [Text, Element];

  /** Removes caret holder (see `#holder`): caret at it goes right after/before token (typed text goes there) */
  protected dropHolder(): void {
    const [h] = this.#holder ?? [];
    this.#holder = undefined;
    if (h?.isConnected) {
      const sel = window.getSelection()!;
      const isAt = sel.focusNode === h;
      const r = document.createRange();
      r.setStartBefore(h);
      h.remove();
      isAt && sel.collapse(r.startContainer, r.startOffset);
    }
  }

  /** @returns line of collapsed caret at the end of the last line (`isEnd`) or at the start of the 1st one:
   *  caret has nowhere to move */
  protected lineAtEdge(isEnd: boolean): HTMLElement | undefined {
    const sel = window.getSelection()!;
    const n = sel.focusNode;
    const line = sel.isCollapsed && n && this.contains(n) ? Utils.Lines.at(n, this) : undefined;
    if (
      !line ||
      Utils.Formats.parents(line, (el) => !!(isEnd ? el.nextSibling : el.previousSibling), this).length // other lines
    ) {
      return undefined;
    }
    // text, empty nested item, <br> or embed after/before caret
    const isEmbed = this._isEmbed;
    const at = charsBefore(line, n!, sel.focusOffset, isEmbed);
    return (isEnd ? at === charsBefore(line, line, line.childNodes.length, isEmbed) : !at) ? line : undefined;
  }

  /** Returns true if collapsed caret is in the first row of content (or in the last one: `isEnd`): ArrowUp (ArrowDown)
   *  can't move it into another line; it's checked via rendered rows (paragraph can be wrapped), without layout (or for
   *  caret between elements) - via lines (see lineAtEdge) */
  protected isEdgeRow(isEnd: boolean): boolean {
    const caret = window.getSelection()!.getRangeAt(0);
    const c = caret.collapsed && caret.getClientRects?.()[0];
    if (!c) {
      return !!this.lineAtEdge(isEnd);
    }
    const r = document.createRange(); // content before (after) caret: its rows are above (below) caret
    r.selectNodeContents(this);
    isEnd ? r.setStart(caret.endContainer, caret.endOffset) : r.setEnd(caret.startContainer, caret.startOffset);
    return !Array.prototype.some.call(
      r.getClientRects(),
      (x: DOMRect) => x.height && (isEnd ? x.top >= c.bottom - 1 : x.bottom <= c.top + 1)
    );
  }

  /** ArrowRight at the end of formatted element (bold, link etc.) or ArrowLeft at its start: the next typed text goes out of it,
   *  the opposite arrow returns into it (caret stays visually); ArrowRight at the end of token (mention etc.) & ArrowLeft at
   *  its start (at line start) move caret out of it visually too (see `#holder`), the next typed text isn't joined with it;
   *  without such element ArrowRight at the end of the last block
   *  (list, quote etc.) goes into new line after it: `<li><b>Note:</b>|</li>` + ArrowRight continues item with plain text,
   *  the 2nd one adds line; ArrowDown/ArrowUp (`isVertical`) do the same as ArrowRight/ArrowLeft when caret is in the last/first
   *  row of the content (otherwise they move caret into another line: see isEdgeRow)
   * @returns false if there is nothing to leave/return */
  leaveFormats(isRight: boolean, isVertical?: boolean): boolean {
    if (isVertical && !this.isEdgeRow(isRight)) {
      return false; // caret goes into another line
    }
    const line = isRight && this.lineAtEdge(true);
    const sel = window.getSelection()!;
    const [h, left] = this.#holder ?? [];
    if (h && isRight !== (left!.nextSibling === h)) {
      this.dropHolder(); // the opposite arrow returns into token
      sel.collapse(...pointAt(left!, isRight ? 0 : Infinity, this._isEmbed));
      return true;
    }
    // token (mention etc.): Chrome paints caret inside it at its end (at any point) & at its start without text before it,
    // so caret goes out of invisible holder
    const token = !h && this.edgeAt(this.#isToken, !isRight);
    if (token && (isRight || !Utils.Ranges.textAt(this.lineOf(token), token, 0, true))) {
      this.#left.add(token);
      const holder = document.createTextNode("\u200b");
      isRight ? token.after(holder) : token.before(holder);
      this.#holder = [holder, token];
      sel.collapse(holder, +isRight);
      return true;
    }
    const p = this.#pending;
    const back = this.formatsAt(isRight).filter(([k]) => p.get(k) === false); // left via the opposite arrow
    const arr = back.length ? back : this.formatsAt(!isRight).filter(([k]) => p.get(k) !== false);
    if (!arr.length) {
      if (
        !isRight ||
        !line ||
        this.readOnly ||
        !this._entries.some(([, t, is]) => t.kind === "line" && is?.(line)) // aligned paragraph isn't block
      ) {
        return false;
      }
      // caret has nowhere to move: new line after block (separate undo step)
      this.changeContent(() => {
        const div = this.appendChild(document.createElement("div"));
        div.appendChild(document.createElement("br"));
        sel.collapse(div, 0);
      });
    }
    arr.forEach(([k, el]) => {
      if (back.length) {
        p.delete(k);
      } else {
        p.set(k, false);
        this.#left.add(el);
      }
    });
    this.#pendingAt = [sel.anchorNode!, sel.anchorOffset]; // the new line keeps pending formats too
    this._onFormats?.();
    return true;
  }

  /** Inserts typed text with formats shown by toolbar: pending ones or of elements ending at caret
   *  (otherwise Chrome types after link); selection is collapsed (see replaceSelection)
   * @returns false if browser can insert it as usual */
  protected insertTyped(text: string): boolean {
    const sel = window.getSelection()!;
    if (!this.#pending.size) {
      const isEnd = !!this.formatsAt().length;
      isEnd && sel.collapse(...Utils.Ranges.insertText(sel.focusNode!, sel.focusOffset, text));
      return isEnd;
    }
    this.getSelectionPos(); // caret at editor root (value is replaced) goes into line: otherwise text is a new line
    const r = sel.getRangeAt(0);
    const t = document.createTextNode(text);
    r.insertNode(this.withPending(t, r));
    sel.collapse(t, t.length);
    return true;
  }

  /** Applies pending formats to typed or pasted content & resets them: range goes out of elements of formats turned off
   *  (Bold toggled off, left via arrow), content is wrapped into elements of formats turned on
   * @returns content to insert at range */
  protected withPending<T extends Node>(content: T, r: Range): T | HTMLElement {
    const tools = this._tools;
    let node: T | HTMLElement = content;
    // move range out of elements of removed/changed formats (`true` - added toggle format)
    this.#pending.forEach((v, k) => {
      const is = (x: Element): boolean => tools[k].is!(x as HTMLElement) !== undefined;
      const el = v !== true && Utils.Formats.parents(r.startContainer, is, this).pop(); // the outer one
      el && Utils.Formats.splitAt(el, r, this._isEmbed);
    });
    this.#pending.forEach((v, k) => {
      const is = (x: Element): boolean => Utils.Formats.isMatch(tools[k].is!(x as HTMLElement), v);
      if (v !== false && !Utils.Formats.parents(r.startContainer, is, this).length) {
        const el = Utils.Formats.create(tools[k], v);
        el.appendChild(node);
        node = el;
      }
    });
    this.#pending.clear();
    return node;
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
  /** Markdown tools (inline with `recognize` RegExp with group) => its copy with indices: cached via setTools */
  #markdown = new Map<WUP.TextRich.Tool, RegExp>();
  /** Markdown tools that work (see `_isActive`): cached via setTools */
  #markdowns: ToolEntry[] = [];
  /** Returns true if tool wraps recognized text into element that follows its text (link etc.): see `recognize` */
  #isAuto = (t: WUP.TextRich.Tool): boolean => !!t.recognize && t.kind === "inline" && !this.#markdown.has(t);
  /** Elements of recognized text in line at caret (`<a href="https://a.com">https://a.com</a>`): taken before input,
   *  so they follow their text after it */
  #auto: Element[] = [];
  /** Undo/redo pauses recognizing of new text till caret leaves word (whitespace, Enter, navigation keys, click, blur) */
  #isAutoPaused = false;
  /** Caret right after recognizing (new element or line format): Escape undoes it (see undoAuto);
   *  reset by any change, caret move & blur */
  #autoAt?: [Node, number];

  /** Resumes recognizing paused by undo/redo: caret leaves word (navigation keys, click) */
  resumeRecognize(): void {
    this.#isAutoPaused = false;
  }

  /** Undoes recognizing right after it (Escape) like Ctrl+Z: plain text is returned & recognizing is paused
   * @returns false if caret moved or something is changed after recognizing */
  undoAuto(): boolean {
    if (!this.#autoAt) {
      return false;
    }
    this.#autoAt = undefined;
    // the same as Ctrl+Z (see TextHistory.handleKeyDown): recognizing is a separate undo step
    this.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "historyUndo" }));
    return true;
  }

  /** Returns line of node (see Utils.Lines.at) or editor for loose content: Chrome doesn't wrap the 1st line */
  protected lineOf(n: Node): HTMLElement {
    return Utils.Lines.at(n, this) ?? this;
  }

  /** Remembers elements of recognized text in line at caret (their text is recognized entirely & gives the same element;
   *  token chosen in menu can have other text: `@John Smith`): see `recognize` */
  collectAuto(): void {
    const tools = this.#recognizers;
    const n = window.getSelection()?.focusNode;
    this.#auto =
      tools.length && n && this.contains(n)
        ? Utils.Lines.elements(this.lineOf(n)).filter((x) => {
            const s = x.textContent!;
            return tools.some(
              (t) =>
                t.is!(x) !== undefined &&
                Utils.Tools.recognized(t.recognize, s) === s &&
                Utils.Formats.isSame(Utils.Formats.create(t, s), x)
            );
          })
        : [];
  }

  /** Wraps recognized word at caret into element of tool while user types: link, email etc. (see `Tool.recognize`);
   *  element of recognized text follows its text: it's updated on typing & removed if text isn't recognized anymore;
   *  new element is a separate undo step (after undo text isn't recognized till caret leaves word)
   * @returns false if nothing is changed */
  recognize(): boolean {
    const sel = window.getSelection()!;
    const n = sel.focusNode;
    if (!this.#recognizers.length || !sel.isCollapsed || !n || !this.contains(n)) {
      return false;
    }
    const line = this.lineOf(n);
    if (line.tagName === "PRE") {
      return false; // code block
    }
    const isEmbed = this._isEmbed;
    const [before, rest] = Utils.Lines.textAround(line, n, sel.focusOffset, isEmbed);
    const after = /^\S*/.exec(rest)![0]; // the rest of word
    const found = this.recognizeEnd(before + after);
    const at = charsBefore(line, n, sel.focusOffset, isEmbed); // caret
    const end = at - before.length + (found?.[2] ?? 0); // without punctuation
    const start = found ? end - found[0].length : Math.max(0, at - 1);
    // elements of recognized text around caret (with typed whitespace etc.): replaced or removed
    const r = Utils.Ranges.at(line, start, Math.max(end, at + after.length), isEmbed);
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
      (!olds.length && this.#isAutoPaused) ||
      (olds.length === 1 && olds[0].textContent === text && Utils.Formats.isSame(olds[0], el)) || // nothing is changed
      // the same tag (link with other text etc.): text is formatted already
      Utils.Lines.elements(line).some(
        (x) => x.tagName === el.tagName && !olds.includes(x) && Utils.Ranges.intersects(r, x)
      )
    ) {
      return false;
    }
    const isNew = !olds.length;
    isNew && this._history?.commit(); // new element: separate undo step
    // element per part: text can be split by formats
    update(() => Utils.Formats.addInline(Utils.Ranges.split(Utils.Ranges.at(line, start, end, isEmbed)), el, line));
    isNew && (this.#autoAt = [sel.focusNode!, sel.focusOffset]); // Escape right after it undoes it
    return true;
  }

  /** Returns caret node, its line & text before caret (from line start, line break or embed: see Utils.Lines.textAround)
   *  or `undefined` if selection isn't caret in editor or line is code block (typed text isn't recognized there) */
  protected typedLine(): [Node, HTMLElement, string] | undefined {
    const sel = window.getSelection()!;
    const n = sel.focusNode;
    const line = sel.isCollapsed && n && this.contains(n) && this.lineOf(n);
    return line && line.tagName !== "PRE"
      ? [n!, line, Utils.Lines.textAround(line, n!, sel.focusOffset, this._isEmbed)[0]]
      : undefined;
  }

  /** Applies value of rendered tool recognized in text typed at line start (see `ToolValue.recognize`): `1. ` gives
   *  numbered list, `> ` gives quote (`line` tool without values: see `Tool.recognize`); typed text is removed;
   *  it's a separate undo step (Ctrl+Z or Escape right after it returns typed text)
   * @returns false if nothing is recognized */
  protected recognizeLine(): boolean {
    const typed = this.typedLine();
    if (!typed) {
      return false;
    }
    const [n, line, s] = typed;
    const sel = window.getSelection()!;
    let key = "";
    this._entries.some(([k, t]) => {
      const v = t.values
        ? t.values.find((x) => Utils.Tools.recognized(x.recognize, s) === s)
        : t.kind === "line" && Utils.Tools.recognized(t.recognize, s) === s && { value: true };
      // not applied yet
      v && !Utils.Formats.isMatch(t.is?.(line), v.value) && (key = t.values ? `${k}:${v.value}` : k);
      return v;
    });
    // text from line start: not after <br> or embed
    if (!key || charsBefore(line, n, sel.focusOffset, this._isEmbed) !== s.length) {
      return false;
    }
    this._history?.commit(); // separate undo step
    if (!this._applyKey?.(key)) {
      return false;
    }
    const end = [sel.focusNode!, sel.focusOffset] as const; // caret is restored after typed text
    sel.setBaseAndExtent(this.lineOf(end[0]), 0, ...end);
    this.changeContent(() => this.$insert(document.createDocumentFragment())); // merged with format: the same tick
    this.#autoAt = [sel.focusNode!, sel.focusOffset]; // Escape right after it undoes it
    return true;
  }

  /** Formats text recognized at the end of typed text by markdown `recognize` of rendered tool (RegExp with group):
   *  `**bold**` gives bold `bold`; typed markers are removed & the next typed text goes out of format;
   *  it's a separate undo step (Ctrl+Z or Escape right after it returns typed text) */
  protected recognizeMarkdown(): void {
    const typed = this.#markdowns.length ? this.typedLine() : undefined;
    if (!typed) {
      return;
    }
    const [n, line, s] = typed;
    let found: [ToolEntry, RegExpExecArray] | undefined;
    // eslint-disable-next-line no-restricted-syntax
    for (const e of this.#markdowns) {
      const m = this.#markdown.get(e[1])!.exec(s);
      if (m?.[1] && m.index + m[0].length === s.length) {
        found = [e, m]; // group isn't empty, match is at the end of text
        break;
      }
    }
    if (!found) {
      return;
    }
    const [[name, , is], { index: start, indices }] = found;
    const [from, to] = indices![1]!; // text of group
    const sel = window.getSelection()!;
    const isEmbed = this._isEmbed;
    const at = charsBefore(line, n, sel.focusOffset, isEmbed) - s.length; // text after line break or embed
    const rangeOf = (a: number, b: number): Range => Utils.Ranges.at(line, at + a, at + b, isEmbed);
    const h = this._history;
    h?.commit(); // separate undo step
    h && (h._stateBeforeInput = h.inputState); // undo restores caret: text is selected to format it below
    const r = rangeOf(from, to);
    // the same as toolbar button (it toggles format): text formatted already stays as is
    if (!Utils.Ranges.split(r).every((t) => Utils.Formats.parents(t, is!, line).length)) {
      Utils.Ranges.select(r);
      this._applyKey!(name);
    }
    this.changeContent(() => {
      rangeOf(to, s.length).deleteContents(); // markers: from the end, so positions before it stay valid
      rangeOf(start, from).deleteContents();
      line.normalize();
      sel.collapse(...pointAt(line, at + start + to - from, isEmbed)); // at the end of formatted text (inside it)
      this.#pending.set(name, false); // the next typed text goes out of it
      this.#pendingAt = [sel.anchorNode!, sel.anchorOffset];
    }); // merged with format: the same tick
    this.#autoAt = [sel.focusNode!, sel.focusOffset]; // Escape right after it undoes it
  }

  /** Deletes selection before typed or pasted content replaces it (otherwise Chrome wraps typed text into its typing style
   *  of deleted elements: `<font color>` of mention etc., & keeps fully selected link with the previous url): across
   *  lines via deleteLines (Ctrl+A), elements selected entirely are removed (otherwise their empty copies stay:
   *  `[#news @john]` => `<span></span>`), touched elements of recognized text are unwrapped (inserted text is recognized
   *  again), inline formats of deleted text stay for typed text (see keepFormats)
   * @returns false if selection is collapsed */
  protected deleteSelection(): boolean {
    const sel = window.getSelection()!;
    if (sel.isCollapsed) {
      return false;
    }
    const r = sel.getRangeAt(0);
    const was = this.getFormats();
    const arr = this.#auto.filter((x) => Utils.Ranges.intersects(r, x));
    if (!this.deleteLines(r)) {
      const line = this.lineOf(r.startContainer);
      r.setStart(...Utils.Ranges.edgeOf(line, r.startContainer, r.startOffset));
      r.setEnd(...Utils.Ranges.edgeOf(line, r.endContainer, r.endOffset));
      r.deleteContents();
      sel.collapse(r.startContainer, r.startOffset); // Chrome keeps selection not collapsed
    }
    this.keepFormats(was);
    const olds = arr.filter((x) => x.isConnected); // selected partially
    if (olds.length) {
      const n = sel.focusNode!;
      const line = this.lineOf(n);
      const isEmbed = this._isEmbed;
      const at = charsBefore(line, n, sel.focusOffset, isEmbed); // caret: unwrapping moves it before element text
      olds.forEach((x) => x.replaceWith(...x.childNodes));
      sel.collapse(...pointAt(line, at, isEmbed));
    }
    return true;
  }

  /** Inserts typed text instead of selection: it's deleted at first (see deleteSelection), typed text gets inline formats
   *  of deleted text & it's recognized again (see `recognize`)
   * @returns false if selection is collapsed */
  protected replaceSelection(text: string): boolean {
    if (!this.deleteSelection()) {
      return false;
    }
    if (!this.insertOutOfToken(text) && !this.insertTyped(text)) {
      const sel = window.getSelection()!;
      sel.collapse(...Utils.Ranges.insertText(sel.focusNode!, sel.focusOffset, text));
    }
    return true;
  }

  /** Formats of text deleted via Delete, Backspace, Ctrl+X etc.: taken before input (see gotDelete) */
  #deleted = new Map<keyof WUP.TextRich.ToolValues, unknown>();

  /** Called after deleting: typing style of browser is reset (Chrome wraps the next typed text into `<font color>` of
   *  deleted mention, `<font face>` etc.), inline formats of deleted text stay for typed text instead (see keepFormats) */
  protected gotDelete(): void {
    const sel = window.getSelection()!;
    sel.collapse(sel.focusNode, sel.focusOffset); // any selection change resets typing style
    this.keepFormats(this.#deleted);
  }

  /** Called after typing or deleting: syncs recognized text with its element (see `recognize`),
   *  typed text can apply format like markdown (see `recognizeLine` & `recognizeMarkdown`) */
  gotRecognize(data: string | null): void {
    this.recognize();
    data && (this.recognizeLine() || this.recognizeMarkdown());
    data && !data.trim() && (this.#isAutoPaused = false); // caret leaves word
  }

  /** Returns true if element is recognized text (link etc.) or token (mention etc.): it isn't continued in the next line */
  #isWrapped = (x: Element): boolean =>
    this._entries.some(([, t, is]) => (this.#isAuto(t) || (t.kind === "inline" && !!t.trigger)) && is!(x));

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

  /** Element of recognized text or token that ends at caret before line break (see leaveAuto) */
  #breakIn?: Element;

  /** Called before line break: caret at the end of recognized text (link etc.) or token goes out of its element,
   *  otherwise browser continues it in the new line (Chrome still adds its empty copy: see checkBreak) */
  protected leaveAuto(): void {
    this.recognize();
    this.#isAutoPaused = false;
    this.#breakIn = undefined;
    const el = this.edgeAt(this.#isWrapped);
    if (el) {
      const r = document.createRange();
      r.setStartAfter(el);
      window.getSelection()!.collapse(r.startContainer, r.startOffset);
      this.#breakIn = el;
    }
  }

  /** Returns the outer element matched by `is` that ends (or starts) at collapsed caret: caret right after (before) it is
   *  at its edge too (browser paints & inserts there) */
  protected edgeAt(is: (el: Element) => boolean, isStart?: boolean): Element | undefined {
    const sel = window.getSelection()!;
    const n = sel.focusNode;
    if (!sel.isCollapsed || !n || !this.contains(n)) {
      return undefined;
    }
    const line = this.lineOf(n);
    const isEmbed = this._isEmbed;
    const at = charsBefore(line, n, sel.focusOffset, isEmbed);
    return Utils.Lines.elements(line).find(
      (el) => is(el) && charsBefore(line, el, isStart ? 0 : el.childNodes.length, isEmbed) === at
    );
  }

  /** Line break typed at the end of recognized text or token (see leaveAuto) goes out of its element: Chrome adds its
   *  empty copy into the new line (Shift+Enter is custom: see breakBlock); called on input before history saves it */
  checkBreak(): void {
    const el = this.#breakIn;
    this.#breakIn = undefined;
    if (!el?.isConnected) {
      return;
    }
    const n = window.getSelection()!.focusNode!;
    Utils.Formats.parents(n, (x) => !x.textContent && Utils.Formats.isSame(x, el), this.lineOf(n)).forEach((x) =>
      x.replaceWith(...x.childNodes)
    );
    this._cached = undefined;
  }

  /** Returns recognized end of text by the 1st matched tool that works (see `Tool.recognize`); it's retried without
   *  trailing whitespace & punctuation: `(see https://example.com).`, typed whitespace or separator (`+1 (359) 232-`)
   * @returns recognized text, its element (with text), length of text till its end & tool */
  protected recognizeEnd(s: string): [string, HTMLElement, number, WUP.TextRich.Tool] | undefined {
    for (let str = s; ; str = str.slice(0, -1)) {
      // eslint-disable-next-line no-restricted-syntax
      for (const t of this.#recognizers) {
        const text = Utils.Tools.recognized(t.recognize, str);
        const el = text && str.endsWith(text) && Object.assign(Utils.Formats.create(t, text), { textContent: text });
        if (el && t.is!(el) !== undefined) {
          return [text, el, str.length, t]; // otherwise invalid url, mention isn't from values etc.
        }
      }
      if (!/[\s.,;:!?'")\]}-]$/.test(str)) {
        return undefined;
      }
    }
  }

  /** Start of content inserted by paste or drop: char position (see recognizeInserted) */
  #insertAt = 0;

  /** Wraps text recognized in content inserted from `#insertAt` to caret (paste, drop) like typed one (see `recognize`):
   *  every url, email etc. touching inserted text (`see https://` + pasted `example.com`); code block & text formatted
   *  by the same tag (pasted link etc.) are skipped; it's a separate undo step (Ctrl+Z or Escape right after it returns
   *  plain text) */
  protected recognizeInserted(): void {
    const sel = window.getSelection()!;
    if (!this.#recognizers.length || !sel.isCollapsed || !this.contains(sel.focusNode)) {
      return;
    }
    const pos = this.getSelectionPos(); // wraps loose content into lines
    const isEmbed = this._isEmbed;
    const ins = Utils.Ranges.at(this, this.#insertAt, pos[1], isEmbed);
    const found: Array<[HTMLElement, number, number, HTMLElement]> = []; // line, start, end & element
    Utils.Lines.of(ins, this).forEach((line) => {
      if (line.tagName === "PRE") {
        return;
      }
      // inserted text in line
      const has = (n: Node): boolean => line.contains(n);
      const from = has(ins.startContainer) ? charsBefore(line, ins.startContainer, ins.startOffset, isEmbed) : 0;
      const to = has(ins.endContainer) ? charsBefore(line, ins.endContainer, ins.endOffset, isEmbed) : Infinity;
      const els = Utils.Lines.elements(line);
      // text parts split by line breaks & embeds: text & char position of its start in line
      const parts: Array<[string, number]> = [];
      let cur: [string, number] | undefined;
      let chars = 0;
      walkText(
        line,
        (n, len) => {
          if (n.nodeName === "LI") {
            return true; // nested list (the end of item): its items are own lines
          }
          n.nodeType === Node.TEXT_NODE
            ? ((cur ??= parts[parts.push(["", chars]) - 1])[0] += (n as Text).data)
            : (cur = undefined);
          chars += len;
          return false;
        },
        isEmbed
      );
      parts.forEach(([s, at]) => {
        let min = Infinity; // from the end: the last recognized text wins like on typing (`+1 (555) 123-45-67`)
        for (let i = s.length; i > 0 && at + i >= from; --i) {
          // at the end of word: the same as typed whitespace after it
          const f = /\S/.test(s[i - 1]) && !/\S/.test(s[i] ?? " ") && this.recognizeEnd(s.slice(0, i));
          const end = f ? at + f[2] : 0;
          if (f && end <= min) {
            min = end - f[0].length;
            const r = end >= from && min <= to && Utils.Ranges.at(line, min, end, isEmbed); // touches inserted text
            // the same tag (pasted link etc.): text is formatted already
            r &&
              !els.some((x) => x.tagName === f[1].tagName && Utils.Ranges.intersects(r, x)) &&
              found.push([line, min, end, f[1]]);
          }
        }
      });
    });
    if (!found.length) {
      return;
    }
    this._history?.commit(); // separate undo step
    this.changeContent(() => {
      // element per part: text can be split by formats
      found.forEach(([line, a, b, el]) =>
        Utils.Formats.addInline(Utils.Ranges.split(Utils.Ranges.at(line, a, b, isEmbed)), el, line)
      );
      this.normalize();
      this.setSelectionPos(pos);
    });
    this.#autoAt = [sel.focusNode!, sel.focusOffset]; // Escape right after it undoes it
  }

  /** Returns tool & value of url, email etc. pasted over selected text: it formats selected text like toolbar button
   *  instead of replacing it (Notion, Slack, GitHub): selected text becomes link
   * @returns `undefined` if selection is collapsed or in code block, pasted text isn't recognized as a whole or its value
   *  is its text (hashtag, mention: pasted text replaces selection & it's recognized as usual) */
  pasteFormat(e: InputEvent): [keyof WUP.TextRich.ToolValues, unknown] | undefined {
    const s = e.inputType === "insertFromPaste" && e.dataTransfer?.getData("text/plain").trim();
    const sel = window.getSelection()!;
    const selected = sel.toString();
    if (!s || !selected.trim() || Utils.Lines.of(sel.getRangeAt(0), this).some((l) => l.tagName === "PRE")) {
      return undefined;
    }
    const f = this.recognizeEnd(s);
    if (f?.[0] !== s) {
      return undefined;
    }
    const [, el, , t] = f;
    const v = t.is!(el);
    el.textContent = selected; // the same value with selected text: url etc.
    return t.is!(el) === v ? [this._entries.find(([, x]) => x === t)![0], v] : undefined;
  }

  /** Replaces selection with sanitized html: single paragraph goes inline at caret (inside its formats: pasted into bold
   *  text is bold), other blocks split the current line at caret; code block gets plain text instead (formats & blocks
   *  aren't supported there)
   * @param text plain text of the same content (paste `text/plain`) */
  insertHTML(html: string, text = ""): void {
    const sel = window.getSelection()!;
    this.getSelectionPos(); // wraps loose content: otherwise caret at editor root has no line
    this.deleteSelection();
    const r = sel.getRangeAt(0);
    const line = Utils.Lines.at(r.startContainer, this);
    if (line?.tagName === "PRE") {
      text && this.$insert(document.createTextNode(text)); // line breaks as `\n` like browser pastes plain text
      return;
    }
    const f = Utils.Html.toEditor(html, this._tools);
    // copied html keeps spaces at edges as `&nbsp;` (Chrome): editor keeps spaces as is (`white-space: pre-wrap`)
    const w = document.createTreeWalker(f, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) {
      n.data = n.data.replace(/\xa0/g, " ");
    }
    const first = f.firstElementChild;
    if (!first) {
      return;
    }
    if ((f.childNodes.length === 1 && first.tagName === "DIV") || !line || line.tagName === "LI") {
      // inline content: lines are separated by `\n`
      const frag = document.createDocumentFragment();
      const flatten = (el: Element): void => {
        if (Utils.listTags.has(el.tagName)) {
          Array.from(el.children).forEach(flatten);
          return;
        }
        frag.lastChild && frag.append("\n");
        Array.from(el.childNodes).forEach((n) =>
          // `<br>` of empty line: it's between line breaks
          Utils.listTags.has(n.nodeName) ? flatten(n as Element) : frag.append(n.nodeName === "BR" ? "" : n)
        );
      };
      Array.from(f.children).forEach(flatten);
      // like typed text: out of format turned off (Bold left via ArrowRight), into turned on one (see insertTyped)
      const node = this.withPending(frag, r);
      // formats at caret aren't nested: bold pasted into bold text
      const formats = Utils.Formats.parents(r.startContainer, () => true, this);
      node
        .querySelectorAll("*")
        .forEach((el) => formats.some((x) => Utils.Formats.isSame(x, el)) && el.replaceWith(...el.childNodes));
      this.$insert(node);
      return;
    }
    const last = f.lastChild!;
    Utils.Formats.splitAt(line, r, this._isEmbed); // empty parts are removed
    r.insertNode(f);
    window.getSelection()!.collapse(...pointAt(last, Infinity, this._isEmbed)); // into the last item of list
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

  /** Enter in empty nested list item moves it to the parent list (see Utils.Lines.nest);
   *  Chrome does it too but moves nested lists out of items: `<ul><li>a</li><ul><li>b</li></ul></ul>`
   * @returns false if caret isn't in empty nested item */
  protected liftEmpty(): boolean {
    const sel = window.getSelection()!;
    const li = sel.isCollapsed ? Utils.Lines.at(sel.focusNode!, this) : undefined;
    if (li?.tagName !== "LI" || !Utils.Lines.isEmpty(li, this._isEmbed) || !Utils.Lines.nest(li, true)) {
      return false;
    }
    sel.collapse(li, 0);
    return true;
  }

  /** Line breaks in line of `line` tool (heading, quote, code block, list item etc.):
   * * Shift+Enter adds `\n` in any line (Firefox adds `<br>`, Chrome does it in code block)
   * * Enter adds `\n` (heading & list item: browser adds paragraph & the next item like other editors)
   * * Enter on empty line closes block: the line is removed & caret goes into new paragraph after block (the rest of
   * block goes into its copy after paragraph); empty block becomes paragraph at the same place
   * @param isSoft Shift+Enter
   * @returns false if browser handles it: other line, the next list item, selection goes out of line */
  protected breakBlock(isSoft: boolean): boolean {
    isSoft && this.getSelectionPos(); // the 1st typed line is loose content at editor root: it goes into line
    const sel = window.getSelection()!;
    const line = Utils.Lines.at(sel.focusNode!, this);
    if (
      !line ||
      Utils.Lines.at(sel.anchorNode!, this) !== line ||
      (!isSoft && !this._entries.some(([, t, is]) => t.kind === "line" && is?.(line)))
    ) {
      return false;
    }
    // heading & list item: browser adds paragraph & the next item (except empty line)
    const isNative = !isSoft && [this._tools.header, this._tools.list].some((t) => t.is!(line) !== undefined);
    if (isNative && !sel.isCollapsed) {
      return false;
    }
    const r = sel.getRangeAt(0);
    r.deleteContents();
    const isEmbed = this._isEmbed;
    const { startContainer: n, startOffset: offset } = r;
    const at = charsBefore(line, n, offset, isEmbed);
    const rest = charsBefore(line, line, line.childNodes.length, isEmbed) - at; // the last `<br>` isn't counted
    const after = Utils.Ranges.textAt(line, n, offset);
    // between line breaks (the last one is extra: it shows empty last line)
    const isEmpty =
      (!at || Utils.Ranges.textAt(line, n, offset, true).endsWith("\n")) && (!rest || after.startsWith("\n"));
    if (isSoft || !isEmpty) {
      if (isNative) {
        return false;
      }
      // the extra line break at the end shows empty line (browser does the same) instead of `<br>` of empty line
      let last = line.lastChild;
      while (last?.lastChild && !Utils.listTags.has(last.nodeName)) {
        last = last.lastChild;
      }
      !rest && last?.nodeName === "BR" && last.remove(); // caret range is moved if it's after `<br>`
      const [t, end] = Utils.Ranges.insertText(r.startContainer, r.startOffset, rest ? "\n" : "\n\n");
      sel.collapse(t, end - +!rest);
      return true;
    }
    let el = line; // empty block becomes paragraph
    if (at || rest > 1) {
      // empty line is removed with line breaks around it (range is collapsed at caret), block is split at it
      at && r.setStart(...pointAt(line, at - 1, isEmbed));
      after.startsWith("\n") && r.setEnd(...pointAt(line, at + 1, isEmbed));
      r.deleteContents();
      Utils.Formats.splitAt(line, r, isEmbed); // the rest goes into copy of block, empty parts are removed
      // part before empty line (otherwise line is the rest): its previous empty line stays visible
      at > 1 && line.textContent!.endsWith("\n") && line.append("\n");
      el = document.createElement(line.tagName === "LI" ? "li" : "div");
      r.insertNode(el);
    }
    const div = Utils.Lines.setTag(el, "DIV"); // list item goes out of list
    div.replaceChildren(document.createElement("br"));
    sel.collapse(div, 0);
    return true;
  }

  /** Backspace at the start of formatted line (list item, heading, quote etc.) removes its format instead of joining it
   *  with the previous line (like Google Docs & Notion): nested list item goes to the parent list, other line becomes paragraph
   * @returns false if caret isn't at the start of such line */
  protected unformatLine(): boolean {
    const sel = window.getSelection()!;
    const n = sel.focusNode;
    const line = sel.isCollapsed && n ? Utils.Lines.at(n, this) : undefined;
    if (
      !line ||
      charsBefore(line, n!, sel.focusOffset, this._isEmbed) || // not at line start
      !this._entries.some(([, t, is]) => t.kind === "line" && is?.(line))
    ) {
      return false;
    }
    const isNested = line.tagName === "LI" && Utils.Lines.nest(line, true);
    sel.collapse(isNested ? line : Utils.Lines.setTag(line, document.createElement("div")), 0);
    return true;
  }

  /** Called on `beforeinput` before changes: undo/redo pauses recognizing (otherwise undone link is recognized again
   *  on typing), other input collects elements of recognized text (see `recognize`) & token edited inside
   *  (see checkToken); paste & drop remember start of inserted content (see recognizeInserted), deleting remembers
   *  formats of deleted text (see gotDelete) */
  gotBeforeInput(e: InputEvent): void {
    this.dropHolder(); // caret goes right after token: typed text goes out of it (see insertOutOfToken)
    this.#autoAt = undefined; // the last change isn't recognizing
    const t = e.inputType;
    t.startsWith("history") ? (this.#isAutoPaused = true) : this.collectAuto();
    deleteTypes.test(t) && (this.#deleted = this.getFormats());
    const { commonAncestorContainer: n } = window.getSelection()!.getRangeAt(0);
    this.#token = Utils.Formats.parents(n, this.#isToken, this).pop();
    const r =
      insertTypes.test(t) &&
      this.#recognizers.length &&
      (e.getTargetRanges()[0] ?? window.getSelection()!.getRangeAt(0));
    r && (this.#insertAt = charsBefore(this, r.startContainer, r.startOffset, this._isEmbed)); // not changed by insertion
  }

  /** Replaces browser input with custom changes: sanitized paste (its urls etc. are recognized), typed text (pending formats, out of tokens & recognized text, instead of selection), deleting across lines,
   *  Backspace at the start of formatted line, Enter in empty nested list item, line breaks in line formats
   *  (see breakBlock); line break leaves recognized text
   * @returns true if input is replaced: event is prevented & `input` is fired (without inputType) */
  replaceInput(e: InputEvent): boolean {
    // Safari: Shift+Enter adds paragraph like Enter (other browsers fire `insertLineBreak`)
    const t = e.inputType === "insertParagraph" && this._isShiftEnter ? "insertLineBreak" : e.inputType;
    const s = t === "insertText" && e.data;
    const isBreak = t === "insertParagraph" || t === "insertLineBreak";
    isBreak && this.leaveAuto();
    const dt = insertTypes.test(t) ? e.dataTransfer : null;
    const text = dt?.getData("text/plain") ?? "";
    const rich = dt?.getData("text/html");
    // plain text (html without text: image etc.) gives line per <div>: otherwise Chrome pastes it into `<span style>`
    // & splits line by its last line break (it's skipped: copied line ends with it)
    const div = document.createElement("div");
    const toLine = (x: string): string => {
      div.textContent = x;
      return x ? div.outerHTML : "<div><br></div>";
    };
    const html =
      (this._isFormatted?.() && rich) ||
      (text &&
        text
          .replace(/\r?\n$/, "")
          .split(/\r?\n/)
          .map(toLine)
          .join("")) ||
      rich;
    if (html) {
      // sanitized: otherwise browser pastes anything (images, colors etc.)
      e.preventDefault();
      const [r] = e.getTargetRanges();
      this.focus({ preventScroll: true });
      r && Utils.Ranges.select(r);
      this.insertHTML(html, text);
    } else if (
      (s && (this.replaceSelection(s) || this.insertOutOfToken(s) || this.insertTyped(s))) ||
      (t === "deleteContentBackward" && this.unformatLine()) ||
      (t.startsWith("delete") && this.deleteLines(e.getTargetRanges()[0])) ||
      (t === "insertParagraph" && this.liftEmpty()) ||
      (isBreak && this.breakBlock(t === "insertLineBreak"))
    ) {
      e.preventDefault();
    } else {
      return false;
    }
    deleteTypes.test(t) && this.gotDelete();
    this.fireInput(); // saves history by state before changes
    html && this.recognizeInserted();
    return true;
  }

  /** Called on `input`: syncs recognized text with its element (see `recognize`), resets typing style after deleting
   *  (see gotDelete), cleans the new line (see gotLineBreak) */
  gotInput(e: InputEvent): void {
    const t = e.inputType;
    (t === "insertText" || t === "insertReplacementText" || t?.startsWith("delete")) && this.gotRecognize(e.data);
    deleteTypes.test(t) && this.gotDelete(); // after recognizing: it can move caret
    (t === "insertParagraph" || t === "insertLineBreak") && this.gotLineBreak();
  }
}

customElements.define("wup-richinput", WUPTextRichInput);
