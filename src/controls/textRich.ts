import { inheritDefaults } from "../baseElement";
import WUPDropdownElement from "../dropdownElement";
import { PopupOpenCases } from "../popup/popupElement.types";
import { useTooltipOnce } from "../popup/popupTooltip";
import { SetValueReasons } from "./baseControl";
import WUPTextControl from "./text";
import TextHistory from "./text.history";
import WUPTextAreaControl from "./textArea";
import WUPTextRichInput, { htmlToEditor, htmlToText, sanitizeUrl } from "./textRich.input";
import TextRichHistory from "./textRich.history";
import {
  addInline,
  formatParents,
  fromLinePos,
  getLines,
  inlineFormats,
  linesOf,
  listType,
  mergeLists,
  removeInline,
  setLineAlign,
  setLineIndent,
  setLineList,
  setLineTag,
  splitAt,
  splitRange,
  toLinePos,
  unwrap,
  wrapLines,
} from "./textRich.format";

WUPTextRichInput.$use();
WUPDropdownElement.$use();

const tagName = "wup-textrich";
declare global {
  namespace WUP.TextRich {
    /** Formats with values: toolbar item `"header"` shows every value, `{ header: [1, 2, false] }` - only pointed values */
    interface FormatValues {
      /** Heading level; `false` - normal paragraph */
      header: 1 | 2 | 3 | 4 | 5 | 6 | false;
      /** Numbered or bulleted list */
      list: "ordered" | "bullet";
      /** Subscript or superscript */
      script: "sub" | "super";
      /** Decrease (`-1`) or increase (`+1`) indentation */
      indent: -1 | 1;
      /** Font size: `"sm"` - small, `"lg"` - large, `"hg"` - huge; `false` - normal */
      size: "sm" | "lg" | "hg" | false;
      /** Text alignment; `"left"` - default */
      align: "left" | "center" | "right" | "justify";
    }
    /** Toolbar button: toggles format (bold, blockquote etc.), inserts link,
     *  or removes formatting of selected text (clean) */
    type ToolbarButton = "bold" | "italic" | "underline" | "strike" | "blockquote" | "code-block" | "link" | "clean";
    /** Formats with pointed values: `{ header: [1, 2, false] }` */
    type ToolbarValues = { [K in keyof FormatValues]: FormatValues[K][] };
    /** Toolbar item: button `"bold"`, format with every value `"header"`
     *  (the same as `{ header: [1, 2, 3, 4, 5, 6, false] }`) or format with pointed values `{ header: [1, 2, false] }`
     * @tutorial Rules
     * * `header`, `size`, `align` are rendered as dropdown; `list`, `script`, `indent` - as button per value */
    type ToolbarItem =
      | ToolbarButton
      | keyof FormatValues
      | { [K in keyof ToolbarValues]: Pick<ToolbarValues, K> }[keyof ToolbarValues];
    /** Group of toolbar items (groups are visually separated) */
    type ToolbarGroup = ToolbarItem[];

    interface EventMap extends WUP.TextArea.EventMap {}
    interface ValidityMap extends WUP.TextArea.ValidityMap {}
    interface NewOptions {
      /** Toolbar items split into groups; point empty array to hide toolbar
       * @see {@link ToolbarItem}
       * @example
       * [
       *   ["bold", "italic", "underline"], // buttons
       *   ["header"], // format with every value
       *   [{ size: ["sm", false, "lg"] }], // format with pointed values only
       *   ["clean"], // removes formatting
       * ]
       * @defaultValue every supported item */
      toolbar: ToolbarGroup[];
      // classNames: { bold: ".wup-bold", toolbar?: string | bool | null }; // todo implement this so if pointed className then it must be applied to relevant block, for toolbar expected string=> another classname, and if NOT (false or null) => use same className to related toolbar item
    }
    interface Options<T = string, VM = ValidityMap> extends WUP.TextArea.Options<T, VM>, NewOptions {}
    interface JSXProps<C = WUPTextRichControl> extends WUP.TextArea.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      /** Global reference to object with array
       * @see {@link ToolbarGroup}
       * @example
       * ```js
       * window.myToolbar = [["bold", "italic"], ["clean"]];
       * <wup-textrich w-toolbar="window.myToolbar"></wup-textrich>
       * ``` */
      "w-toolbar"?: string;
    }
  }

  interface HTMLElementTagNameMap {
    [tagName]: WUPTextRichControl; // add element to document.createElement
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** Form-control with rich text editor (WYSIWYG)
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/control/textRich}
       *  @see {@link WUPTextRichControl} */
      [tagName]: WUP.Base.ReactHTML<WUPTextRichControl> & WUP.TextRich.JSXProps; // add element to tsx/jsx intellisense (react)
    }
  }
}

// @ts-ignore - because Preact & React can't work together
declare module "preact/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface HTMLAttributes<RefType> {}
    interface IntrinsicElements {
      /** Form-control with rich text editor (WYSIWYG)
       *  @see demo {@link https://yegorich555.github.io/web-ui-pack/control/textRich}
       *  @see {@link WUPTextRichControl} */
      [tagName]: HTMLAttributes<WUPTextRichControl> & WUP.TextRich.JSXProps; // add element to tsx/jsx intellisense (preact)
    }
  }
}

