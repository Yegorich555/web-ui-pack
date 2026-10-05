import { inheritDefaults } from "../baseElement";
import WUPDropdownElement from "../dropdownElement";
import { PopupOpenCases } from "../popup/popupElement.types";
import { useTooltipOnce } from "../popup/popupTooltip";
import { SetValueReasons } from "./baseControl";
import WUPTextControl from "./text";
import WUPTextareaControl from "./textarea";
import WUPTextRichInput, {
  htmlToEditor,
  htmlToText,
  isIndentWrapper,
  renderFormula,
  sanitizeUrl,
} from "./textRich.input";

WUPTextRichInput.$use();
WUPDropdownElement.$use();

const tagName = "wup-textrich";
declare global {
  namespace WUP.TextRich {
    /** Formats with values: toolbar item `"header"` shows every value, `{ header: [1, 2, false] }` - only pointed values */
    interface FormatValues {
      /** Heading level; `false` - normal paragraph */
      header: 1 | 2 | 3 | 4 | 5 | 6 | false;
      /** Numbered list, bulleted list or checklist */
      list: "ordered" | "bullet" | "check";
      /** Subscript or superscript */
      script: "sub" | "super";
      /** Decrease (`-1`) or increase (`+1`) indentation */
      indent: -1 | 1;
      /** Font size: `"sm"` - small, `"lg"` - large, `"hg"` - huge; `false` - normal */
      size: "sm" | "lg" | "hg" | false;
      /** Text alignment; `"left"` - default */
      align: "left" | "center" | "right" | "justify";
    }
    /** Toolbar button: toggles format (bold, blockquote etc.), inserts link or formula,
     *  or removes formatting of selected text (clean) */
    type ToolbarButton =
      | "bold"
      | "italic"
      | "underline"
      | "strike"
      | "blockquote"
      | "code-block"
      | "link"
      | "formula"
      | "clean";
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

    interface EventMap extends WUP.Textarea.EventMap {}
    interface ValidityMap extends WUP.Textarea.ValidityMap {}
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
    }
    interface Options<T = string, VM = ValidityMap> extends WUP.Textarea.Options<T, VM>, NewOptions {}
    interface JSXProps<C = WUPTextRichControl> extends WUP.Textarea.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
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
  "formula",
  "clean",
]);
/** Formats rendered as dropdown with default value (when format isn't applied); other formats are rendered as buttons */
const pickerDefaults = new Map<string, unknown>([
  ["header", false],
  ["size", false],
  ["align", "left"],
]);
/** Buttons without pressed state */
const actionButtons = new Set<string>(["clean", "indent", "formula"]);
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
/** Attribute `size` of `<font>` (produced by `document.execCommand("fontSize")`) by value of format `size` */
const fontSizes = new Map<unknown, string>([
  ["sm", "2"],
  ["lg", "5"],
  ["hg", "7"],
]);
/** Value of format `size` by attribute `size` of `<font>` */
const fontFormats = new Map<string, unknown>([
  ["2", "sm"],
  ["5", "lg"],
  ["7", "hg"],
]);
/** Command of `document.execCommand` by value of format `align` */
const alignCommands = new Map<unknown, string>([
  ["left", "justifyLeft"],
  ["center", "justifyCenter"],
  ["right", "justifyRight"],
  ["justify", "justifyFull"],
]);
/** Formatting via browser (keyboard shortcuts etc.) allowed for user: other `beforeinput.inputType: format...` are prevented */
const allowedFormatInputs = new Set<string>([
  "formatBold",
  "formatItalic",
  "formatUnderline",
  "formatStrikeThrough",
  "formatSuperscript",
  "formatSubscript",
  "formatJustifyFull",
  "formatJustifyCenter",
  "formatJustifyRight",
  "formatJustifyLeft",
  "formatIndent",
  "formatOutdent",
  "formatRemove",
]);

/** Calls `document.execCommand`: it applies format to selection & saves changes in browser history (for undo/redo)
 * @param isCss point true to apply style instead of element (`style="text-align: center"` instead of `align="center"` in Firefox) */
function exec(cmd: string, value?: string, isCss = false): void {
  document.execCommand("styleWithCSS", false, isCss ? "true" : "false");
  document.execCommand(cmd, false, value);
}

