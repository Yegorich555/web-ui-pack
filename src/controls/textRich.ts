import { inheritDefaults } from "../baseElement";
import onEvent from "../helpers/onEvent";
import { stringPrettify } from "../helpers/string";
import WUPPopupElement from "../popup/popupElement";
import { useTooltipOnce } from "../popup/popupTooltip";
import { SetValueReasons } from "./baseControl";
import WUPTextControl from "./text";
import TextHistory from "./text.history";
import WUPTextAreaControl from "./textArea";
import { charsBefore } from "./textArea.input";
import WUPTextRichInput, {
  addClass,
  createOf,
  embedOf,
  htmlToEditor,
  htmlToText,
  isBlockTag,
  listTags,
  sanitizeUrl,
  sizeFormats,
  sizes,
  textAligns,
} from "./textRich.input";
import TextRichHistory from "./textRich.history";
import TextRichMenu, { TextRichAsk, TextRichPrompt } from "./textRich.select";
import {
  addInline,
  formatParents,
  fromLinePos,
  getLines,
  lineOf,
  linesOf,
  removeInline,
  setLineTag,
  splitAt,
  splitRange,
  toLinePos,
  wrapLines,
} from "./textRich.format";

WUPTextRichInput.$use();

const tagName = "wup-textrich";
declare global {
  namespace WUP.TextRich {
    /** Tools of toolbar: key is name of tool (used in $options.toolbar & static $tools), value is type of its value
     *  (`true` - tool without values: button that toggles format or runs action); extend it to add custom tool
     * @example
     * declare global {
     *   namespace WUP.TextRich {
     *     interface ToolValues {
     *       upper: true; // button
     *       color: "red" | "green" | false; // tool with values
     *     }
     *   }
     * }
     * WUPTextRichControl.$tools.upper = { label: "Uppercase", format: ({ texts }) => ... };
     * el.$options.toolbar = [["bold", "upper"], ["color"]]; */
    interface ToolValues extends BuiltInToolValues {}
    /** Built-in tools: they're always defined in static $tools (custom ones are optional) */
    interface BuiltInToolValues {
      bold: true;
      italic: true;
      underline: true;
      strike: true;
      blockquote: true;
      code: true;
      /** Url of link: it's asked via popup */
      link: string;
      /** Removes formatting of selected text */
      clean: true;
      /** Button clear of other controls ($refBtnClear): it's rendered if `$options.clearButton` is true
       *  and works according to `$options.clearActions` (the same as Esc) */
      btnClear: true;
      /** Heading level; `false` - normal paragraph */
      header: 1 | 2 | 3 | 4 | 5 | 6 | false;
      /** Numbered or bulleted list (button per value: `{ list: "ordered" }`) */
      list: "ordered" | "bullet";
      /** Subscript or superscript (button per value: `{ script: "sub" }`) */
      script: "sub" | "super";
      /** Decrease (`-1`) or increase (`+1`) indentation (button per value: `{ indent: -1 }`) */
      indent: -1 | 1;
      /** Font size: `"sm"` - small, `"lg"` - large, `"hg"` - huge; `false` - default */
      size: "sm" | "lg" | "hg" | false;
      /** Text alignment; `false` - default (left) */
      align: "center" | "right" | "justify" | false;
    }
    /** Value of tool: item of dropdown or button (toolbar item with single value: `{ list: "ordered" }`) */
    interface ToolValue<V = any> {
      /** Value applied by tool (ex. `1` for `header`) */
      value: V;
      /** `aria-label` & tooltip of button or text of dropdown item; @defaultValue prettified value (`sans-serif` => `Sans Serif`) */
      label?: string;
      /** Keyboard shortcut to apply value (see Tool.hotKey) */
      hotKey?: string;
      /** Class of related tool bar button */
      className?: string;
      /** Class of element created via `create` for related tool */
      classNameTag?: string;
    }
    /** Tool of toolbar
     * @tutorial Rules
     * * tool without values is rendered as button: it's pressed when format is applied (see `is`), otherwise it's action
     * * tool with values is rendered as dropdown; toolbar item with single value (`{ list: "ordered" }`) - as button of the value
     * * format is applied via `format` or default one according to `kind`: item of dropdown sets value (`false` removes format),
     * button toggles format (it's removed if selection has it already) */
    interface Tool<V = any> {
      /** `aria-label` & tooltip of button or `aria-label` of dropdown; @defaultValue name of tool */
      label?: string;
      /** Keyboard shortcut in format of `aria-keyshortcuts`: `Control+Shift+X`
       *  (several shortcuts are separated by space: `Control+Shift+X Alt+Shift+5`)
       * @tutorial Rules
       * * `Control` is Cmd on macOS/iOS (shown as `⌘`)
       * * shortcut must contain `Control` or `Alt`; key is compared by physical key (`KeyboardEvent.code`), so it works with any keyboard layout
       * * shortcut works only if tool is rendered in toolbar (see $options.toolbar)
       * * tool with values: the 1st shortcut selects the previous value (in order of `values`), the 2nd one - the next value
       * (`size`: increases & decreases font size)
       * * `btnClear`: Escape clears value according to $options.clearActions (the same as in other controls) */
      hotKey?: string;
      /** Class of toolbar button or dropdown (`<button role="combobox">`) of tool (several classes are separated by space):
       *  to style it or point icon of button via css-var `--icon-img` (`.my-icon-upper { --icon-img: url("data:image/svg+xml,...") }`);
       *  otherwise point it via attribute `tool`: `wup-textrich [tool="upper"] { --icon-img: url(...) }` */
      className?: string;
      /** Class of element created via `create` (in editor, $value & preview of dropdown item): to style format via css
       *  (`is` can detect format by it) */
      classNameTag?: string;
      /** Values of dropdown in default order (toolbar item `"header"` is the same as `{ header: [1, 2, 3, 4, 5, 6, false] }`);
       *  value `false` means format isn't applied: it removes format & it's selected if selection doesn't have format (`Normal` of `header`);
       *  tool without `ask` asks value via its dropdown of toolbar opened near editor: on typing `trigger`,
       *  on click/hover on `embed` & via $format without value */
      values?: ToolValue<V>[];
      /** Text typed to show dropdown of tool near it (`{` for placeholders, `@` for mentions, `/` for commands): items are filtered
       *  by text typed after it (label or value contains it); chosen value replaces typed text via format of tool;
       *  Arrows to navigate, Enter/Tab or click to choose, Escape, whitespace or moving caret out to close
       * @tutorial Rules
       * * it works if tool is rendered in toolbar as dropdown (see $options.toolbar): menu shows its items
       * * typed char with selection wraps it if char is pointed in static $wrapChars (`{` gives `{text}`)
       * @example
       * WUPTextRichControl.$tools.placeholder = {
       *   values: [{ value: "firstName" }, { value: "email" }], // label is prettified value: `First Name`
       *   trigger: "{", // typed `{fi` shows `First Name`
       *   kind: "embed",
       *   ...
       * }; */
      trigger?: string;
      /** Kind of format: defines default `format`, detection via `is`, sanitizing & behavior of collapsed selection
       * * `inline` - element wraps text (`<b>`, `<a>`, `<span style>`): with collapsed selection format is applied to the next typed text
       * (if tool doesn't have `ask`); it's removed by `clean`
       * * `line` - block element of line (`<h1>`, `<blockquote>`): it replaces selected lines (`false` - paragraph)
       * * `lineStyle` - style of line (`text-align` etc.): it's set to selected lines via `set`
       * * `embed` - element without text (`<img>`, `<hr>`): it replaces selection & caret is placed after it;
       * it's counted as 1 char in positions of selection (undo/redo etc.)
       * * without kind: action - `format` is required
       * @tutorial Sanitizing
       * html of value (pasted one etc.) keeps only formats of tools with kind: element is replaced with new one
       * via `create` (`set` for `lineStyle`) if `is` returns value (`false` means format isn't applied);
       * other elements are unwrapped or removed with content (`<script>` etc.) */
      kind?: "inline" | "line" | "lineStyle" | "embed";
      /** Returns value of format applied via element (`undefined` if element doesn't apply it): toolbar shows state of
       *  the nearest element at the start of selection (button is pressed, item of dropdown is selected);
       *  for `line` & `lineStyle` it's called for line only (paragraph, heading, item of list etc.)
       *  WARN: sanitizer calls it for untrusted html (pasted etc.): return only safe values (see `sanitizeUrl` for urls) */
      is?: (el: HTMLElement) => V | undefined;
      /** Returns new element applying format with value: used by default format & sanitizer (`inline`, `line`, `embed`);
       *  item of dropdown shows label inside it (ex. heading as preview);
       *  tag name is the same as `() => document.createElement(tag)`
       * @example
       * create: "mark",
       * create: (v) => document.createElement(v === "sub" ? "sub" : "sup"), */
      create?: keyof HTMLElementTagNameMap | ((value: V) => HTMLElement);
      /** Sets value of format to line (`undefined` removes it): used by default format & sanitizer of `lineStyle`;
       *  WARN: line replaced via format `line` (heading etc.) keeps only `style`, so use style properties instead of attributes */
      set?: (el: HTMLElement, value: V | undefined) => void;
      /** Asks value via own UI (popup, modal etc.) when tool is applied without value (button or keyboard shortcut of tool without values)
       *  or on click on `embed` element (image etc.: asked value replaces it): format is applied with resolved value (`null` or `undefined` cancels it);
       *  selection is restored even if focus is moved out of control (to modal etc.); tool with `values` asks it via own dropdown by default
       * @param target element to place popup near it: clicked embed, button of tool or editor (if tool isn't rendered)
       * @param current value of format applied at the start of selection
       * @see {@link WUPTextRichControl.$ask} - popup with text control */
      ask?: (target: HTMLElement, control: WUPTextRichControl, current: V | undefined) => Promise<V | null | undefined>;
      /** Applies format to selection instead of default one (see `kind`): control saves changes in history,
       *  restores selection (use `control.$insert` to insert content & place caret after it), updates $value & toolbar
       * @example
       * format: ({ texts }) => texts.forEach((t) => (t.data = t.data.toUpperCase())), // uppercase of selected text
       * format: ({ control }) => control.$insert(document.createTextNode(new Date().toLocaleDateString())), // insert date
       * format: (ctx) => { ctx.applyDefault(); myStatistics.push(ctx.value); }, // extends default format */
      format?: (ctx: FormatContext<V>) => void;
    }
    /** Selection & helpers for `format` of tool
     * @see {@link Tool.format} */
    interface FormatContext<V = any> {
      /** Selected range: it's live, so changes of editor can move it */
      range: Range;
      /** Value of format: `true` for tool without values, `false` removes format */
      value: V;
      /** Value must be set (item of dropdown, value asked via `ask`), otherwise format is toggled (button) */
      isSet: boolean;
      /** Selected lines: paragraphs, headings, items of lists etc. (taken before format) */
      readonly lines: HTMLElement[];
      /** Selected text nodes: nodes at the edges of selection are split by it;
       *  WARN: it's computed on the 1st access, so read it before changes of editor (destructure it in arguments) */
      readonly texts: Text[];
      /** Element with `contenteditable` */
      editor: HTMLElement;
      /** Tool which format is applied */
      tool: Tool<V>;
      /** Control which editor is formatted */
      control: WUPTextRichControl;
      /** Applies default format of tool according to its `kind`: use it to extend default behavior */
      applyDefault: () => void;
    }
    /** Tools of toolbar
     * @see {@link Tool} */
    type Tools = { [K in keyof BuiltInToolValues]: Tool<ToolValues[K]> } & {
      [K in keyof ToolValues]?: Tool<ToolValues[K]>;
    } & {
      /** Button clear: `labelBack` is label when the next clearing restores previous value (see $options.clearActions) */
      btnClear: { labelBack: string };
    };
    /** Toolbar item: button `"bold"`, dropdown with every value `"header"` (the same as `{ header: [1, 2, 3, 4, 5, 6, false] }`),
     *  dropdown with pointed values `{ header: [1, 2, false] }` or button of pointed value `{ list: "ordered" }` */
    type ToolbarItem =
      | keyof ToolValues
      | {
          [K in keyof ToolValues]: ToolValues[K] extends true ? never : { [P in K]: ToolValues[P] | ToolValues[P][] };
        }[keyof ToolValues];
    /** Group of toolbar items (groups are visually separated) */
    type ToolbarGroup = ToolbarItem[];

    interface EventMap extends WUP.TextArea.EventMap {}
    interface ValidityMap extends WUP.TextArea.ValidityMap {}
    interface NewOptions {
      /** Toolbar items split into groups; point empty array to hide toolbar; to add custom tool define it in static $tools
       * @see {@link ToolbarItem}
       * @example
       * [
       *   ["bold", "italic", "underline"], // buttons
       *   ["header"], // dropdown with every value
       *   [{ size: ["sm", false, "lg"] }], // dropdown with pointed values only
       *   [{ list: "ordered" }, { list: "bullet" }], // button per value
       *   ["clean"], // removes formatting
       *   ["btnClear"], // clears value: button clear (if $options.clearButton is true)
       * ]
       * @defaultValue every built-in tool */
      toolbar: ToolbarGroup[];
      /** Hide keyboard shortcuts in tooltips of toolbar buttons (`Bold (Ctrl+B)` => `Bold`) & in items of dropdowns;
       *  `aria-keyshortcuts` is set anyway
       * @see {@link WUP.TextRich.Tool.hotKey}
       * @defaultValue false */
      hideHotKeysHint: boolean;
      /** Hide footer with count of visible chars: `{count} / {max}` (see $renderFooter to customize content)
       * @see {@link WUPTextRichControl.$renderFooter}
       * @defaultValue false */
      hideFooter: boolean;
    }
    interface Options<T = string, VM = ValidityMap> extends WUP.TextArea.Options<T, VM>, NewOptions {}
    interface JSXProps<C = WUPTextRichControl> extends WUP.TextArea.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      /** Global reference to object with array
       * @see {@link ToolbarGroup}
       * @example
       * ```js
       * window.myToolbar = [["bold", "italic"], ["clean", "btnClear"]];
       * <wup-textrich w-toolbar="window.myToolbar"></wup-textrich>
       * ``` */
      "w-toolbar"?: string;
      "w-hideHotKeysHint"?: boolean | "" | "true" | "false";
      "w-hideFooter"?: boolean | "" | "true" | "false";
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

/** Toolbar button that applies format on click: `_value` - value of format (ex. `"ordered"` for list),
 *  `_values` - values of dropdown (button opens menu of them: see askMenu) */
type ToolElement = HTMLElement & { _format: string; _value?: unknown; _values?: WUP.TextRich.ToolValue[] };

/** Command key is Cmd instead of Ctrl (iPadOS reports Macintosh, iOS - like Mac OS X) */
const isMac = navigator.userAgent.includes("Mac");
/** Keys of shortcuts by `KeyboardEvent.code` (physical key): letters & digits are taken from code (`KeyB` => `B`) */
const codeKeys = {
  Period: ".",
  Comma: ",",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
};
/** Codes of keys formatting via browser (Ctrl/Cmd + B, I, U): prevented so only shortcuts of $tools work */
const browserHotKeys = new Set<string>(["KeyB", "KeyI", "KeyU"]);
/** Positions of selection (anchor & focus): [line index, count of chars before position in the line] */
type SelectionPos = [[number, number], [number, number]];

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

/** Returns true if value of format applied via element matches value of tool (`true` - any value: tool without values) */
const isMatch = (v: unknown, value: unknown): boolean => v !== undefined && (value === true || v === value);

/** Returns function that checks if element applies format of tool: `is` of tool returns pointed value (any value if it's `true`) */
function isOf(t: WUP.TextRich.Tool, value: unknown = true): (el: Element) => boolean {
  return (el) => isMatch(t.is!(el as HTMLElement), value);
}

/** Returns label of tool value: pointed one or prettified value (`sans-serif` => `Sans Serif`) */
const labelOf = (v: WUP.TextRich.ToolValue): string =>
  v.label ?? __wupln(stringPrettify(String(v.value), true, true), "content");

/** Selects node: format of embed replaces it */
function selectNode(n: Node): void {
  const r = document.createRange();
  r.selectNode(n);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(r);
}

/** Form-control with rich text editor (WYSIWYG): text is formatted via toolbar; behavior & styles are similar to npm quill
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/control/textRich}
 * @example
  const el = document.createElement("wup-textrich");
  el.$options.name = "description";
  el.$options.toolbar = [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean", "btnClear"],
  ];
  el.$options.validations = { required: true, max: 1000 };
  el.$initValue = "Some <strong>bold</strong> text";

  const form = document.body.appendChild(document.createElement("wup-form"));
  form.appendChild(el);
  // or HTML
  <wup-form>
    <wup-textrich w-name="description" w-toolbar="window.myToolbar" w-validations="myValidations"/>
  </wup-form>;
 * @tutorial Rules
 * * $value is html (`undefined` if there is no text & embeds); it's sanitized: only formats of $tools are kept
 * (`<strong>`, `<em>`, `<u>`, `<s>`, `<sub>`, `<sup>`, `<a>`, `<h1>...<h6>`, `<blockquote>`, `<pre>` etc.)
 * with paragraphs `<p>`, lists `<ol>`, `<ul>` & indentation;
 * `<p>` is used only if it's required: single paragraph without styles is returned without it (`text` instead of `<p>text</p>`)
 * * formatting is saved in custom history: undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y, OS-native) works for text & formats
 * * tools of toolbar are defined in static $tools: change it to redefine labels, keyboard shortcuts etc. or add custom tool
 * * keyboard shortcuts (see static $tools) are similar to Google Docs: Ctrl+B, Ctrl+Shift+7, Ctrl+Alt+1 etc. (Cmd on macOS/iOS);
 * they're shown in tooltips of toolbar buttons & in items of dropdowns (align & header: in tooltips) (see $options.hideHotKeysHint);
 * Alt+F10 to focus toolbar (Arrows to navigate, Esc to return);
 * with collapsed selection inline format (bold etc.) is applied to the next typed text
 * * selected text is wrapped into typed quote or bracket like in code editors: `"text"`, `(text)` etc. (see static $wrapChars)
 * * typed `trigger` of tool shows its dropdown near caret: `{` for placeholders, `@` for mentions etc. (see static $tools)
 * * styles of content are global: use `<div wup-textrich>{$value}</div>` to show value outside control in the same way
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <wup-richinput contenteditable="true" role="textbox" aria-multiline="true" wup-textrich />
 *      <strong>{$options.label}</strong>
 *   </span>
 * </label>
 * <div role="toolbar"> // placed at the top via css (order: -1)
 *   <div role="group">
 *     <button tool="bold" aria-pressed="false"></button>
 *     <button tool="header" role="combobox" aria-label="Heading" aria-expanded="false">Normal</button> // dropdown
 *   </div>
 *   <div role="group"><button tool="btnClear" clear></button></div> // $refBtnClear: placed in toolbar instead of label
 * </div>
 * <footer role="note" aria-label="Characters: {count} of {max}" w-tooltip>{count} / {max}</footer> // $refFooter: see $renderFooter & $options.hideFooter
 * <wup-popup><wup-text/></wup-popup> // to enter value via $ask: url on click on toolbar button `link` or on hover on link
 * <wup-popup menu><ul role="listbox"><li role="option"><h1 role="none">Heading 1</h1></li>...</ul></wup-popup> // menu of dropdown: see askMenu */
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
  /** Label of text control in popup to enter link; @defaultValue `Enter link` */
  static $textLink = __wupln("Enter link", "content");
  /** Validation error of entered link; @defaultValue `Invalid link` */
  static $errorLink = __wupln("Invalid link", "validation");
  /** Label of toolbar (`aria-label`); @defaultValue `Formatting` */
  static $ariaToolbar = __wupln("Formatting", "aria");
  /** Keyboard shortcut to focus toolbar (Arrows to navigate, Esc to return) in format of `aria-keyshortcuts`;
   * @see {@link WUP.TextRich.Tool.hotKey}
   * @defaultValue `Alt+F10` */
  static $hotKeyToolbar = "Alt+F10";
  /** Pairs of chars that wrap selected text on typing like in code editors: opening char => closing one
   *  (typed `(` with selected `text` gives `(text)` & selection is kept on `text`);
   *  delete pair (or clear map) to replace selected text with typed char as usual
   * @defaultValue quotes (double, single & backtick) & brackets (round, square, curly & angle) */
  static $wrapChars = new Map([
    ['"', '"'],
    ["'", "'"],
    ["`", "`"],
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
    ["<", ">"],
  ]);

  /** Tools of toolbar: key is name of tool used in $options.toolbar; change it to redefine labels, keyboard shortcuts etc.
   *  or add custom tool (changes are applied on the next rendering of toolbar)
   * @see {@link WUP.TextRich.Tool}
   * @example
   * WUPTextRichControl.$tools.strike.label = "Crossed out";
   * WUPTextRichControl.$tools.strike.hotKey = "Control+Shift+S";
   * delete WUPTextRichControl.$tools.header.values![5].hotKey; // disable shortcut of `Heading 6`
   * // custom tools: extend WUP.TextRich.ToolValues with `highlight: true; upper: true;` for TS
   * WUPTextRichControl.$tools.highlight = {
   *   label: "Highlight",
   *   className: "my-icon-highlight", // css: `.my-icon-highlight { --icon-img: url("data:image/svg+xml,...") }`
   *   kind: "inline", // default format toggles it
   *   is: (el) => el.classList.contains("my-highlight") || undefined,
   *   create: "span",
   *   classNameTag: "my-highlight", // css: `.my-highlight { background: yellow }`
   * };
   * WUPTextRichControl.$tools.upper = {
   *   label: "Uppercase",
   *   className: "my-icon-upper",
   *   format: ({ texts }) => texts.forEach((t) => (t.data = t.data.toUpperCase())),
   * };
   * el.$options.toolbar = [["bold", "highlight", "upper"]];
   * @defaultValue keyboard shortcuts are similar to Google Docs, Gmail & Slack */
  static $tools: WUP.TextRich.Tools = {
    header: {
      label: __wupln("Heading", "aria"),
      values: [
        { value: 1, label: __wupln("Heading 1", "content"), hotKey: "Control+Alt+1" },
        { value: 2, label: __wupln("Heading 2", "content"), hotKey: "Control+Alt+2" },
        { value: 3, label: __wupln("Heading 3", "content"), hotKey: "Control+Alt+3" },
        { value: 4, label: __wupln("Heading 4", "content"), hotKey: "Control+Alt+4" },
        { value: 5, label: __wupln("Heading 5", "content"), hotKey: "Control+Alt+5" },
        { value: 6, label: __wupln("Heading 6", "content"), hotKey: "Control+Alt+6" },
        { value: false, label: __wupln("Normal", "content"), hotKey: "Control+Alt+0" },
      ],
      kind: "line",
      is: (el) => (/^H[1-6]$/.test(el.tagName) ? (+el.tagName[1] as WUP.TextRich.ToolValues["header"]) : undefined),
      create: (v) => document.createElement(v ? `h${v}` : "div"),
    },
    bold: {
      label: __wupln("Bold", "aria"),
      hotKey: "Control+B",
      kind: "inline",
      is: ({ tagName: t }) => t === "B" || t === "STRONG" || undefined,
      create: "b", // <strong> is styled as label of the control
    },
    italic: {
      label: __wupln("Italic", "aria"),
      hotKey: "Control+I",
      kind: "inline",
      is: ({ tagName: t }) => t === "I" || t === "EM" || undefined,
      create: "em",
    },
    underline: {
      label: __wupln("Underline", "aria"),
      hotKey: "Control+U",
      kind: "inline",
      is: (el) => el.tagName === "U" || undefined,
      create: "u",
    },
    strike: {
      label: __wupln("Strikethrough", "aria"),
      hotKey: "Control+Shift+X", // possible "Control+Shift+X Alt+Shift+5", // Alt+Shift+5 - the same as in Google Docs
      kind: "inline",
      is: ({ tagName: t }) => t === "S" || t === "STRIKE" || t === "DEL" || undefined, // undefined: element doesn't apply format (false is a value)
      create: "s",
    },
    blockquote: {
      label: __wupln("Quote", "aria"),
      hotKey: "Control+Shift+9",
      kind: "line",
      is: (el) => el.tagName === "BLOCKQUOTE" || undefined,
      create: "blockquote",
    },
    code: {
      label: __wupln("Code block", "aria"),
      hotKey: "Control+Alt+Shift+C",
      kind: "line",
      is: (el) => el.tagName === "PRE" || undefined,
      create: "pre",
    },
    link: {
      label: __wupln("Link", "aria"),
      hotKey: "Control+K",
      kind: "inline",
      // link with unsafe url (`javascript:` etc.) is removed by sanitizer
      is: (el) => (el.tagName === "A" && sanitizeUrl(el.getAttribute("href") || "")) || undefined,
      create: (url) => {
        const a = document.createElement("a");
        a.setAttribute("href", url);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        return a;
      },
      // link is removed if selection starts inside it, otherwise url is asked via popup
      ask: (target, c, cur) => (cur === undefined ? c.askLink(target, "https://") : Promise.resolve("")),
      format: ({ range, value: url, editor, tool, control, applyDefault }) => {
        if (!range.collapsed) {
          applyDefault(); // url is set to selected text: empty one removes link
        } else if (url) {
          const a = createOf(tool, url); // link with url as text
          a.textContent = url;
          control.$insert(a);
        } else {
          const a = formatParents(range.startContainer, isOf(tool), editor)[0]; // whole link is removed
          a?.replaceWith(...a.childNodes);
        }
      },
    },
    list: {
      values: [
        { value: "ordered", label: __wupln("Numbered list", "aria"), hotKey: "Control+Shift+7" },
        { value: "bullet", label: __wupln("Bulleted list", "aria"), hotKey: "Control+Shift+8" },
      ],
      kind: "line",
      is: (el) => {
        const t = el.tagName === "LI" && el.parentElement?.tagName; // item of list: type of its list
        return (t === "OL" && "ordered") || (t === "UL" && "bullet") || undefined;
      },
      format: ({ lines, value, editor }) => {
        const tag = value === "ordered" ? "OL" : "UL";
        const isOn = lines.every((l) => l.parentElement!.tagName === tag);
        lines.forEach((l) => {
          if (isOn) {
            setLineTag(l, "DIV");
          } else if (l.parentElement!.tagName !== tag) {
            const li = setLineTag(l, "LI"); // item of another list is moved out of it at first
            const list = document.createElement(tag);
            li.replaceWith(list);
            list.appendChild(li);
          }
        });
        // merge neighbor lists of the same type: `<ol><li>a</li></ol><ol><li>b</li></ol>` => `<ol><li>a</li><li>b</li></ol>`
        editor.querySelectorAll(":scope > ol + ol, :scope > ul + ul").forEach((el) => {
          el.previousElementSibling!.append(...el.childNodes);
          el.remove();
        });
      },
    },
    script: {
      values: [
        { value: "sub", label: __wupln("Subscript", "aria"), hotKey: "Control+," },
        { value: "super", label: __wupln("Superscript", "aria"), hotKey: "Control+." },
      ],
      kind: "inline",
      is: ({ tagName: t }) => (t === "SUB" && "sub") || (t === "SUP" && "super") || undefined,
      create: (v) => document.createElement(v === "sub" ? "sub" : "sup"),
    },
    indent: {
      values: [
        { value: -1, label: __wupln("Decrease indent", "aria"), hotKey: "Control+[" },
        { value: 1, label: __wupln("Increase indent", "aria"), hotKey: "Control+]" },
      ],
      format: ({ lines, value }) =>
        lines.forEach((l) => {
          // 3em per level (the same as quill)
          const m = /^(\d+(\.\d+)?)em$/.exec(l.style.marginLeft);
          const level = Math.min(8, Math.max(0, Math.round((m ? +m[1] : 0) / 3) + value));
          l.style.marginLeft = level ? `${level * 3}em` : "";
        }),
    },
    size: {
      label: __wupln("Font size", "aria"),
      hotKey: "Control+Shift+. Control+Shift+,", // increase & decrease
      values: [
        { value: "hg", label: __wupln("Huge", "content") },
        { value: "lg", label: __wupln("Large", "content") },
        { value: false, label: __wupln("Default", "content") },
        { value: "sm", label: __wupln("Small", "content") },
      ],
      kind: "inline",
      // any font size is removed via format, unsupported one is shown as default
      is: (el) => {
        const size = el.tagName === "SPAN" && el.style.fontSize;
        return size ? sizeFormats[size as keyof typeof sizeFormats] ?? false : undefined;
      },
      create: (v) => {
        const el = document.createElement("span");
        el.style.fontSize = sizes[v as keyof typeof sizes] ?? "";
        return el;
      },
    },
    align: {
      label: __wupln("Alignment", "aria"),
      // icons are pointed via classes in css
      values: [
        {
          value: "center",
          label: __wupln("Center", "aria"),
          hotKey: "Control+Shift+E",
          className: "wup-icon-align-center",
        },
        {
          value: "right",
          label: __wupln("Right", "aria"),
          hotKey: "Control+Shift+R",
          className: "wup-icon-align-right",
        },
        {
          value: "justify",
          label: __wupln("Justify", "aria"),
          hotKey: "Control+Shift+J",
          className: "wup-icon-align-justify",
        },
        {
          value: false,
          label: __wupln("Left", "aria"),
          hotKey: "Control+Shift+L",
          className: "wup-icon-align-left",
        },
      ],
      kind: "lineStyle",
      is: (el) => {
        const a = el.style.textAlign;
        return textAligns.has(a) ? (a as WUP.TextRich.ToolValues["align"]) : undefined;
      },
      set: (el, v) => (el.style.textAlign = v || ""),
    },
    clean: {
      label: __wupln("Clear formatting", "aria"),
      hotKey: "Control+\\",
      // with collapsed selection inline formats are removed for the next typed text
      format: ({ lines, texts, editor }) => {
        Object.values(WUPTextRichControl.$tools as Record<string, WUP.TextRich.Tool>).forEach(
          (t) => t.kind === "inline" && t.is && removeInline(texts, isOf(t), editor)
        );
        // new paragraph without attributes of formats
        lines.forEach((l) => setLineTag(l, document.createElement("div")).removeAttribute("style"));
      },
    },
    btnClear: {
      label: __wupln("Clear content", "aria"),
      labelBack: __wupln("Restore", "aria"), // the next clearing restores previous value (see $options.clearActions)
      hotKey: "Escape",
    },
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
      ["blockquote", "code"],
      ["link"],
      [{ list: "ordered" }, { list: "bullet" }], // buttons; ["list"] is dropdown
      [{ script: "sub" }, { script: "super" }],
      [{ indent: -1 }, { indent: 1 }],
      ["size"], // equal to [{size: ["hg", "lg", false, "sm"]}]
      // not supported yet => [{ color: true, background: true}],
      ["align"], // equal to [{ align: ["center", "right", "justify", false] }],
      ["clean"],
      ["btnClear"], // button clear (rendered if $options.clearButton is true)
    ],
    hideHotKeysHint: false,
    hideFooter: false,
  });

  static override cloneDefaults<T extends Record<string, any>>(): T {
    const d = super.cloneDefaults() as WUP.TextRich.Options;
    // clone array otherwise changing $options.toolbar[i] mutates $defaults (shared between all elements)
    d.toolbar = d.toolbar.slice();
    return d as unknown as T;
  }

  $refInput = Object.assign(document.createElement("wup-richinput") as WUPTextRichInput, {
    _tools: this.#ctr.$tools, // formats of tools are kept by sanitizer
  }) as unknown as HTMLInputElement;

  /** Toolbar with buttons & dropdowns to format text */
  $refToolbar = document.createElement("div");
  /** Footer with count of chars: it's removed if $options.hideFooter is true (see $renderFooter) */
  $refFooter?: HTMLElement;

  /** Formats shown by toolbar: it's refreshed only when formats are changed */
  #shown?: string;
  /** Last selection inside editor: restored when format is applied via toolbar by keyboard (when focus is on toolbar) */
  #range?: Range;

  protected override renderControl(): void {
    super.renderControl();
    const bar = this.$refToolbar;
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", this.#ctr.$ariaToolbar);
    bar.addEventListener("click", (e) => this.gotToolbarClick(e));
    bar.addEventListener("keydown", (e) => this.gotToolbarKeyDown(e));
    this.appendChild(bar); // placed after editor & moved to the top via css: otherwise form autofocus focuses toolbar

    // hint for screen-readers how to reach toolbar via keyboard
    const inp = this.$refInput;
    const hint = this.$refLabel.appendChild(document.createElement("span"));
    hint.id = this.#ctr.$uniqueId;
    hint.className = this.#ctr.classNameHidden;
    hint.textContent = this.#ctr.$ariaDescription;
    inp.setAttribute("aria-describedby", hint.id);
    inp.setAttribute("wup-textrich", ""); // styles of content are global: the same for value shown outside

    useTooltipOnce("w-tooltip"); // toolbar buttons show aria-label via tooltip
    // hover on link shows popup to edit url, on embed - dropdown of its tool (see askMenu);
    // skipped during selecting by mouse & for touch (it's pressed: buttons = 1)
    onEvent(
      inp,
      "pointerover",
      (e) => !e.buttons && !this.#isHoverOff && this.gotHover(this.hoverOf(e.target as Element))
    );
    onEvent(inp, "pointermove", (e) => {
      if (this.#isHoverOff) {
        this.#isHoverOff = false;
        !e.buttons && this.gotHover(this.hoverOf(e.target as Element));
      }
    });
    // touch leaves element right after tap: popup is closed by tap outside link or when focus leaves control
    onEvent(inp, "pointerleave", (e) => e.pointerType !== "touch" && this.gotHover(null));
    inp.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const a = t.closest("a");
      a && e.preventDefault(); // browser follows any url (`javascript:` etc.) when [contenteditable=false] (readonly)
      const href = a && (e.ctrlKey || e.metaKey) && sanitizeUrl(a.href);
      if (href) {
        // Ctrl/Cmd + Click opens link in new tab: browser doesn't follow links inside contenteditable
        window.open(href, "_blank", "noopener,noreferrer");
      } else if (!this.gotClickEmbed(t)) {
        this.gotHover(a); // tap on link shows popup on touch devices (nothing changes for mouse: it's hovered)
      }
    });
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.TextRich.Options> | null): void {
    super.gotChanges(propsChanged as any); // creates/removes $refBtnClear according to $options.clearButton
    (!propsChanged ||
      propsChanged.includes("toolbar") ||
      propsChanged.includes("hideHotKeysHint") ||
      propsChanged.includes("clearButton")) &&
      this.renderToolbar();
    this.setupFooter(); // max count depends on validations: they can be changed via form too
  }

  /** Creates or removes footer according to $options.hideFooter & renders its content */
  protected setupFooter(): void {
    if (this._opts.hideFooter) {
      this.$refFooter?.remove();
      this.$refFooter = undefined;
    } else {
      if (!this.$refFooter) {
        const f = this.appendChild(document.createElement("footer"));
        f.setAttribute("role", "note"); // otherwise it's landmark `contentinfo` (outside of <section>, <article> etc.) & aria-label isn't allowed
        f.setAttribute("w-tooltip", ""); // empty: tooltip shows aria-label
        this.$refFooter = f;
      }
      this.$renderFooter(this.$refFooter);
    }
  }

  /** Renders content of footer: count of visible chars (the same as validations min/max count)
   *  `{count} / {max}` if `validations.max` is pointed (with attr `invalid` if count exceeds max: red text), otherwise `{count}`;
   *  `aria-label` is shown via tooltip;
   *  it's called on every change of value & options (if footer isn't hidden via $options.hideFooter): override it to customize content
   * @example
   * class MyTextRich extends WUPTextRichControl {
   *   override $renderFooter(footer: HTMLElement): void {
   *     const words = this.$refInput.innerText.split(/\s+/).filter(Boolean).length;
   *     footer.textContent = `${words}`;
   *     footer.setAttribute("aria-label", `Words: ${words}`);
   *   }
   * } */
  $renderFooter(footer: HTMLElement): void {
    const count = htmlToText(this.$refInput.value).length;
    const max = (this.validations as WUP.TextRich.Options["validations"])?.max;
    const isMax = typeof max === "number";
    footer.textContent = isMax ? `${count} / ${max}` : `${count}`;
    this.setAttr.call(footer, "invalid", isMax && count > max, true); // red if count exceeds max
    footer.setAttribute(
      "aria-label",
      isMax ? __wupln(`Characters: ${count} of ${max}`, "aria") : __wupln(`Characters: ${count}`, "aria")
    );
  }

  /** Renders toolbar according to $options.toolbar */
  protected renderToolbar(): void {
    const bar = this.$refToolbar;
    bar.replaceChildren();
    this._opts.toolbar?.forEach((items) => {
      const g = document.createElement("div");
      g.setAttribute("role", "group");
      items.forEach((item) => this.renderTool(g, item));
      g.firstChild && bar.appendChild(g);
    });
    this.#shown = undefined; // new items must be refreshed
    this.refreshToolbar();
  }

  /** Renders toolbar item into group */
  protected renderTool(group: HTMLElement, item: WUP.TextRich.ToolbarItem): void {
    const [name, picked] = (typeof item === "string" ? [item] : Object.entries(item)[0]) as [string, unknown];
    const tool = (this.#ctr.$tools as Record<string, WUP.TextRich.Tool>)[name];
    // values pointed in toolbar are taken from tool: with labels, shortcuts & classes
    const valueOf = (v: unknown): WUP.TextRich.ToolValue => tool.values?.find((t) => t.value === v) ?? { value: v };
    if (!tool) {
      this.throwError(`Toolbar item '${name}' isn't defined in $tools`, undefined, true);
    } else if (name === "btnClear") {
      const b = this.$refBtnClear; // it's created by super if $options.clearButton is true
      if (b) {
        this.setClearLabel(b); // button isn't re-rendered: hint can be changed
        group.appendChild(b);
      }
    } else if (Array.isArray(picked)) {
      this.renderPicker(group, name, tool, picked.map(valueOf));
    } else if (picked !== undefined) {
      this.renderButton(group, name, tool, valueOf(picked));
    } else if (tool.values) {
      this.renderPicker(group, name, tool, tool.values);
    } else {
      this.renderButton(group, name, tool);
    }
  }

  /** Renders button of toolbar: button with value applies it (ex. `list:ordered`), without value - toggles format or runs action */
  protected renderButton(group: HTMLElement, name: string, tool: WUP.TextRich.Tool, v?: WUP.TextRich.ToolValue): void {
    const b = group.appendChild(document.createElement("button")) as HTMLButtonElement & ToolElement;
    b.type = "button";
    b.tabIndex = -1; // toolbar is reachable via Alt+F10
    b.setAttribute("tool", v ? `${name}:${v.value}` : name);
    this.setToolLabel(b, v ? labelOf(v) : tool.label ?? name, v ? v.hotKey : tool.hotKey);
    addClass(b, tool.className, v?.className);
    // tool without `is` doesn't have state: it's action (embed inserts element)
    tool.is && tool.kind !== "embed" && b.setAttribute("aria-pressed", false);
    b._format = name;
    b._value = v?.value;
  }

  /** Sets `aria-label` & tooltip of toolbar button (or icon item of dropdown):
   *  tooltip includes keyboard shortcut `{label} ({hotKey})` if it isn't hidden via $options.hideHotKeysHint */
  protected setToolLabel(b: HTMLElement, label: string, hotKey: string | undefined): void {
    b.setAttribute("aria-label", label);
    const hint = this.setHotKeys(b, hotKey);
    b.setAttribute("w-tooltip", hint && `${label} (${hint})`); // empty: tooltip shows aria-label
  }

  /** Sets label of button clear: it depends on state like its icon - the next clearing restores previous value or clears it */
  protected setClearLabel(b: HTMLElement): void {
    const t = this.#ctr.$tools.btnClear;
    this.setToolLabel(b, (b.getAttribute("clear") ? t.labelBack : t.label) ?? "btnClear", t.hotKey);
  }

  /** Sets `aria-keyshortcuts` of toolbar item (`Control` is `Meta` on macOS/iOS)
   * @returns text of shortcuts: `Ctrl+Shift+X / Alt+Shift+5` or `⇧⌘X` on macOS/iOS (empty if hidden via $options.hideHotKeysHint) */
  protected setHotKeys(el: HTMLElement, hk: string | undefined): string {
    if (!hk) {
      return "";
    }
    el.setAttribute("aria-keyshortcuts", isMac ? hk.replace(/Control/g, "Meta") : hk);
    if (this._opts.hideHotKeysHint) {
      return "";
    }
    return hk
      .replace(/Escape/g, "Esc")
      .split(" ")
      .map((s) => {
        if (!isMac) {
          return s.replace("Control", "Ctrl");
        }
        const keys = s.split("+");
        const k = keys.pop();
        // modifiers in the same order as in macOS menus
        return `${keys.includes("Alt") ? "⌥" : ""}${keys.includes("Shift") ? "⇧" : ""}${
          keys.includes("Control") ? "⌘" : ""
        }${k}`;
      })
      .join(" / ");
  }

  /** Returns button clear: it's placed in toolbar (item `btnClear`) instead of label */
  protected override renderBtnClear(): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.tabIndex = -1;
    b.setAttribute("tool", "btnClear");
    b.setAttribute("clear", ""); // icon & state are the same as in other controls
    b.addEventListener("click", () => {
      this.restoreSelection(); // the same as other tools: focus is returned to editor
      this.clearValue();
    });
    return b;
  }

  /** Renders dropdown of toolbar: button that shows label or icon of the current value & opens menu of values (see askMenu) */
  protected renderPicker(
    group: HTMLElement,
    name: string,
    tool: WUP.TextRich.Tool,
    values: WUP.TextRich.ToolValue[]
  ): void {
    const b = group.appendChild(document.createElement("button")) as HTMLButtonElement & ToolElement;
    b.type = "button";
    b.tabIndex = -1; // toolbar is reachable via Alt+F10
    b.setAttribute("tool", name);
    b.setAttribute("role", "combobox"); // select-only combobox: it gets aria-activedescendant while menu is opened via keyboard
    b.setAttribute("aria-expanded", false);
    addClass(b, tool.className);
    values.some((v) => v.className) && b.setAttribute("icon", ""); // button shows icon of the current value instead of label
    this.setToolLabel(b, tool.label ?? name, tool.hotKey);
    b._format = name;
    b._values = values;
  }

  /** Renders item of dropdown: label inside element of format (preview via `create`)
   *  or icon (if value has `className`: label is shown via tooltip) */
  protected renderItem(li: HTMLElement, tool: WUP.TextRich.Tool, v: WUP.TextRich.ToolValue): void {
    const label = labelOf(v);
    if (v.className) {
      li.setAttribute("icon", "");
      addClass(li, v.className);
      this.setToolLabel(li, label, v.hotKey); // label & shortcut are shown via tooltip like for buttons
      return;
    }
    let preview: HTMLElement | undefined;
    if (tool.create && tool.kind !== "embed") {
      // the same styles as in editor (heading, font size etc.): inner element, otherwise checkmark of selected item is scaled too
      preview = li.appendChild(createOf(tool, v.value));
      preview.setAttribute("role", "none"); // hides semantics: heading etc.
      preview.textContent = label;
    } else {
      li.textContent = label;
    }
    const hint = this.setHotKeys(li, v.hotKey);
    if (preview && isBlockTag(preview.tagName)) {
      hint && li.setAttribute("w-tooltip", `${label} (${hint})`); // blocks (headings) are big, so hint is only in tooltip
    } else if (hint) {
      const kbd = li.appendChild(document.createElement("kbd")); // at the right side of item (like in menus of OS)
      kbd.setAttribute("aria-hidden", true); // announced via aria-keyshortcuts
      kbd.textContent = hint;
    }
  }

  /** Updates state of toolbar items according to formats of selection (skipped if formats aren't changed) */
  protected refreshToolbar(formats = this.getFormats()): void {
    const shown = JSON.stringify([...formats]);
    if (shown === this.#shown) {
      return;
    }
    this.#shown = shown;
    const tools = this.#ctr.$tools as Record<string, WUP.TextRich.Tool>;
    this.$refToolbar.querySelectorAll<ToolElement>("[tool]").forEach((el) => {
      const name = el._format ?? el.getAttribute("tool")!; // dropdown & button clear don't have `_format`
      const tool = tools[name];
      const cur = formats.get(name) ?? false; // `false` - format isn't applied
      if (el.hasAttribute("aria-pressed")) {
        el.setAttribute("aria-pressed", el._value === undefined ? cur !== false : cur === el._value);
      } else if (el._values) {
        // dropdown shows icon (class) or label of the current value (even if it isn't rendered in toolbar: `Heading 3`);
        // label of tool if format isn't applied & tool doesn't have value `false` (`Normal` of header)
        const v = tool.values?.find((x) => x.value === cur);
        if (el.hasAttribute("icon")) {
          el.className = "";
          addClass(el, tool.className, v?.className);
        } else {
          el.textContent = cur === false && !v ? tool.label ?? name : labelOf(v ?? { value: cur });
        }
      }
    });
  }

  /** Returns formats applied to selection including formats for the next typed text:
   *  value of every tool is defined by the nearest element at the start of selection or by its line (see `is` & `kind` of $tools) */
  protected getFormats(): Map<string, unknown> {
    const m = new Map<string, unknown>();
    const inp = this.$refInput;
    const sel = window.getSelection();
    const n = sel?.rangeCount ? firstNode(sel.getRangeAt(0)) : null;
    if (n && inp.contains(n)) {
      const start = (n.nodeType === Node.ELEMENT_NODE ? n : n.parentElement) as HTMLElement;
      const line = lineOf(start, inp);
      Object.entries(this.#ctr.$tools as Record<string, WUP.TextRich.Tool>).forEach(([name, t]) => {
        // line formats are checked only for line, others - for element at the start & its parents
        const isLine = t.kind === "line" || t.kind === "lineStyle";
        for (let el = isLine ? line : start; t.is && el && el !== inp; el = isLine ? null : el.parentElement) {
          const v = t.is(el);
          if (v !== undefined) {
            m.set(name, v);
            break;
          }
        }
      });
      this.#pending.forEach((v, k) => (v === false ? m.delete(k) : m.set(k, v)));
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
      window.getSelection()!.setBaseAndExtent(r.startContainer, r.startOffset, r.endContainer, r.endOffset);
    }
  }

  /** Applies tool of toolbar item: button toggles format, dropdown opens menu of its values near itself */
  protected applyTool(el: ToolElement): void {
    const name = el._format;
    if (el._values && document.activeElement === el) {
      // dropdown focused via keyboard keeps focus: selection is restored on choosing
      this.askMenu(name, el).then((v) => v != null && this.applyFormat(name, v, true));
    } else {
      this.applyFormat(name, el._value, false, el._values && el);
    }
  }

  /** Applies tool of $tools to selection (the same as toolbar, but tool can be not rendered in toolbar):
   *  value is set if it's pointed, otherwise it's asked via `ask` of tool or format is toggled (button)
   * @example
   * el.$format("bold"); // toggles bold
   * el.$format("header", 2); // sets heading 2
   * el.$format("link"); // asks url via popup
   * el.$format("link", "https://example.com"); // wraps selection into link
   * el.$format("header"); // asks value via its dropdown opened near selection (tool with values & without `ask`) */
  $format<K extends keyof WUP.TextRich.ToolValues>(name: K, value?: WUP.TextRich.ToolValues[K]): void {
    this.applyFormat(name, value, value !== undefined);
  }

  /** Applies tool of $tools to selection (see `kind` & `format` of tool); value is asked via `ask` of tool
   * (or via its dropdown if tool has values) if it isn't pointed;
   * inline format with collapsed selection is applied to the next typed text (the same as quill)
   * @param isSet value is chosen (item of dropdown, asked value etc.): it's set, otherwise format is toggled (button)
   * @param target element to place popup near it to ask value: clicked embed or dropdown of toolbar (opens its menu) */
  protected applyFormat(name: string, value?: unknown, isSet?: boolean, target?: HTMLElement): void {
    if (this.$isDisabled || this.$isReadOnly) {
      return;
    }
    this.restoreSelection();
    const inp = this.$refInput;
    const sel = window.getSelection()!;
    if (!sel.rangeCount || !inp.contains(sel.anchorNode)) {
      return;
    }
    const tools = this.#ctr.$tools as Record<string, WUP.TextRich.Tool>;
    const tool = tools[name];
    const f = this.getFormats();
    if (value === undefined && (tool.ask || tool.values)) {
      // selection is restored by positions: focus can be moved out of control (to modal etc.) & nodes can be re-rendered
      const pos = this.getSelectionPos();
      (tool.ask && !(target as ToolElement | undefined)?._values // click on dropdown of toolbar opens its menu
        ? tool.ask(target ?? this.findTool(name) ?? inp, this as WUPTextRichControl, f.get(name))
        : this.askMenu(name, target ?? sel.getRangeAt(0).cloneRange())
      ).then((v) => {
        if (v != null) {
          inp.focus({ preventScroll: true });
          this.setSelectionPos(pos);
          this.applyFormat(name, v, true);
        }
      });
      return;
    }
    const v = value ?? true; // tool without values gets `true`
    if (sel.isCollapsed && ((tool.kind === "inline" && !tool.ask) || name === "clean")) {
      // format for the next typed text (Ctrl+B and type text)
      const p = this.#pending;
      if (name === "clean") {
        Object.entries(tools).forEach(([k, t]) => t.kind === "inline" && !t.ask && f.has(k) && p.set(k, false));
      } else {
        const isOff = !v || (!isSet && isMatch(f.get(name), v)); // button toggles format
        p.set(name, !isOff && v);
      }
      this.#pendingAt = [sel.anchorNode!, sel.anchorOffset];
      this.refreshToolbar();
    } else {
      this.changeContent(() => this.keepSelection((r) => this.formatRange(tool, r, v, !!isSet)));
    }
  }

  /** Applies tool to range via its `format` or default one (see formatByKind) */
  protected formatRange(tool: WUP.TextRich.Tool, range: Range, value: unknown, isSet: boolean): void {
    const editor: HTMLElement = this.$refInput;
    let lines = tool.format && linesOf(range, editor); // custom format gets lines before its changes: they move range
    let texts: Text[] | undefined;
    const ctx: WUP.TextRich.FormatContext = {
      range,
      value,
      isSet,
      get lines() {
        return (lines ??= linesOf(range, editor));
      },
      get texts() {
        return (texts ??= splitRange(range));
      },
      editor,
      tool,
      control: this as WUPTextRichControl,
      applyDefault: () => this.formatByKind(ctx),
    };
    tool.format ? tool.format(ctx) : this.formatByKind(ctx);
  }

  /** Applies default format of tool according to its `kind`: `isSet` - value is set (`false` removes format),
   *  otherwise format is toggled (it's removed if selection has it already) */
  protected formatByKind(ctx: WUP.TextRich.FormatContext): void {
    const { tool, value, isSet, editor } = ctx; // lines & texts are read below: they're computed on access
    switch (tool.kind) {
      case "inline": {
        const { texts } = ctx;
        const any = isOf(tool);
        const f = isOf(tool, value);
        const create = (): HTMLElement => createOf(tool, value);
        if (isSet || !value) {
          removeInline(texts, any, editor);
          value && addInline(texts, f, create, editor);
        } else {
          // only one value is possible: elements with other values are removed (subscript & superscript)
          value !== true && removeInline(texts, (el) => any(el) && !f(el), editor);
          texts.every((t) => formatParents(t, f, editor).length)
            ? removeInline(texts, f, editor)
            : addInline(texts, f, create, editor);
        }
        break;
      }
      case "line":
      case "lineStyle": {
        const { lines } = ctx;
        const isOff = !value || (!isSet && lines.every((l) => isMatch(tool.is?.(l), value)));
        lines.forEach((l) => {
          if (tool.kind === "line") {
            // new paragraph: otherwise attributes of format are kept (class etc.) if line is <div> already
            setLineTag(l, isOff ? document.createElement("div") : createOf(tool, value));
          } else {
            tool.set!(l, isOff ? undefined : value);
          }
        });
        break;
      }
      case "embed":
        this.$insert(createOf(tool, value)); // caret is placed after element
        break;
      default: // action without format
    }
  }

  /** Calls fn that changes editor (not by browser), saves changes to history, updates $value & toolbar */
  protected changeContent(fn: () => void): void {
    const inp = this.$refInput as unknown as WUPTextRichInput;
    const h = this._refHistory;
    const prev = inp.value;
    // selection before changes: otherwise history saves selection after changes (wrong for insertion)
    const isState = h && !h._stateBeforeInput;
    isState && (h._stateBeforeInput = h.inputState);
    fn();
    inp._cached = undefined;
    if (inp.value !== prev) {
      h?.save(prev, inp.value);
      this.fireInput();
    } else if (isState) {
      h._stateBeforeInput = undefined;
    }
    this.refreshToolbar();
  }

  /** Formats for the next typed text (when selection is collapsed): format => value (`false` to remove format) */
  #pending = new Map<string, unknown>();
  /** Position of caret when formats for the next typed text are pointed: they're reset when caret is moved */
  #pendingAt?: [Node, number];

  /** Inserts text with formats pointed for the next typed text */
  protected insertPending(text: string): void {
    const inp = this.$refInput;
    const tools = this.#ctr.$tools as Record<string, WUP.TextRich.Tool>;
    const sel = window.getSelection()!;
    const r = sel.getRangeAt(0);
    r.deleteContents();
    // move caret out of elements of removed/changed formats: `true` means format without value is added
    this.#pending.forEach((v, k) => {
      const el = v !== true && formatParents(r.startContainer, isOf(tools[k]), inp).pop(); // the outer one
      el && splitAt(el, r);
    });
    const t = document.createTextNode(text);
    let node: Node = t;
    this.#pending.forEach((v, k) => {
      if (v !== false && !formatParents(r.startContainer, isOf(tools[k], v), inp).length) {
        const el = createOf(tools[k], v);
        el.appendChild(node);
        node = el;
      }
    });
    r.insertNode(node);
    sel.collapse(t, t.length);
    this.#pending.clear();
  }

  /** Wraps selected content into typed char & its pair (see $wrapChars) & keeps selection on the content:
   *  whitespaces & line breaks at the edges stay outside (double click selects word with trailing space on Windows,
   *  triple click - line with line break)
   * @returns false if char doesn't have pair or selection doesn't have visible content (typed char replaces selection) */
  protected wrapSelection(open: string): boolean {
    const close = this.#ctr.$wrapChars.get(open);
    const sel = window.getSelection()!;
    if (sel.isCollapsed || !close) {
      return false;
    }
    const r = sel.getRangeAt(0);
    const isEmbed = embedOf(this.#ctr.$tools);
    const inner = document.createRange(); // from the 1st visible char (embed) to the last one: collapsed if there are no such
    const w = document.createTreeWalker(r.commonAncestorContainer, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n: Node | null = w.currentNode; n; n = w.nextNode()) {
      if (!r.intersectsNode(n)) {
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
      } else if (isEmbed?.(n as Element)) {
        inner.collapsed && inner.setStartBefore(n);
        inner.setEndAfter(n);
        while (n.lastChild) {
          n = n.lastChild; // content of embed is skipped
        }
        w.currentNode = n;
      }
    }
    if (inner.collapsed) {
      return false;
    }
    this.changeContent(() => {
      /** Inserts text at point (in text node or before child of element): returns offset after text */
      const insert = (n: Node, offset: number, s: string): number => {
        if (n.nodeType === Node.TEXT_NODE) {
          (n as Text).insertData(offset, s);
          return offset + s.length;
        }
        n.insertBefore(document.createTextNode(s), n.childNodes[offset] ?? null);
        return offset + 1;
      };
      // range is live: its end stays before closing char & it's moved by opening char inserted before it
      const { startContainer, startOffset } = inner;
      insert(inner.endContainer, inner.endOffset, close);
      inner.setStart(startContainer, insert(startContainer, startOffset, open));
      sel.removeAllRanges();
      sel.addRange(inner);
    });
    return true;
  }

  /** Selection is placed by $insert: it isn't restored by keepSelection */
  #isInserted = false;

  /** Calls fn that changes editor & restores selection by lines & chars (fn can move or split nodes);
   *  adjacent text nodes are joined (split by formatting: `"a""b"` => `"ab"`) & empty attributes `style` are removed
   *  (left by changing styles: `el.style.textAlign = ""`);
   *  selection isn't restored if content is inserted via $insert (caret is placed after it) */
  protected keepSelection(fn: (r: Range) => void): void {
    const pos = this.getSelectionPos();
    this.#isInserted = false;
    fn(window.getSelection()!.getRangeAt(0));
    const inp = this.$refInput;
    inp.normalize();
    inp.querySelectorAll("[style='']").forEach((el) => el.removeAttribute("style"));
    !this.#isInserted && this.setSelectionPos(pos);
  }

  /** Returns positions of selection in editor by lines & chars (embed is counted as 1 char):
   *  they are valid even if nodes are moved, split or re-rendered; inline content placed directly into editor is wrapped into lines at first */
  protected getSelectionPos(): SelectionPos {
    const inp = this.$refInput;
    const sel = window.getSelection()!;
    // position pointed by root (root, index) is converted into position inside child: otherwise index is wrong after wrapping
    const childPos = (n: Node, offset: number): [Node, number] => {
      const c = n === inp && inp.childNodes[offset];
      return c ? [c, 0] : [n, offset];
    };
    const [an, ao] = childPos(sel.anchorNode!, sel.anchorOffset);
    const [fn1, fo] = childPos(sel.focusNode!, sel.focusOffset);
    // nodes are moved into lines; position pointed by root is converted again: empty root gets the 1st line (caret goes into it)
    wrapLines(inp) && sel.setBaseAndExtent(...childPos(an, ao), ...childPos(fn1, fo));
    const lines = getLines(inp);
    const isEmbed = embedOf(this.#ctr.$tools);
    return [
      toLinePos(lines, sel.anchorNode!, sel.anchorOffset, isEmbed),
      toLinePos(lines, sel.focusNode!, sel.focusOffset, isEmbed),
    ];
  }

  /** Sets selection in editor by positions (see getSelectionPos) */
  protected setSelectionPos([p1, p2]: SelectionPos): void {
    const lines = getLines(this.$refInput);
    if (lines.length) {
      const isEmbed = embedOf(this.#ctr.$tools);
      const [n1, o1] = fromLinePos(lines, p1, isEmbed);
      const [n2, o2] = fromLinePos(lines, p2, isEmbed);
      window.getSelection()!.setBaseAndExtent(n1, o1, n2, o2);
    }
  }

  /** Popup to ask value: text control of $ask or menu of dropdown (see askMenu) */
  #ask?: TextRichAsk;
  #hoverTimer?: ReturnType<typeof setTimeout>;
  /** Hover is skipped until pointer is moved: browser fires pointerover on element under pointer when popup is closed
   *  (embed chosen via menu is new element under pointer) */
  #isHoverOff = false;

  /** Asks value via popup with text control placed near target (it's used by tool `link` to enter url):
   *  Enter submits, Escape or moving focus out cancels (resolves `null`); focus & selection are returned to editor on Enter/Escape
   * @param target element popup is placed near (ex. button of tool)
   * @param value initial value of text control
   * @param opts options of text control: label, validations etc.
   * @param hovered element which value is edited via popup opened by hover (link): text control isn't focused,
   * popup is closed when pointer leaves it, clearing value (Enter with empty value or button clear) resolves `""` to remove link
   * @example
   * WUPTextRichControl.$tools.image = {
   *   ...
   *   ask: (target, c) => c.$ask(target, "https://", { label: "Image url", validations: { required: true } }),
   * }; */
  $ask(
    target: HTMLElement,
    value: string,
    opts?: Partial<WUP.Text.Options>,
    hovered?: HTMLElement
  ): Promise<string | null> {
    return this.openAsk(new TextRichPrompt(target, value, { readOnly: this.$isReadOnly, ...opts }, hovered));
  }

  /** Opens popup to ask value (only one at once): popup opened by hover is closed by hover out (see gotHover)
   * @returns asked value or `null` if canceled */
  protected openAsk<T>(a: TextRichAsk): Promise<T | null> {
    this.#ask?.done();
    return new Promise((resolve) => {
      a.onClose = (v, isBack) => {
        this.#ask = undefined;
        this.#isHoverOff = true;
        clearTimeout(this.#hoverTimer);
        isBack && this.restoreSelection(); // otherwise focus is moved by user
        resolve(v);
      };
      a.popup.onpointerenter = () => this.#ask?.hovered && this.gotHover(this.#ask.hovered);
      a.popup.onpointerleave = (e) => e.pointerType !== "touch" && this.gotHover(null); // touch leaves it after tap
      this.#ask = a;
      a.open(this);
    });
  }

  /** Asks url of link via popup (see $ask): `hovered` - link which url is edited via popup opened by hover (clearing url removes link) */
  protected askLink(target: HTMLElement, url: string, hovered?: HTMLElement): Promise<string | null> {
    const { $textLink, $errorLink } = this.#ctr;
    const validations = { required: !hovered, url: (v?: string) => !!v && !sanitizeUrl(v) && $errorLink };
    return this.$ask(target, url, { label: $textLink, validations }, hovered);
  }

  /** Asks value of tool via menu of its dropdown of toolbar opened near target (see TextRichMenu): focus stays in editor
   *  or dropdown (focused via keyboard) & menu is controlled by its keys
   * @param target element of tool (embed, dropdown) or range of editor (selection, typed trigger)
   * @param mode `typed` - target is typed trigger: items are filtered by text typed after it, menu is closed if caret leaves it,
   * whitespace is typed or nothing matches; `hover` - menu is opened by hover on target: it's closed when pointer leaves target
   * & menu (keys aren't handled except Escape); otherwise menu is closed when selection is changed
   * @returns chosen value or `null` if canceled or tool isn't rendered in toolbar as dropdown */
  protected askMenu(name: string, target: HTMLElement | Range, mode?: "typed" | "hover"): Promise<unknown> {
    const b = this.findTool(name);
    if (!b?._values) {
      return Promise.resolve(null);
    }
    const tool = (this.#ctr.$tools as Record<string, WUP.TextRich.Tool>)[name];
    const isHover = mode === "hover";
    const m = new TextRichMenu({
      button: b,
      // focus stays in editor or in dropdown focused via keyboard
      owner: isHover ? null : (document.activeElement === b && b) || this.$refInput,
      target,
      hovered: isHover ? (target as HTMLElement) : undefined,
      values: b._values,
      selected: isHover ? tool.is?.(target as HTMLElement) : this.getFormats().get(name) ?? false, // value of hovered embed
      render: (li, v) => this.renderItem(li, tool, v),
    });
    if (isHover) {
      return this.openAsk(m); // isn't related to selection: it's changed when editor is focused by click on item
    }
    const sel = window.getSelection()!;
    const at = [sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset];
    const trigger = mode === "typed" && (target as Range).toString();
    m.onSelect = () => {
      if (trigger === false) {
        // menu opened by click or via $format: closed when selection is changed
        [sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset].some((v, i) => v !== at[i]) && m.done();
        return;
      }
      // text typed from trigger to caret: caret before trigger collapses range
      const r = document.createRange();
      r.setStart((target as Range).startContainer, (target as Range).startOffset);
      sel.isCollapsed && this.$refInput.contains(sel.focusNode) && r.setEnd(sel.focusNode!, sel.focusOffset);
      const str = r.toString();
      const q = str.startsWith(trigger) && !/\s/.test(str) && str.slice(trigger.length).toLowerCase();
      if (q === false) {
        m.done();
        return;
      }
      // item is visible if its label or value contains typed text: `{name` & `{firstName` show `First Name`
      const has = (s: string): boolean => s.toLowerCase().includes(q);
      !m.filter((v) => has(labelOf(v)) || has(String(v.value))) && m.done(); // closed when nothing matches
    };
    return this.openAsk(m);
  }

  /** Called on typing: typed `trigger` of tool rendered in toolbar shows its dropdown near it (see askMenu);
   *  chosen value replaces typed text (trigger & text typed after it) */
  protected gotTrigger(): void {
    const sel = window.getSelection()!;
    const n = sel.focusNode as Text | null;
    if (!sel.isCollapsed || n?.nodeType !== Node.TEXT_NODE) {
      return;
    }
    const s = n.data.slice(0, sel.focusOffset);
    const tools = this.#ctr.$tools as Record<string, WUP.TextRich.Tool>;
    const name = Object.keys(tools).find((k) => {
      const t = tools[k].trigger;
      return t && s.endsWith(t);
    });
    if (name) {
      const r = document.createRange(); // typed trigger: range is live, so it isn't extended by typing after it
      r.setStart(n, s.length - tools[name].trigger!.length);
      r.setEnd(n, s.length);
      this.askMenu(name, r, "typed").then((v) => {
        if (v != null) {
          // typed text is replaced: embed replaces selection, other formats are applied after removing it
          sel.setBaseAndExtent(r.startContainer, r.startOffset, sel.focusNode!, sel.focusOffset);
          tools[name].kind !== "embed" && this.changeContent(() => sel.getRangeAt(0).deleteContents());
          this.applyFormat(name, v, true);
        }
      });
    }
  }

  /** Returns name of tool if element is its embed & value can be changed (tool is rendered in toolbar):
   *  via `ask` of tool on click or via dropdown of tool on click & hover (`isHover`) */
  protected embedTool(el: Element, isHover?: boolean): string | undefined {
    const tools = this.#ctr.$tools as Record<string, WUP.TextRich.Tool>;
    const name = Object.keys(tools).find(
      (k) => tools[k].kind === "embed" && tools[k].is?.(el as HTMLElement) !== undefined
    );
    const can = name && !this.$isReadOnly && !this.$isDisabled && (!isHover || !tools[name].ask) && this.findTool(name);
    return can ? name : undefined;
  }

  /** Returns element under pointer editable via popup opened by hover: embed of tool with values (dropdown) or link (url) */
  protected hoverOf(t: Element): HTMLElement | null {
    return this.embedTool(t, true) ? (t as HTMLElement) : t.closest("a");
  }

  /** Called on click in editor: click on embed (image etc.) asks new value via `ask` of its tool or its dropdown
   *  (if tool is rendered in toolbar): asked value replaces embed
   * @returns true if embed is clicked */
  protected gotClickEmbed(el: HTMLElement): boolean {
    const name = this.embedTool(el);
    if (!name) {
      return false;
    }
    clearTimeout(this.#hoverTimer); // clicked before hover delay: menu is opened by click
    if (this.#ask?.hovered !== el) {
      selectNode(el); // asked value replaces selected embed
      this.applyFormat(name, undefined, false, el);
    } // otherwise menu opened by hover stays opened
    return true;
  }

  /** Called when pointer is over element editable via popup (link, embed: see hoverOf) or its popup (`el` is related element)
   *  or out of them (`el` is `null`): shows popup with delay & hides it when pointer is out (but not while user edits value) */
  protected gotHover(el: HTMLElement | null): void {
    const l = this.#ask;
    if (l && (!l.hovered || l.popup.contains(document.activeElement))) {
      return; // popup is opened via toolbar, typing or click or user edits value
    }
    clearTimeout(this.#hoverTimer);
    if (el === (l?.hovered ?? null)) {
      return; // pointer is moved between element & popup
    }
    const { hoverOpenTimeout, hoverCloseTimeout } = WUPPopupElement.$defaults;
    this.#hoverTimer = setTimeout(
      () => (el?.isConnected ? this.askHover(el) : this.#ask?.done()),
      el ? hoverOpenTimeout : hoverCloseTimeout
    );
  }

  /** Shows popup for element hovered by pointer: dropdown of embed (chosen value replaces it) or url of link */
  protected askHover(el: HTMLElement): void {
    const name = this.embedTool(el, true);
    if (name) {
      this.askMenu(name, el, "hover").then((v) => {
        if (v != null && el.isConnected) {
          this.$refInput.focus({ preventScroll: true }); // otherwise control restores its previous selection
          selectNode(el);
          this.applyFormat(name, v, true); // embed replaces selection & caret is placed after it
        }
      });
    } else if (el.tagName === "A") {
      this.askLink(el, el.getAttribute("href")!, el).then(
        (url) =>
          url != null &&
          this.changeContent(() => (url ? el.setAttribute("href", url) : el.replaceWith(...el.childNodes)))
      );
    }
  }

  /** Replaces selection with node & places caret after it: use it in `format` of tool to insert content
   *  (otherwise selection is restored after format) */
  $insert(node: Node): void {
    const sel = window.getSelection()!;
    const r = sel.getRangeAt(0);
    const last = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node.lastChild : node;
    r.deleteContents();
    r.insertNode(node);
    if (last) {
      r.setStartAfter(last);
      sel.collapse(r.startContainer, r.startOffset);
    }
    this.#isInserted = true;
  }

  /** Replaces selection with sanitized html: blocks are inserted after the current line (it's split by caret) */
  protected insertHTML(html: string): void {
    const f = htmlToEditor(html, this.#ctr.$tools);
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
        if (listTags.has(el.tagName)) {
          Array.from(el.children).forEach(flatten);
          return;
        }
        frag.lastChild && frag.append(document.createElement("br"));
        Array.from(el.childNodes).forEach((n) => (listTags.has(n.nodeName) ? flatten(n as Element) : frag.append(n)));
      };
      Array.from(f.children).forEach(flatten);
      this.$insert(frag);
      return;
    }
    const last = f.lastChild!;
    splitAt(line, r); // empty parts are removed
    r.insertNode(f);
    window.getSelection()!.collapse(last, last.childNodes.length);
  }

  /** Deletes range between lines instead of browser: the rest of the last line is moved into the 1st one;
   *  if the 1st line is deleted from its start, it's removed instead & the last line keeps its tag
   *  (otherwise triple click on heading + Delete turns the next paragraph into heading);
   *  if all lines are deleted completely, the empty line is reset to paragraph (select all + Delete doesn't keep heading, alignment etc.);
   *  besides browser wraps moved content into `<span style>` to keep its computed styles
   * @returns false if range is inside single line or nested lists are involved (browser deletes it as usual) */
  protected deleteLines(sr: StaticRange | undefined): boolean {
    const inp = this.$refInput;
    const lines = getLines(inp);
    const lineAt = (n: Node): HTMLElement | undefined => lines.findLast((l) => l.contains(n));
    const a = sr && lineAt(sr.startContainer);
    const b = sr && lineAt(sr.endContainer);
    if (!a || !b || a === b || a.contains(b) || b.parentElement!.closest("li")) {
      return false;
    }
    const isEmbed = embedOf(this.#ctr.$tools);
    const pos = toLinePos(lines, sr.startContainer, sr.startOffset, isEmbed);
    const isRest = // the last line has content after range
      charsBefore(b, sr.endContainer, sr.endOffset, isEmbed) < charsBefore(b, b, b.childNodes.length, isEmbed);
    const isKeep = !pos[1]; // the 1st line is deleted completely
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
      listTags.has(list.tagName) && !list.firstElementChild && list.remove();
    };
    if (isKeep) {
      if (!isRest) {
        // all lines are deleted: new paragraph without formats & leftovers of partially deleted elements
        b.replaceChildren(document.createElement("br"));
        setLineTag(b, document.createElement("div")).removeAttribute("style");
      }
      remove(a);
    } else {
      if (isRest) {
        a.lastChild?.nodeName === "BR" && a.lastChild.remove(); // otherwise it breaks merged line
        a.append(...b.childNodes);
      }
      remove(b);
    }
    inp.normalize();
    this.setSelectionPos([pos, pos]);
    return true;
  }

  /** Fires event input to update $value after manual changes of editor */
  protected fireInput(): void {
    this.$refInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }

  protected gotToolbarClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest("[tool]") as ToolElement | null;
    if (el?._format) {
      const l = this.#ask;
      l?.done(); // menu opened near editor is closed by another tool
      !(el._values && l?.popup.$options.target === el) && this.applyTool(el); // click on dropdown toggles its menu
    }
  }

  /** Handles keyboard on toolbar: Arrows to navigate, Esc to return to editor; menu of focused dropdown is controlled by its keys */
  protected gotToolbarKeyDown(e: KeyboardEvent): void {
    if (e.altKey || e.ctrlKey || e.metaKey || this.$isDisabled || this.$isReadOnly) {
      return;
    }
    if (this.#ask?.onKey?.(e)) {
      e.preventDefault(); // otherwise button is clicked by Enter/Space: menu is opened again
      return;
    }
    const el = e.target as ToolElement;
    let next: HTMLElement | undefined;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
        if (el._values) {
          e.preventDefault(); // otherwise page is scrolled
          this.applyTool(el); // opens menu of dropdown
        }
        return;
      case "ArrowLeft":
      case "ArrowRight":
      case "Home":
      case "End": {
        const arr = Array.from(this.$refToolbar.querySelectorAll<HTMLElement>("[role=group] > button"));
        const i = arr.indexOf(el);
        const last = arr.length - 1;
        if (e.key === "Home" || e.key === "End") {
          next = arr[e.key === "Home" ? 0 : last];
        } else {
          next = e.key === "ArrowRight" ? arr[i < last ? i + 1 : 0] : arr[i > 0 ? i - 1 : last];
        }
        break;
      }
      case "Escape":
        e.preventDefault(); // otherwise value is cleared
        this.restoreSelection();
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
        this.#ask?.onSelect?.(); // menu is filtered by typed text or closed
      }
    };
    onSelect();
    arr.push(this.appendEvent(document, "selectionchange", onSelect));
    return arr;
  }

  protected override gotFocusLost(): void {
    super.gotFocusLost();
    const l = this.#ask;
    // popup opened by hover or tap (touch doesn't leave it) & menu (focus stays in editor)
    (l?.hovered || l?.onKey) && l.done();
    this.#range = undefined;
    this.#pending.clear();
    this.refreshToolbar(new Map());
  }

  /** Returns rendered toolbar button or dropdown by key `format` or `format:value` (button of value) */
  protected findTool(key: string): ToolElement | null {
    return this.$refToolbar.querySelector(`[tool="${key}"]`);
  }

  /** Returns items of dropdown of tool: values rendered in toolbar */
  protected itemsOf(name: string): WUP.TextRich.ToolValue[] {
    return this.findTool(name)?._values ?? [];
  }

  /** Returns true if value of tool is rendered in toolbar: button of value or item of dropdown */
  protected hasValue(name: string, v: unknown): boolean {
    return !!this.findTool(`${name}:${v}`) || this.itemsOf(name).some((x) => x.value === v);
  }

  /** Applies toolbar item by key `format` or `format:value` (button or item of dropdown)
   * @returns false if it isn't rendered */
  protected applyKey(key: string): boolean {
    const el = this.findTool(key);
    if (el) {
      el._format ? this.applyTool(el) : el.click(); // button clear isn't ToolElement
      return true;
    }
    const [name, v] = key.split(":");
    const item = this.itemsOf(name).find((x) => `${x.value}` === v);
    item && this.applyFormat(name, item.value, true);
    return !!item;
  }

  /** Called on keydown in editor or toolbar: applies tool by keyboard shortcut (`hotKey` of $tools) if tool is rendered in toolbar
   * @returns true if event must be prevented */
  protected gotHotKey(e: KeyboardEvent): boolean {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    // AltGraph: AltGr+key (the same as Ctrl+Alt+key on Windows) types char with some keyboard layouts
    if ((!mod && !e.altKey) || (isMac ? e.ctrlKey : e.metaKey) || e.getModifierState("AltGraph")) {
      return false;
    }
    const key = (codeKeys[e.code as keyof typeof codeKeys] ?? e.code.replace(/^(Key|Digit)/, "")).toUpperCase();
    /** Returns index of shortcut that matches pressed keys (`-1` if nothing) */
    const match = (hk: string | undefined): number =>
      hk?.split(" ").findIndex((s) => {
        const keys = s.split("+");
        return (
          keys.pop()!.toUpperCase() === key &&
          keys.includes("Control") === mod &&
          keys.includes("Alt") === e.altKey &&
          keys.includes("Shift") === e.shiftKey
        );
      }) ?? -1;
    if (match(this.#ctr.$hotKeyToolbar) !== -1) {
      this.$refToolbar.querySelector("button")?.focus();
      return true;
    }
    const found = Object.entries(this.#ctr.$tools as Record<string, WUP.TextRich.Tool>).find(
      ([, t]) => match(t.hotKey) !== -1 || t.values?.some((v) => match(v.hotKey) !== -1)
    );
    if (!found) {
      return mod && !e.altKey && !e.shiftKey && browserHotKeys.has(e.code); // otherwise browser formats via beforeinput
    }
    const [name, tool] = found;
    const i = match(tool.hotKey); // index of pressed shortcut of tool
    const val = i === -1 ? tool.values!.find((v) => match(v.hotKey) !== -1) : undefined;
    if (!tool.values || val) {
      return this.applyKey(val ? `${name}:${val.value}` : name); // false: tool isn't rendered, browser shortcut works as usual
    }
    // tool with values: the 1st shortcut selects the previous value (increases font size), the 2nd one - the next value;
    // values are taken in order of $tools: the nearest one rendered in toolbar
    const { values } = tool;
    const isRendered = (v: WUP.TextRich.ToolValue): boolean => this.hasValue(name, v.value);
    if (!values.some(isRendered)) {
      return false;
    }
    const at = values.findIndex((v) => v.value === (this.getFormats().get(name) ?? false));
    const next = (i ? values.slice(at + 1) : values.slice(0, at < 0 ? undefined : at).reverse()).find(isRendered);
    next && this.applyFormat(name, next.value, true);
    return true;
  }

  protected override gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    const t = e.target as Node;
    if ((t === this.$refInput || this.$refToolbar.contains(t)) && this.gotHotKey(e)) {
      e.preventDefault(); // skipped for nested control in popup of link
      return;
    }
    const l = this.#ask;
    if (t === this.$refInput && l?.onKey?.(e)) {
      e.preventDefault(); // menu is navigated via keys of editor: otherwise caret is moved, line is added etc.
      return;
    }
    if (e.key === "Escape" && l?.hovered) {
      e.preventDefault(); // the 1st Escape closes popup opened by hover: otherwise value is cleared
      l.done();
      return;
    }
    super.gotKeyDown(e);
  }

  protected override gotBeforeInput(e: WUP.Text.GotInputEvent): void {
    const t = e.inputType;
    if (t.startsWith("format")) {
      e.preventDefault(); // formatting by browser (menu of Safari, iOS etc.) is replaced with custom one: to save it in custom history
      // inputType => tool: formatBold => bold, formatJustifyCenter => align:center etc.; color, font etc. aren't supported
      const f = t.slice(6).toLowerCase(); // formatJustifyCenter => justifycenter
      const k =
        (f === "justifyfull" && "align:justify") ||
        (f === "justifyleft" && "align:false") ||
        (f.startsWith("justify") && `align:${f.slice(7)}`) || // center, right
        (f.endsWith("script") && `script:${f.slice(0, -6)}`) || // superscript, subscript
        (f.endsWith("dent") && `indent:${f === "indent" ? 1 : -1}`) || // indent, outdent
        (f === "remove" && "clean") ||
        f.replace("strikethrough", "strike"); // bold, italic, underline
      this.applyKey(k); // only formats rendered in toolbar
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
    } else if (t === "insertText" && e.data && this.wrapSelection(e.data)) {
      e.preventDefault(); // history & $value are updated via changeContent: wrapping is a separate step of undo
      return;
    } else if (t === "insertText" && e.data && this.#pending.size) {
      e.preventDefault();
      this.insertPending(e.data);
    } else if (t.startsWith("delete") && this.deleteLines(e.getTargetRanges()[0])) {
      e.preventDefault();
    } else {
      return;
    }
    this.fireInput(); // history is saved on input according to state before changes
  }

  protected override createHistory(): TextHistory {
    return new TextRichHistory(this.$refInput);
  }

  protected override gotInput(e: WUP.Text.GotInputEvent): void {
    super.gotInput(e);
    this.$refFooter && this.$renderFooter(this.$refFooter); // at once: $value is changed after $options.debounceMs
    e.inputType === "insertText" && this.gotTrigger();
  }

  protected override setInputValue(v: string, reason: SetValueReasons): void {
    if (v && v === this.$refInput.value) {
      return; // skip re-rendering: it resets selection & scroll
    }
    super.setInputValue(v, reason);
    this.$refFooter && this.$renderFooter(this.$refFooter);
  }

  protected override setClearState(): ValueType | undefined {
    const b = this.$refBtnClear;
    const was = b?.getAttribute("clear");
    const next = super.setClearState(); // it's called on every change: label is updated only if state is changed
    b && b.getAttribute("clear") !== was && this.setClearLabel(b);
    return next;
  }
}

customElements.define(tagName, WUPTextRichControl);