/** Toolbar button or item of dropdown that applies format on click */
type ToolElement = HTMLElement & { _format: string; _value?: unknown };
interface Tool {
  format: string;
  /** Value of button (ex. `"ordered"` for list) */
  value?: unknown;
  /** Button or button of dropdown */
  el: HTMLElement;
  /** Items of dropdown */
  items?: ToolElement[];
}

/** Toolbar buttons without value */
const toolButtons = new Set<string>([
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "code-block",
  "link",
  "clean",
]);
/** Formats rendered as dropdown with default value (when format isn't applied); other formats are rendered as buttons */
const pickerDefaults = new Map<string, unknown>([
  ["header", false],
  ["size", false],
  ["align", "left"],
]);
/** Buttons without pressed state */
const actionButtons = new Set<string>(["clean", "indent"]);
/** Formats by tagName of element */
const tagFormats = new Map<string, [string, unknown]>([
  ["B", ["bold", true]],
  ["STRONG", ["bold", true]],
  ["I", ["italic", true]],
  ["EM", ["italic", true]],
  ["U", ["underline", true]],
  ["S", ["strike", true]],
  ["STRIKE", ["strike", true]],
  ["DEL", ["strike", true]],
  ["SUB", ["script", "sub"]],
  ["SUP", ["script", "super"]],
  ["H1", ["header", 1]],
  ["H2", ["header", 2]],
  ["H3", ["header", 3]],
  ["H4", ["header", 4]],
  ["H5", ["header", 5]],
  ["H6", ["header", 6]],
  ["PRE", ["code-block", true]],
]);
/** Font size by value of format `size` */
const sizes = new Map<unknown, string>([
  ["sm", "small"],
  ["lg", "x-large"],
  ["hg", "xxx-large"],
]);
/** Value of format `size` by font size */
const sizeFormats = new Map<string, unknown>([
  ["small", "sm"],
  ["x-large", "lg"],
  ["xxx-large", "hg"],
]);
/** Supported values of text-align */
const aligns = new Set<string>(["left", "center", "right", "justify"]);
/** Formatting via browser (keyboard shortcuts etc.): `beforeinput.inputType` => [format, value]; other `format...` are prevented */
const formatInputs = new Map<string, [string, unknown?]>([
  ["formatBold", ["bold"]],
  ["formatItalic", ["italic"]],
  ["formatUnderline", ["underline"]],
  ["formatStrikeThrough", ["strike"]],
  ["formatSuperscript", ["script", "super"]],
  ["formatSubscript", ["script", "sub"]],
  ["formatJustifyFull", ["align", "justify"]],
  ["formatJustifyCenter", ["align", "center"]],
  ["formatJustifyRight", ["align", "right"]],
  ["formatJustifyLeft", ["align", "left"]],
  ["formatIndent", ["indent", 1]],
  ["formatOutdent", ["indent", -1]],
  ["formatRemove", ["clean"]],
]);
/** Inline formats that can be pointed for the next typed text (when selection is collapsed) */
const pendingFormats = new Set<string>(["bold", "italic", "underline", "strike", "script", "size"]);
/** Tags of lines by line formats */
const lineTags = new Map<string, string>([
  ["blockquote", "BLOCKQUOTE"],
  ["code-block", "PRE"],
]);

/** Returns the 1st node inside the range (text node at the start or next one if range starts at the end of node) */
function firstNode(r: Range): Node {
  const n = r.startContainer;
  if (r.collapsed) {
    return n;
  }
  if (n.nodeType === Node.TEXT_NODE) {
    if (r.startOffset < (n as Text).length) {
      return n;
    }
  } else if (n.childNodes[r.startOffset]) {
    return n.childNodes[r.startOffset];
  }
  const w = document.createTreeWalker(r.commonAncestorContainer, NodeFilter.SHOW_TEXT);
  w.currentNode = n;
  const next = w.nextNode();
  return next && r.intersectsNode(next) ? next : n;
}