/** Returns line (block element) that contains node or root if there is no line (text placed directly in root) */
function lineOf(n: Node, root: HTMLElement): HTMLElement {
  const el = (n.nodeType === Node.ELEMENT_NODE ? n : n.parentElement) as HTMLElement;
  const line = el.closest<HTMLElement>("p,div,li,h1,h2,h3,h4,h5,h6,blockquote,pre");
  return line && line !== root && root.contains(line) ? line : root;
}

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

/** Returns value of format `list` by list element */
function listType(list: Element): WUP.TextRich.FormatValues["list"] {
  if (list.tagName === "OL") {
    return "ordered";
  }
  return list.hasAttribute("data-checklist") ? "check" : "bullet";
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
 * * formatting is applied via browser `document.execCommand` so undo/redo works as usual (Ctrl+Z, Ctrl+Y)
 * * keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+U & Alt+F10 to focus toolbar (Arrows to navigate, Esc to return)
 * * formula is rendered via KaTeX if it's available as `window.katex` (otherwise as text)
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <wup-richinput contenteditable="true" role="textbox" aria-multiline="true" />
 *      <strong>{$options.label}</strong>
 *   </span>
 *   <button clear/>
 * </label>
 * <div role="toolbar"> // placed at the top via css (order: -1)
 *   <div role="group">
 *     <button tool="bold" aria-pressed="false"></button>
 *     <wup-dropdown tool="header">
 *       <button>Normal</button>
 *       <wup-popup><ul role="listbox"><li role="option" tool="header:1">Heading 1</li>...</ul></wup-popup>
 *     </wup-dropdown>
 *   </div>
 * </div>
 * @tutorial Troubleshooting
 * * link & formula are requested via `window.prompt` */
export default class WUPTextRichControl<
  ValueType = string,
  TOptions extends WUP.TextRich.Options = WUP.TextRich.Options,
  EventMap extends WUP.TextRich.EventMap = WUP.TextRich.EventMap
> extends WUPTextareaControl<ValueType, TOptions, EventMap> {
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
  /** Text of prompt for formula; @defaultValue `Enter formula` */
  static $textFormula = __wupln("Enter formula", "content");
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
    ["formula", __wupln("Formula", "aria")],
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
    ["list:check", __wupln("Checklist", "aria")],
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
    list: ["ordered", "bullet", "check"],
    script: ["sub", "super"],
    indent: [-1, 1],
    size: ["hg", "lg", "sm", false],
    align: ["center", "right", "justify", "left"],
  };

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUP.TextRich.Options = inheritDefaults(WUPTextareaControl.$defaults, {
    validationRules: inheritDefaults(WUPTextareaControl.$defaults.validationRules, {
      // WARN: validations min/max must depend on visible chars only
      min: (v, setV, c, r) => WUPTextControl.$defaults.validationRules.min!.call!(c, v && htmlToText(v), setV, c, r),
      max: (v, setV, c, r) => WUPTextControl.$defaults.validationRules.max!.call!(c, v && htmlToText(v), setV, c, r),
    }),
    // WARN: commented options need to skip for implementation
    toolbar: [
      ["header"], // equal to [{header: [1,2,3,4,5,6, false]}],
      ["bold", "italic", "underline", "strike"], // { bold: true, italic: true, underline: true, strike: true },
      ["blockquote", "code-block"],
      ["link", "formula"], // not supported => image: true, video: true
      ["list"], // equal to [{ list: ["ordered", "bullet", "check"] ]
      ["script"], // equal to [{script: ['sub', 'super']}]
      ["indent"], // equal to [{indent: [-1, +1]}]
      ["size"], // equal to [{sizes: ["hg", "lg","sm", false]}]
      // not supported => direction
      // not supported => [{ font: [] }],
      // not supported => { colors: true },
      // not supported => [{ background: [] }],
      ["align"], // equal to [{ align: ["center", "right", "justify", "left", false] }], // what options missed here ???
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

    this.$refInput.addEventListener("click", (e) => this.gotEditorClick(e));
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
      format === "align" ? li.setAttribute("aria-label", label) : (li.textContent = label); // align is rendered as icon
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

  /** Returns formats applied to selection (defined by the start of selection) */
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
        } else if (tag === "FONT") {
          !m.has("size") &&
            fontFormats.has(el.getAttribute("size")!) &&
            m.set("size", fontFormats.get(el.getAttribute("size")!));
        } else if (tag === "BLOCKQUOTE") {
          !isIndentWrapper(el) && m.set("blockquote", true);
        } else if (tag === "LI" && !m.has("list")) {
          m.set("list", listType(el.parentElement!));
        }
        const a = el.style.textAlign;
        !m.has("align") && alignCommands.has(a) && m.set("align", a);
      }
    }
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

  /** Applies format to selection (toggles if it's applied already) */
  protected applyFormat(format: string, value?: unknown): void {
    if (this.$isDisabled || this.$isReadOnly) {
      return;
    }
    this.restoreSelection();
    const f = this.getFormats();
    const isOn = f.has(format);
    switch (format) {
      case "bold":
      case "italic":
      case "underline":
        exec(format);
        break;
      case "strike":
        exec("strikeThrough");
        break;
      case "script":
        exec(value === "sub" ? "subscript" : "superscript");
        break;
      case "header":
        exec("formatBlock", value ? `h${value}` : "div");
        break;
      case "blockquote":
        exec("formatBlock", isOn ? "div" : "blockquote");
        break;
      case "code-block":
        exec("formatBlock", isOn ? "div" : "pre");
        break;
      case "list":
        this.applyList(value as WUP.TextRich.FormatValues["list"], f.get("list") as string | undefined);
        break;
      case "indent":
        exec(value === -1 ? "outdent" : "indent", undefined, true);
        f.get("list") === "check" && this.markChecklist(true); // nested list created by indent
        break;
      case "align":
        exec(alignCommands.get(value)!, undefined, true);
        break;
      case "size":
        exec("fontSize", fontSizes.get(value) ?? "3"); // 3 is default size: Chrome removes <font>
        break;
      case "link":
        this.applyLink(isOn);
        break;
      case "formula":
        this.applyFormula();
        break;
      case "clean":
        this.applyClean(f);
        break;
      default:
        break;
    }
    this.refreshToolbar();
  }

  /** Applies list to selection: toggles if list with the same type is applied already */
  protected applyList(value: WUP.TextRich.FormatValues["list"], prev: string | undefined): void {
    if (value === "ordered") {
      this.execList("insertOrderedList");
      return;
    }
    // bullet & check are <ul>: switching between them only marks the list
    (!prev || prev === "ordered" || prev === value) && this.execList("insertUnorderedList");
    prev !== value && this.markChecklist(value === "check");
  }

  /** Calls command of list & restores caret (Chrome moves it to the start of line) */
  protected execList(cmd: string): void {
    const inp = this.$refInput;
    const sel = window.getSelection()!;
    let pos = 0; // count of chars before caret in the line
    if (sel.isCollapsed && sel.anchorNode) {
      const r = document.createRange();
      r.setStart(lineOf(sel.anchorNode, inp), 0);
      r.setEnd(sel.anchorNode, sel.anchorOffset);
      pos = r.toString().length;
    }
    exec(cmd);
    if (pos && sel.anchorNode) {
      const w = document.createTreeWalker(lineOf(sel.anchorNode, inp), NodeFilter.SHOW_TEXT);
      for (let t = w.nextNode() as Text | null; t; t = w.nextNode() as Text | null) {
        if (pos <= t.length) {
          sel.collapse(t, pos);
          break;
        }
        pos -= t.length;
      }
    }
  }

  /** Marks/unmarks list at selection as checklist */
  protected markChecklist(isOn: boolean): void {
    const n = window.getSelection()?.anchorNode;
    const ul = (n?.nodeType === Node.ELEMENT_NODE ? (n as Element) : n?.parentElement)?.closest("ul");
    if (ul && this.$refInput.contains(ul)) {
      this.setAttr.call(ul, "data-checklist", isOn, true);
      this.fireInput();
    }
  }

  /** Removes link or adds new one (asked via prompt) */
  protected applyLink(isOn: boolean): void {
    const sel = window.getSelection()!;
    if (isOn) {
      const a = (sel.anchorNode as Node).parentElement?.closest("a");
      if (a && sel.isCollapsed) {
        sel.selectAllChildren(a); // otherwise unlink does nothing
      }
      exec("unlink");
      return;
    }
    const r = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    const url = window.prompt(this.#ctr.$textLink, "https://")?.trim(); // eslint-disable-line no-alert
    this.restoreAfterPrompt(r);
    const href = url && sanitizeUrl(url);
    if (!href) {
      return;
    }
    if (sel.isCollapsed) {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = url;
      exec("insertHTML", a.outerHTML);
    } else {
      exec("createLink", href);
    }
  }

  /** Inserts formula (asked via prompt) */
  protected applyFormula(): void {
    const sel = window.getSelection()!;
    const r = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    const tex = window.prompt(this.#ctr.$textFormula)?.trim(); // eslint-disable-line no-alert
    this.restoreAfterPrompt(r);
    if (!tex) {
      return;
    }
    const f = document.createElement("span");
    f.setAttribute("data-formula", tex);
    f.textContent = tex;
    exec("insertHTML", f.outerHTML);
    this.$refInput.querySelectorAll<HTMLElement>("[data-formula]:not([contenteditable])").forEach(renderFormula);
    this.fireInput();
  }

  /** Called after window.prompt: returns focus & selection back */
  protected restoreAfterPrompt(r: Range | null): void {
    this.$refInput.focus({ preventScroll: true });
    if (r) {
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }

  /** Removes formatting: inline formats only if selection is collapsed (the same as quill) */
  protected applyClean(f: Map<string, unknown>): void {
    exec("removeFormat");
    if (window.getSelection()!.isCollapsed) {
      return;
    }
    exec("unlink");
    (f.has("header") || f.has("blockquote") || f.has("code-block")) && exec("formatBlock", "div");
    const list = f.get("list");
    list && exec(list === "ordered" ? "insertOrderedList" : "insertUnorderedList"); // toggles list off
    f.has("align") && exec("justifyLeft", undefined, true);
  }

  /** Called after manual changes of editor (not via execCommand) to update $value */
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

  /** Called on click inside editor: toggles item of checklist */
  protected gotEditorClick(e: MouseEvent): void {
    const li = (e.target as HTMLElement).closest?.("li");
    if (!li || !li.parentElement!.hasAttribute("data-checklist") || this.$isDisabled || this.$isReadOnly) {
      return;
    }
    const isIcon = e.clientX < li.getBoundingClientRect().left + parseFloat(getComputedStyle(li).paddingLeft);
    if (isIcon) {
      li.toggleAttribute("data-checked");
      this.fireInput();
    }
  }

  protected override gotFocus(ev: FocusEvent): Array<() => void> {
    const arr = super.gotFocus(ev);
    const onSelect = (): void => {
      const sel = window.getSelection();
      if (sel?.rangeCount && this.$refInput.contains(sel.getRangeAt(0).startContainer)) {
        this.#range = sel.getRangeAt(0).cloneRange();
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
      !allowedFormatInputs.has(t) && e.preventDefault(); // color, font etc. aren't supported
    } else if (t === "insertFromPaste" || t === "insertFromPasteAsQuotation" || t === "insertFromDrop") {
      const html = e.dataTransfer?.getData("text/html");
      if (html) {
        // insert sanitized html (otherwise browser inserts any content: images, colors etc.)
        e.preventDefault();
        const [tr] = e.getTargetRanges();
        this.$refInput.focus({ preventScroll: true });
        if (tr) {
          const r = document.createRange();
          r.setStart(tr.startContainer, tr.startOffset);
          r.setEnd(tr.endContainer, tr.endOffset);
          const sel = window.getSelection()!;
          sel.removeAllRanges();
          sel.addRange(r);
        }
        const div = document.createElement("div");
        div.appendChild(htmlToEditor(html));
        exec("insertHTML", div.innerHTML);
      }
    }
  }

  /** Native undo/redo of browser is used (custom history works only with plain text) */
  protected override canHandleUndo(): boolean {
    return false;
  }

  protected override setInputValue(v: string, reason: SetValueReasons): void {
    if (v && v === this.$refInput.value) {
      return; // skip re-rendering: it resets selection, scroll & browser history
    }
    super.setInputValue(v, reason);
  }
}

customElements.define(tagName, WUPTextRichControl);