/** Form-control with rich text editor (WYSIWYG): text is formatted via toolbar; behavior & styles are similar to npm quill
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/control/textRich}
 * @example
  const el = document.createElement("wup-textrich");
  el.$options.name = "description";
  el.$options.toolbar = [
    ["bold", "italic", "underline"],
    [{ list: ["ordered", "bullet"] }],
    ["clean"],
  ];
  el.$options.validations = { required: true, max: 1000 };
  el.$initValue = "<p>Some <strong>bold</strong> text</p>";

  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-textrich w-name="description" w-toolbar="window.myToolbar" w-validations="myValidations"/>
  </wup-form>;
 * @tutorial Rules
 * * $value is html (`undefined` if there is no text); it's sanitized: only supported formats are kept
 * (paragraph `<p>`, `<strong>`, `<em>`, `<u>`, `<s>`, `<sub>`, `<sup>`, `<a>`, `<h1>...<h6>`, `<blockquote>`, `<pre>`, `<ol>`, `<ul>`)
 * * formatting is saved in custom history: undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y, OS-native) works for text & formats
 * * keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+U & Alt+F10 to focus toolbar (Arrows to navigate, Esc to return);
 * with collapsed selection inline format (bold etc.) is applied to the next typed text
 * * styles of content are global: use `<div wup-textrich>{$value}</div>` to show value outside control in the same way
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <wup-richinput contenteditable="true" role="textbox" aria-multiline="true" wup-textrich />
 *      <strong>{$options.label}</strong>
 *   </span>
 *   <button clear/>
 * </label>
 * <div role="toolbar"> // placed at the top via css (order: -1)
 *   <div role="group">
 *     <button tool="bold" aria-pressed="false"></button>
 *     <wup-dropdown tool="header">
 *       <button>Normal</button>
 *       <wup-popup><ul role="listbox"><li role="option" tool="header:1"><h1 role="none">Heading 1</h1></li>...</ul></wup-popup>
 *     </wup-dropdown>
 *   </div>
 * </div>
 * @tutorial Troubleshooting
 * * link is requested via `window.prompt` */
export default class WUPTextRichControl<
  ValueType = string,
  TOptions extends WUP.TextRich.Options = WUP.TextRich.Options,
  EventMap extends WUP.TextRich.EventMap = WUP.TextRich.EventMap
> extends WUPTextAreaControl<ValueType, TOptions, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextRichControl;

  static get $styleRoot(): string {
    return "";
  }

  static get $style(): string {
    return super.$style;
  }

  /** Text announced by screen-readers; @defaultValue `press Alt + F10 to focus toolbar` */
  static $ariaDescription = __wupln("press Alt + F10 to focus toolbar", "aria");
  /** Text of prompt for link; @defaultValue `Enter link` */
  static $textLink = __wupln("Enter link", "content");
  /** Labels of toolbar items: key is `format` or `format:value` (ex. `header:1`);
   * used as `aria-label` for buttons (+ tooltip) & as text for items of dropdowns */
  static $labels = new Map<string, string>([
    ["toolbar", __wupln("Formatting", "aria")],
    ["bold", __wupln("Bold", "aria")],
    ["italic", __wupln("Italic", "aria")],
    ["underline", __wupln("Underline", "aria")],
    ["strike", __wupln("Strikethrough", "aria")],
    ["blockquote", __wupln("Quote", "aria")],
    ["code-block", __wupln("Code block", "aria")],
    ["link", __wupln("Link", "aria")],
    ["clean", __wupln("Clear formatting", "aria")],
    ["header", __wupln("Heading", "aria")],
    ["header:false", __wupln("Normal", "content")],
    ["header:1", __wupln("Heading 1", "content")],
    ["header:2", __wupln("Heading 2", "content")],
    ["header:3", __wupln("Heading 3", "content")],
    ["header:4", __wupln("Heading 4", "content")],
    ["header:5", __wupln("Heading 5", "content")],
    ["header:6", __wupln("Heading 6", "content")],
    ["list:ordered", __wupln("Numbered list", "aria")],
    ["list:bullet", __wupln("Bulleted list", "aria")],
    ["script:sub", __wupln("Subscript", "aria")],
    ["script:super", __wupln("Superscript", "aria")],
    ["indent:-1", __wupln("Decrease indent", "aria")],
    ["indent:1", __wupln("Increase indent", "aria")],
    ["size", __wupln("Font size", "aria")],
    ["size:false", __wupln("Normal", "content")],
    ["size:sm", __wupln("Small", "content")],
    ["size:lg", __wupln("Large", "content")],
    ["size:hg", __wupln("Huge", "content")],
    ["align", __wupln("Alignment", "aria")],
    ["align:left", __wupln("Left", "aria")],
    ["align:center", __wupln("Center", "aria")],
    ["align:right", __wupln("Right", "aria")],
    ["align:justify", __wupln("Justify", "aria")],
  ]);

  /** Values of formats used when toolbar item is pointed as string (ex. `"header"` is the same as `{ header: [1, 2, 3, 4, 5, 6, false] }`) */
  static $toolbarValues: WUP.TextRich.ToolbarValues = {
    header: [1, 2, 3, 4, 5, 6, false],
    list: ["ordered", "bullet"],
    script: ["sub", "super"],
    indent: [-1, 1],
    size: ["hg", "lg", "sm", false],
    align: ["center", "right", "justify", "left"],
  };

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUP.TextRich.Options = inheritDefaults(WUPTextAreaControl.$defaults, {
    validationRules: inheritDefaults(WUPTextAreaControl.$defaults.validationRules, {
      // WARN: validations min/max must depend on visible chars only
      min: (v, setV, c, r) => WUPTextControl.$defaults.validationRules.min!.call!(c, v && htmlToText(v), setV, c, r),
      max: (v, setV, c, r) => WUPTextControl.$defaults.validationRules.max!.call!(c, v && htmlToText(v), setV, c, r),
    }),
    // WARN: commented options need to skip for implementation
    toolbar: [
      ["header"], // equal to [{header: [1,2,3,4,5,6, false]}],
      ["bold", "italic", "underline", "strike"], // { bold: true, italic: true, underline: true, strike: true },
      ["blockquote", "code-block"],
      ["link"], // not supported => image: true, video: true, formula: true
      ["list"], // equal to [{ list: ["ordered", "bullet"] ]
      ["script"], // equal to [{script: ['sub', 'super']}]
      ["indent"], // equal to [{indent: [-1, +1]}]
      ["size"], // equal to [{sizes: ["hg", "lg","sm", false]}]
      // not supported => direction
      // not supported => [{ font: [] }],
      // not supported => { colors: true },
      // not supported => [{ background: [] }],
      ["align"], // equal to [{ align: ["center", "right", "justify", "left", false] }],
      ["clean"],
    ],
  });

  static override cloneDefaults<T extends Record<string, any>>(): T {
    const d = super.cloneDefaults() as WUP.TextRich.Options;
    // clone array otherwise changing $options.toolbar[i] mutates $defaults (shared between all elements)
    d.toolbar = d.toolbar.slice();
    return d as unknown as T;
  }

  $refInput = document.createElement("wup-richinput") as HTMLInputElement;
  /** Toolbar with buttons & dropdowns to format text */
  $refToolbar = document.createElement("div");

  /** Rendered items of toolbar */
  #tools: Tool[] = [];
  /** Last selection inside editor: restored when format is applied via toolbar by keyboard (when focus is on toolbar) */
  #range?: Range;

  protected override renderControl(): void {
    super.renderControl();
    const bar = this.$refToolbar;
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", this.#ctr.$labels.get("toolbar")!);
    bar.addEventListener("click", (e) => this.gotToolbarClick(e));
    bar.addEventListener("keydown", (e) => this.gotToolbarKeyDown(e));
    this.appendChild(bar); // placed after editor & moved to the top via css: otherwise form autofocus focuses toolbar

    // hint for screen-readers how to reach toolbar via keyboard
    const hint = this.$refLabel.appendChild(document.createElement("span"));
    hint.id = this.#ctr.$uniqueId;
    hint.className = this.#ctr.classNameHidden;
    hint.textContent = this.#ctr.$ariaDescription;
    this.$refInput.setAttribute("aria-describedby", hint.id);
    this.$refInput.setAttribute("wup-textrich", ""); // styles of content are global: the same for value shown outside

    useTooltipOnce("w-tooltip"); // toolbar buttons show aria-label via tooltip
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.TextRich.Options> | null): void {
    super.gotChanges(propsChanged as any);
    (!propsChanged || propsChanged.includes("toolbar")) && this.renderToolbar();
  }

  /** Renders toolbar according to $options.toolbar */
  protected renderToolbar(): void {
    const bar = this.$refToolbar;
    bar.replaceChildren();
    this.#tools = [];
    this._opts.toolbar?.forEach((items) => {
      const g = document.createElement("div");
      g.setAttribute("role", "group");
      items.forEach((item) => this.renderTool(g, item));
      g.firstChild && bar.appendChild(g);
    });
    this.refreshToolbar();
  }

  /** Renders toolbar item into group */
  protected renderTool(group: HTMLElement, item: WUP.TextRich.ToolbarItem): void {
    const isName = typeof item === "string";
    const format: string = isName ? item : Object.keys(item)[0];
    const values = (
      isName ? this.#ctr.$toolbarValues[item as keyof WUP.TextRich.FormatValues] : Object.values(item)[0]
    ) as unknown[] | undefined;

    if (!values) {
      toolButtons.has(format)
        ? this.renderButton(group, format)
        : this.throwError(`Toolbar item '${format}' isn't supported`, undefined, true);
    } else if (pickerDefaults.has(format)) {
      this.renderPicker(group, format, values);
    } else {
      values.forEach((v) => this.renderButton(group, format, v));
    }
  }

  /** Renders button of toolbar (button without value toggles format) */
  protected renderButton(group: HTMLElement, format: string, value?: unknown): void {
    const b = group.appendChild(document.createElement("button")) as HTMLButtonElement & ToolElement;
    const key = value === undefined ? format : `${format}:${value}`;
    b.type = "button";
    b.tabIndex = -1; // toolbar is reachable via Alt+F10
    b.setAttribute("tool", key);
    b.setAttribute("aria-label", this.#ctr.$labels.get(key) ?? key);
    b.setAttribute("w-tooltip", "");
    !actionButtons.has(format) && b.setAttribute("aria-pressed", false);
    b._format = format;
    b._value = value;
    this.#tools.push({ format, value, el: b });
  }

  /** Renders dropdown of toolbar */
  protected renderPicker(group: HTMLElement, format: string, values: unknown[]): void {
    const dd = group.appendChild(document.createElement("wup-dropdown"));
    dd.$options.openCase = PopupOpenCases.onClick; // without onFocus: otherwise it's opened on navigation via Arrows
    dd.$options.closeOnPopupClick = false; // closed manually: otherwise popup returns focus to button instead of editor
    dd.setAttribute("tool", format);
    const b = dd.appendChild(document.createElement("button"));
    b.type = "button";
    b.tabIndex = -1;
    b.setAttribute("aria-label", this.#ctr.$labels.get(format) ?? format);
    b.setAttribute("w-tooltip", "");
    const ul = dd.appendChild(document.createElement("wup-popup")).appendChild(document.createElement("ul"));
    ul.setAttribute("role", "listbox");
    const items = values.map((v) => {
      const li = ul.appendChild(document.createElement("li")) as HTMLLIElement & ToolElement;
      const key = `${format}:${v}`;
      const label = this.#ctr.$labels.get(key) ?? String(v);
      li.setAttribute("role", "option");
      li.setAttribute("tool", key);
      li.tabIndex = -1;
      if (format === "align") {
        li.setAttribute("aria-label", label); // align is rendered as icon
      } else if (format === "header" && v) {
        // rendered via heading tag to use the same (default/global) styles as in editor; role="none" hides heading semantics
        const h = li.appendChild(document.createElement(`h${v}`));
        h.setAttribute("role", "none");
        h.textContent = label;
      } else if (format === "size") {
        // font size is applied to inner span: otherwise checkmark of selected item is scaled too
        const s = li.appendChild(document.createElement("span"));
        s.style.fontSize = sizes.get(v) ?? ""; // the same font size as in editor
        s.textContent = label;
      } else {
        li.textContent = label;
      }
      li._format = format;
      li._value = v;
      return li;
    });
    this.#tools.push({ format, el: b, items });
  }

  /** Updates state of toolbar items according to formats of selection */
  protected refreshToolbar(formats = this.getFormats()): void {
    this.#tools.forEach((t) => {
      if (t.items) {
        const cur = formats.get(t.format) ?? pickerDefaults.get(t.format);
        if (t.format === "align") {
          t.el.setAttribute("value", String(cur)); // icon is defined by value
        } else {
          t.el.textContent = this.#ctr.$labels.get(`${t.format}:${cur}`) ?? String(cur);
        }
        t.items.forEach((li) => li.setAttribute("aria-selected", li._value === cur));
      } else if (!actionButtons.has(t.format)) {
        const v = formats.get(t.format);
        t.el.setAttribute("aria-pressed", t.value === undefined ? v !== undefined : v === t.value);
      }
    });
  }

  /** Returns formats applied to selection (defined by the start of selection) including formats for the next typed text */
  protected getFormats(): Map<string, unknown> {
    const m = new Map<string, unknown>();
    const inp = this.$refInput;
    const sel = window.getSelection();
    if (!sel?.rangeCount) {
      return m;
    }
    let n: Node | null = firstNode(sel.getRangeAt(0));
    if (!inp.contains(n)) {
      return m;
    }
    for (; n && n !== inp; n = n.parentNode) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as HTMLElement;
        const tag = el.tagName;
        const f = tagFormats.get(tag);
        if (f) {
          !m.has(f[0]) && m.set(f[0], f[1]);
        } else if (tag === "A") {
          m.set("link", el.getAttribute("href"));
        } else if (tag === "BLOCKQUOTE") {
          m.set("blockquote", true);
        } else if (tag === "LI" && !m.has("list")) {
          m.set("list", listType(el.parentElement!));
        }
        const size = sizeFormats.get(el.style.fontSize);
        size && !m.has("size") && m.set("size", size);
        const a = el.style.textAlign;
        !m.has("align") && aligns.has(a) && m.set("align", a);
      }
    }
    this.#pending.forEach((v, k) => (v === false ? m.delete(k) : m.set(k, v)));
    return m;
  }

  /** Focuses editor & restores the last selection if focus is on toolbar */
  protected restoreSelection(): void {
    const inp = this.$refInput;
    if (document.activeElement === inp) {
      return;
    }
    inp.focus({ preventScroll: true });
    const r = this.#range;
    if (r && inp.contains(r.startContainer)) {
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }

  /** Applies format to selection (toggles if it's applied already);
   * inline format with collapsed selection is applied to the next typed text (the same as quill) */
  protected applyFormat(format: string, value?: unknown): void {
    if (this.$isDisabled || this.$isReadOnly) {
      return;
    }
    this.restoreSelection();
    const inp = this.$refInput;
    const sel = window.getSelection()!;
    if (!sel.rangeCount || !inp.contains(sel.anchorNode)) {
      return;
    }
    const f = this.getFormats();
    if (sel.isCollapsed && (pendingFormats.has(format) || format === "clean")) {
      this.togglePending(format, value, f);
    } else {
      const prev = inp.value;
      if (format === "link" && !f.has("link")) {
        const v = this.askLink();
        v && this.addLink(v);
      } else {
        this.keepSelection((r) => this.formatRange(r, format, value));
      }
      this.saveChanges(prev);
    }
    this.refreshToolbar();
  }

  /** Applies format to range: inline formats are applied to text, others - to lines */
  protected formatRange(r: Range, format: string, value?: unknown): void {
    const inp = this.$refInput;
    switch (format) {
      case "bold":
      case "italic":
      case "underline":
      case "strike":
        this.toggleInline(splitRange(r), format);
        break;
      case "script": {
        const nodes = splitRange(r);
        removeInline(nodes, inlineFormats.get(value === "sub" ? "script:super" : "script:sub")!, inp); // only one is possible
        this.toggleInline(nodes, `script:${value}`);
        break;
      }
      case "size": {
        const nodes = splitRange(r);
        const fmt = inlineFormats.get(format)!;
        removeInline(nodes, fmt, inp);
        value && addInline(nodes, fmt, sizes.get(value), inp);
        break;
      }
      case "link": {
        // remove link: whole link if selection is collapsed
        const fmt = inlineFormats.get(format)!;
        const a = r.collapsed && formatParents(r.startContainer, fmt, inp)[0];
        a ? unwrap(a) : removeInline(splitRange(r), fmt, inp);
        break;
      }
      case "header":
        linesOf(r, inp).forEach((l) => setLineTag(l, value ? `H${value}` : "DIV"));
        break;
      case "blockquote":
      case "code-block": {
        const lines = linesOf(r, inp);
        const tag = lineTags.get(format)!;
        const isOn = lines.every((l) => l.tagName === tag);
        lines.forEach((l) => setLineTag(l, isOn ? "DIV" : tag));
        break;
      }
      case "list": {
        const lines = linesOf(r, inp);
        const isOn = lines.every((l) => l.tagName === "LI" && listType(l.parentElement!) === value);
        lines.forEach((l) =>
          isOn ? setLineTag(l, "DIV") : setLineList(l, value as WUP.TextRich.FormatValues["list"])
        );
        mergeLists(inp);
        break;
      }
      case "align":
        linesOf(r, inp).forEach((l) => setLineAlign(l, value as string));
        break;
      case "indent":
        linesOf(r, inp).forEach((l) => setLineIndent(l, value as number));
        break;
      case "clean": {
        const lines = linesOf(r, inp); // before changes in range
        const nodes = splitRange(r);
        inlineFormats.forEach((fmt) => removeInline(nodes, fmt, inp));
        lines.forEach((l) => setLineTag(l, "DIV").removeAttribute("style"));
        break;
      }
      default:
        break;
    }
  }

  /** Toggles inline format: it's removed if every text node has it already */
  protected toggleInline(nodes: Text[], key: string): void {
    const inp = this.$refInput;
    const fmt = inlineFormats.get(key)!;
    nodes.every((t) => formatParents(t, fmt, inp).length)
      ? removeInline(nodes, fmt, inp)
      : addInline(nodes, fmt, true, inp);
  }

  /** Formats for the next typed text (when selection is collapsed): format => value (`false` to remove format) */
  #pending = new Map<string, unknown>();
  /** Position of caret when formats for the next typed text are pointed: they're reset when caret is moved */
  #pendingAt?: [Node, number];
  /** Toggles format for the next typed text (Ctrl+B and type text) */
  protected togglePending(format: string, value: unknown, f: Map<string, unknown>): void {
    const p = this.#pending;
    if (format === "clean") {
      pendingFormats.forEach((k) => f.has(k) && p.set(k, false));
    } else if (format === "size") {
      p.set(format, value || false);
    } else if (format === "script") {
      p.set(format, f.get(format) === value ? false : value);
    } else {
      p.set(format, !f.has(format));
    }
    const sel = window.getSelection()!;
    this.#pendingAt = [sel.anchorNode!, sel.anchorOffset];
  }

  /** Inserts text with formats pointed for the next typed text */
  protected insertPending(text: string): void {
    const inp = this.$refInput;
    const sel = window.getSelection()!;
    const r = sel.getRangeAt(0);
    r.deleteContents();
    // move caret out of elements of removed/changed formats
    this.#pending.forEach((v, k) => {
      if (v === false || k === "script" || k === "size") {
        (k === "script" ? ["script:sub", "script:super"] : [k]).forEach((key) => {
          const el = formatParents(r.startContainer, inlineFormats.get(key)!, inp).pop(); // the outer one
          el && splitAt(el, r);
        });
      }
    });
    const t = document.createTextNode(text);
    let node: Node = t;
    this.#pending.forEach((v, k) => {
      const fmt = v !== false && inlineFormats.get(k === "script" ? `script:${v}` : k)!;
      if (fmt && !formatParents(r.startContainer, fmt, inp).length) {
        const el = fmt.create(k === "size" ? sizes.get(v) : v);
        el.appendChild(node);
        node = el;
      }
    });
    r.insertNode(node);
    sel.collapse(t, t.length);
    this.#pending.clear();
  }

  /** Calls fn that changes editor & restores selection: it's saved by lines & chars because fn can move or split nodes */
  protected keepSelection(fn: (r: Range) => void): void {
    const inp = this.$refInput;
    const sel = window.getSelection()!;
    // position pointed by root (root, index) is converted into position inside child: otherwise index is wrong after wrapping
    const childPos = (n: Node, offset: number): [Node, number] => {
      const c = n === inp && inp.childNodes[offset];
      return c ? [c, 0] : [n, offset];
    };
    const [an, ao] = childPos(sel.anchorNode!, sel.anchorOffset);
    const [fn1, fo] = childPos(sel.focusNode!, sel.focusOffset);
    wrapLines(inp) && sel.setBaseAndExtent(an, ao, fn1, fo); // nodes are moved into lines
    let lines = getLines(inp);
    const p1 = toLinePos(lines, sel.anchorNode!, sel.anchorOffset);
    const p2 = toLinePos(lines, sel.focusNode!, sel.focusOffset);
    fn(sel.getRangeAt(0));
    lines = getLines(inp);
    if (lines.length) {
      const [n1, o1] = fromLinePos(lines, p1);
      const [n2, o2] = fromLinePos(lines, p2);
      sel.setBaseAndExtent(n1, o1, n2, o2);
    }
  }

  /** Asks url of link via prompt; returns focus & selection back */
  protected askLink(): string | null {
    const sel = window.getSelection()!;
    const r = sel.getRangeAt(0).cloneRange();
    // todo use wup-popup with textControl instead
    const v = window.prompt(this.#ctr.$textLink, "https://")?.trim(); // eslint-disable-line no-alert
    this.$refInput.focus({ preventScroll: true });
    sel.removeAllRanges();
    sel.addRange(r);
    return (v && sanitizeUrl(v)) || null;
  }

  /** Adds link to selection or inserts link with url as text if selection is collapsed */
  protected addLink(href: string): void {
    // todo when user hover this link - show tooltip with attached url
    const fmt = inlineFormats.get("link")!;
    if (window.getSelection()!.isCollapsed) {
      const a = fmt.create(href);
      a.textContent = href;
      this.insertNode(a);
    } else {
      this.keepSelection((r) => {
        const nodes = splitRange(r);
        removeInline(nodes, fmt, this.$refInput);
        addInline(nodes, fmt, href, this.$refInput);
      });
    }
  }

  /** Replaces selection with node & places caret after it */
  protected insertNode(node: Node): void {
    const sel = window.getSelection()!;
    const r = sel.getRangeAt(0);
    const last = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node.lastChild : node;
    r.deleteContents();
    r.insertNode(node);
    if (last) {
      r.setStartAfter(last);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }

  /** Replaces selection with sanitized html: blocks are inserted after the current line (it's split by caret) */
  protected insertHTML(html: string): void {
    const f = htmlToEditor(html);
    const inp = this.$refInput;
    const r = window.getSelection()!.getRangeAt(0);
    r.deleteContents();
    const line = getLines(inp).findLast((l) => l.contains(r.startContainer));
    const first = f.firstElementChild;
    if (!first) {
      return;
    }
    if ((f.childNodes.length === 1 && first.tagName === "DIV") || !line || line.tagName === "LI") {
      // insert as inline content: lines are separated by <br>
      const frag = document.createDocumentFragment();
      const flatten = (el: Element): void => {
        if (el.tagName === "OL" || el.tagName === "UL") {
          Array.from(el.children).forEach(flatten);
          return;
        }
        frag.lastChild && frag.append(document.createElement("br"));
        Array.from(el.childNodes).forEach((n) =>
          (n as Element).tagName === "OL" || (n as Element).tagName === "UL" ? flatten(n as Element) : frag.append(n)
        );
      };
      Array.from(f.children).forEach(flatten);
      this.insertNode(frag);
      return;
    }
    const tail = document.createRange();
    tail.setStart(r.startContainer, r.startOffset);
    tail.setEnd(line, line.childNodes.length);
    const after = line.cloneNode(false) as HTMLElement;
    after.appendChild(tail.extractContents());
    const last = f.lastChild!;
    line.after(f);
    last.after(after);
    !after.textContent && after.remove();
    !line.textContent && line.remove();
    window.getSelection()!.collapse(last, last.childNodes.length);
  }

  /** Called after changes of editor (not by browser): saves history & updates $value */
  protected saveChanges(prev: string): void {
    const inp = this.$refInput as unknown as WUPTextRichInput;
    inp._cached = undefined;
    if (inp.value !== prev) {
      this._refHistory?.save(prev, inp.value);
      this.fireInput();
    }
  }

  /** Fires event input to update $value after manual changes of editor */
  protected fireInput(): void {
    this.$refInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }

  protected gotToolbarClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest("[tool]") as ToolElement | null;
    if (!el?._format) {
      return; // dropdown has [tool] too but it opens popup itself
    }
    this.applyFormat(el._format, el._value);
    el.tagName === "LI" && el.closest("wup-dropdown")!.$refPopup.$close();
  }

  /** Handles keyboard on toolbar: Arrows to navigate, Enter/Space to apply, Esc to return to editor */
  protected gotToolbarKeyDown(e: KeyboardEvent): void {
    if (e.altKey || e.ctrlKey || e.metaKey || this.$isDisabled || this.$isReadOnly) {
      return;
    }
    const el = document.activeElement as HTMLElement;
    const isItem = el.tagName === "LI";
    const dd = el.closest("wup-dropdown");
    let next: HTMLElement | undefined;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowRight":
      case "Home":
      case "End": {
        if (isItem) {
          return;
        }
        const arr = Array.from(
          this.$refToolbar.querySelectorAll<HTMLElement>("[role=group] > button, wup-dropdown > button")
        );
        const i = arr.indexOf(el);
        const last = arr.length - 1;
        if (e.key === "Home" || e.key === "End") {
          next = arr[e.key === "Home" ? 0 : last];
        } else {
          next = e.key === "ArrowRight" ? arr[i < last ? i + 1 : 0] : arr[i > 0 ? i - 1 : last];
        }
        break;
      }
      case "ArrowDown":
      case "ArrowUp": {
        if (!dd) {
          return;
        }
        e.preventDefault();
        const items = Array.from(dd.querySelectorAll("li"));
        if (isItem) {
          const i = items.indexOf(el as HTMLLIElement);
          next = e.key === "ArrowDown" ? items[(i + 1) % items.length] : items[(i - 1 + items.length) % items.length];
        } else {
          const focusItem = (): void =>
            (items.find((li) => li.getAttribute("aria-selected") === "true") ?? items[0])?.focus();
          dd.$refPopup.$isOpened ? focusItem() : dd.$refPopup.$open().then(focusItem);
        }
        break;
      }
      case "Enter":
      case " ":
        if (isItem) {
          e.preventDefault();
          el.click(); // applies format & closes popup
        }
        return;
      case "Escape":
        e.preventDefault(); // otherwise value is cleared
        if (isItem) {
          dd!.$refPopup.$close();
          (dd!.firstElementChild as HTMLElement).focus();
        } else {
          this.restoreSelection();
        }
        return;
      default:
        return;
    }
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }

  protected override gotFocus(ev: FocusEvent): Array<() => void> {
    const arr = super.gotFocus(ev);
    const onSelect = (): void => {
      const sel = window.getSelection();
      if (sel?.rangeCount && this.$refInput.contains(sel.getRangeAt(0).startContainer)) {
        this.#range = sel.getRangeAt(0).cloneRange();
        const p = this.#pendingAt;
        p && (sel.anchorNode !== p[0] || sel.anchorOffset !== p[1]) && this.#pending.clear(); // caret is moved
        this.refreshToolbar();
      }
    };
    onSelect();
    arr.push(this.appendEvent(document, "selectionchange", onSelect));
    return arr;
  }

  protected override gotFocusLost(): void {
    super.gotFocusLost();
    this.#range = undefined;
    this.#pending.clear();
    this.refreshToolbar(new Map());
  }

  protected override gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    if (e.altKey && e.key === "F10") {
      e.preventDefault();
      this.$refToolbar.querySelector("button")?.focus();
      return;
    }
    super.gotKeyDown(e);
  }

  protected override gotBeforeInput(e: WUP.Text.GotInputEvent): void {
    if (this.$isReadOnly) {
      e.preventDefault();
      return;
    }
    const t = e.inputType;
    if (t.startsWith("format")) {
      e.preventDefault(); // formatting by browser (keyboard shortcuts) is replaced with custom one: to save it in custom history
      const f = formatInputs.get(t); // color, font etc. aren't supported
      f && this.applyFormat(f[0], f[1]);
      return;
    }
    super.gotBeforeInput(e); // custom history: undo/redo & state before changes
    if (e.defaultPrevented) {
      return;
    }
    const isPaste = t === "insertFromPaste" || t === "insertFromPasteAsQuotation" || t === "insertFromDrop";
    const html = isPaste && e.dataTransfer?.getData("text/html");
    if (html) {
      // insert sanitized html (otherwise browser inserts any content: images, colors etc.)
      e.preventDefault();
      const [r] = e.getTargetRanges();
      this.$refInput.focus({ preventScroll: true });
      r && window.getSelection()!.setBaseAndExtent(r.startContainer, r.startOffset, r.endContainer, r.endOffset);
      this.insertHTML(html);
    } else if (t === "insertText" && e.data && this.#pending.size) {
      e.preventDefault();
      this.insertPending(e.data);
    } else {
      return;
    }
    this.fireInput(); // history is saved on input according to state before changes
  }

  protected override createHistory(): TextHistory {
    return new TextRichHistory(this.$refInput);
  }

  protected override setInputValue(v: string, reason: SetValueReasons): void {
    if (v && v === this.$refInput.value) {
      return; // skip re-rendering: it resets selection & scroll
    }
    super.setInputValue(v, reason);
  }
}

customElements.define(tagName, WUPTextRichControl);
