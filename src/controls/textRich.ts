import { inheritDefaults } from "../baseElement";
import onEvent from "../helpers/onEvent";
import { stringPrettify } from "../helpers/string";
import WUPPopupElement from "../popup/popupElement";
import { useTooltipOnce } from "../popup/popupTooltip";
import WUPTextControl from "./text";
import TextHistory from "./text.history";
import WUPTextAreaControl from "./textArea";
import { charsBefore, pointAt } from "./textArea.input";
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
  getLines,
  intersects,
  linesOf,
  removeInline,
  setLineTag,
  splitAt,
  splitRange,
  textAt,
  wrapLines,
} from "./textRich.format";

WUPTextRichInput.$use();

const tagName = "wup-textrich";
declare global {
  namespace WUP.TextRich {
    /** Tool name => type of its value (`true` - tool without values: toggle button or action); extend it to add a custom tool
     * @example
     * declare global {
     *   namespace WUP.TextRich {
     *     interface ToolValues {
     *       upper: true; // button
     *       color: "red" | "green" | false; // dropdown
     *     }
     *   }
     * }
     * WUPTextRichControl.$tools.upper = { label: "Uppercase", format: ({ texts }) => ... };
     * el.$options.toolbar = [["bold", "upper"], ["color"]]; */
    interface ToolValues extends BuiltInToolValues {}
    /** Built-in tools: always defined in static $tools */
    interface BuiltInToolValues {
      bold: true;
      italic: true;
      underline: true;
      strike: true;
      blockquote: true;
      code: true;
      /** Link url (asked via popup) */
      link: string;
      /** Removes formatting */
      clean: true;
      /** Clear button ($refBtnClear): rendered if `$options.clearButton` is true, works like Esc (see `$options.clearActions`) */
      btnClear: true;
      /** Heading level; `false` - paragraph */
      header: 1 | 2 | 3 | 4 | 5 | 6 | false;
      list: "ordered" | "bullet";
      script: "sub" | "super";
      /** Decrease (`-1`) or increase (`1`) indent */
      indent: -1 | 1;
      /** Small, large, huge; `false` - default */
      size: "sm" | "lg" | "hg" | false;
      /** `false` - left (default) */
      align: "center" | "right" | "justify" | false;
    }
    /** Dropdown item or button for a single value (toolbar item `{ list: "ordered" }`) */
    interface ToolValue<V = any> {
      /** Ex. `1` for `header` */
      value: V;
      /** Text of dropdown item or `aria-label` & tooltip of button; @defaultValue prettified value (`sans-serif` => `Sans Serif`) */
      label?: string;
      /** Keyboard shortcut (see Tool.hotKey) */
      hotKey?: string;
      /** Class of button or dropdown item: to show icon via `--icon-img` instead of label */
      className?: string;
      /** Class of element created via `create` */
      classNameTag?: string;
    }
    /** Toolbar tool
     * @tutorial Rules
     * * without `values` - button: pressed when format is applied (see `is`), otherwise it's an action
     * * with `values` - dropdown; toolbar item with a single value (`{ list: "ordered" }`) - button
     * * format is applied via `format` or by default according to `kind`: dropdown item sets value (`false` removes format),
     * button toggles format */
    interface Tool<V = any> {
      /** `aria-label` & tooltip; @defaultValue tool name */
      label?: string;
      /** Keyboard shortcut in `aria-keyshortcuts` format: `Control+Shift+X`; several ones are separated by space
       * @tutorial Rules
       * * `Control` is Cmd on macOS/iOS (shown as `⌘`)
       * * `Control` or `Alt` is required; key is matched by `KeyboardEvent.code`, so it works with any keyboard layout
       * * works only if tool is rendered in toolbar
       * * tool with values: the 1st shortcut selects the previous value, the 2nd one - the next value (`size`: bigger/smaller)
       * * `btnClear`: Escape clears value according to $options.clearActions */
      hotKey?: string;
      /** Class of toolbar button or dropdown (space-separated): to set icon via css-var `--icon-img`
       *  (`.my-icon-upper { --icon-img: url("data:image/svg+xml,...") }`); or use `wup-textrich [tool="upper"]` selector instead */
      className?: string;
      /** Class of element created via `create` (in editor, $value & dropdown preview): to style it & detect it in `is` */
      classNameTag?: string;
      /** Dropdown values in default order (toolbar item `"header"` = `{ header: [1, 2, 3, 4, 5, 6, false] }`);
       *  `false` - format isn't applied (`Normal` of `header`);
       *  without `ask` value is asked via this dropdown opened near editor (on `trigger`, hover on `embed`, $format without value) */
      values?: ToolValue<V>[];
      /** Typed text that opens tool dropdown near caret (`{` - placeholders, `@` - mentions, `/` - commands);
       *  text typed after it filters items by label or value; chosen value replaces typed text;
       *  Arrows - navigate, Enter/Tab/click - choose, Escape/whitespace/caret out - close
       * @tutorial Rules
       * * works only if tool is rendered in toolbar as dropdown
       * * typed pair of trigger (see static $wrapChars) applies typed text even if it isn't in values:
       * `{someProp}` gives placeholder `someProp` (`is` can return `undefined` to reject it)
       * * `inline` tool with trigger inserts token (placeholder, mention): `create` element with text `{trigger}{value}{pair}`
       * (`{firstName}`, `@john`); hover on it opens dropdown to replace it (like `embed`); text typed at its edges goes outside it
       * * char from static $wrapChars typed over selection wraps it (`{` gives `{text}`)
       * @example
       * WUPTextRichControl.$tools.placeholder = {
       *   values: [{ value: "firstName", label: "firstName" }, { value: "email" }], // label is prettified value by default: `Email`
       *   trigger: "{", // typed `{fi` shows `firstName`
       *   kind: "inline",
       *   is: (el) => (el.classList.contains("placeholder") ? el.textContent.slice(1, -1) : undefined),
       *   create: "span", // inserted as `<span class="placeholder">{firstName}</span>`
       *   classNameTag: "placeholder",
       * }; */
      trigger?: string;
      /** Kind of format: defines default `format`, sanitizing & behavior with collapsed selection
       * * `inline` - wraps text (`<b>`, `<a>`, `<span style>`); with collapsed selection it's applied to the next typed text
       * (if no `ask`); removed by `clean`
       * * `line` - line element (`<h1>`, `<blockquote>`): replaces selected lines (`false` - paragraph)
       * * `lineStyle` - line style (`text-align` etc.): set to selected lines via `set`
       * * `embed` - element without text (`<img>`, `<hr>`): replaces selection, caret goes after it; counted as 1 char
       * * not set - action: `format` is required
       * @tutorial Sanitizing
       * html of value (paste etc.) keeps only formats of tools with `kind`: element is re-created via `create`
       * (`set` for `lineStyle`) if `is` returns value; others are unwrapped or removed with content (`<script>` etc.) */
      kind?: "inline" | "line" | "lineStyle" | "embed";
      /** Returns value of format applied by element or `undefined`: toolbar shows state of the nearest element at selection start;
       *  `line` & `lineStyle` get lines only (paragraph, heading, list item etc.)
       *  WARN: sanitizer calls it for untrusted html (paste etc.): return only safe values (see `sanitizeUrl`) */
      is?: (el: HTMLElement) => V | undefined;
      /** Creates element of format with value: for default format, sanitizer & dropdown preview (heading etc.);
       *  tag name = `() => document.createElement(tag)`
       * @example
       * create: "mark",
       * create: (v) => document.createElement(v === "sub" ? "sub" : "sup"), */
      create?: keyof HTMLElementTagNameMap | ((value: V) => HTMLElement);
      /** Sets value to line (`undefined` removes it): for default format & sanitizer of `lineStyle`;
       *  WARN: format `line` (heading etc.) keeps only `style` of replaced line, so use styles instead of attributes */
      set?: (el: HTMLElement, value: V | undefined) => void;
      /** Asks value via custom UI (popup, modal etc.): when tool is applied without value (button, shortcut)
       *  or on click on `embed` element (value replaces it); `null`/`undefined` cancels;
       *  selection is restored even if focus moves out (to modal etc.); by default tool with `values` asks via its dropdown
       * @param target element to place popup near: clicked embed, tool button or editor (if tool isn't rendered)
       * @param current value at selection start
       * @see {@link WUPTextRichControl.$ask} - popup with text control */
      ask?: (target: HTMLElement, control: WUPTextRichControl, current: V | undefined) => Promise<V | null | undefined>;
      /** Custom format instead of default one (see `kind`); after it control saves history, restores selection
       *  (use `control.$insert` to insert content & place caret after it), updates $value & toolbar
       * @example
       * format: ({ texts }) => texts.forEach((t) => (t.data = t.data.toUpperCase())), // uppercase selected text
       * format: ({ control }) => control.$insert(document.createTextNode(new Date().toLocaleDateString())), // insert date
       * format: (ctx) => { ctx.applyDefault(); myStatistics.push(ctx.value); }, // extend default format */
      format?: (ctx: FormatContext<V>) => void;
    }
    /** Argument of `Tool.format` */
    interface FormatContext<V = any> {
      /** Selected range: it's live, so editor changes can move it */
      range: Range;
      /** `true` for tool without values, `false` removes format */
      value: V;
      /** `true` - set value (dropdown item, `ask`), `false` - toggle format (button) */
      isSet: boolean;
      /** Selected lines: paragraphs, headings, list items etc. (taken before format) */
      readonly lines: HTMLElement[];
      /** Selected text nodes (split at selection edges);
       *  WARN: computed on the 1st access, so read it before changing editor (destructure it in arguments) */
      readonly texts: Text[];
      /** Element with `contenteditable` */
      editor: HTMLElement;
      tool: Tool<V>;
      control: WUPTextRichControl;
      /** Applies default format by `kind`: to extend default behavior */
      applyDefault: () => void;
    }
    /** @see {@link Tool} */
    type Tools = { [K in keyof BuiltInToolValues]: Tool<ToolValues[K]> } & {
      [K in keyof ToolValues]?: Tool<ToolValues[K]>;
    } & {
      /** `labelBack` - label when the next click restores previous value (see $options.clearActions) */
      btnClear: { labelBack: string };
    };
    /** Button `"bold"`, dropdown with all values `"header"`, dropdown with chosen values `{ header: [1, 2, false] }`
     *  or button of a value `{ list: "ordered" }` */
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
      /** Toolbar items split into groups (empty array hides toolbar); custom tools must be defined in static $tools
       * @see {@link ToolbarItem}
       * @example
       * [
       *   ["bold", "italic", "underline"], // buttons
       *   ["header"], // dropdown with all values
       *   [{ size: ["sm", false, "lg"] }], // dropdown with chosen values
       *   [{ list: "ordered" }, { list: "bullet" }], // button per value
       *   ["clean"], // removes formatting
       *   ["btnClear"], // clear button (if $options.clearButton is true)
       * ]
       * @defaultValue all built-in tools */
      toolbar: ToolbarGroup[];
      /** Hide keyboard shortcuts in tooltips & dropdown items (`Bold (Ctrl+B)` => `Bold`); `aria-keyshortcuts` is set anyway
       * @see {@link WUP.TextRich.Tool.hotKey}
       * @defaultValue false */
      hideHotKeysHint: boolean;
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

/** Toolbar button: `_format` - tool name, `_value` - value of button (`"ordered"` for list), `_values` - dropdown values */
type ToolElement = HTMLElement & { _format: string; _value?: unknown; _values?: WUP.TextRich.ToolValue[] };

/** Cmd instead of Ctrl (iPadOS reports Macintosh, iOS - like Mac OS X) */
const isMac = navigator.userAgent.includes("Mac");
/** `KeyboardEvent.code` => shortcut key; letters & digits are taken from code (`KeyB` => `B`) */
const codeKeys = {
  Period: ".",
  Comma: ",",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
};
/** Browser formatting shortcuts (Ctrl/Cmd + B, I, U): prevented so only $tools shortcuts work */
const browserHotKeys = new Set<string>(["KeyB", "KeyI", "KeyU"]);

/** Returns the 1st node inside range (skips node if range starts at its end) */
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

/** Returns true if applied value `v` matches `value` (`true` matches any value) */
const isMatch = (v: unknown, value: unknown): boolean => v !== undefined && (value === true || v === value);

/** Returns checker: element applies format of tool with value (`true` - any value) */
function isOf(t: WUP.TextRich.Tool, value: unknown = true): (el: Element) => boolean {
  return (el) => isMatch(t.is!(el as HTMLElement), value);
}

/** Returns label or prettified value (`sans-serif` => `Sans Serif`) */
const labelOf = (v: WUP.TextRich.ToolValue): string =>
  v.label ?? __wupln(stringPrettify(String(v.value), true, true), "content");

/** Returns text between trigger & pair at the end of string (`{someProp}` => `someProp`)
 * @returns `undefined` if there is no pair at the end or text is empty or has whitespaces */
function typedValue(s: string, trigger: string, pair: string | undefined): string | undefined {
  if (!pair || !s.endsWith(pair)) {
    return undefined;
  }
  const i = s.lastIndexOf(trigger, s.length - pair.length - 1);
  const v = i < 0 ? "" : s.slice(i + trigger.length, -pair.length);
  return v && !/\s/.test(v) ? v : undefined;
}

/** Selects range (Range or StaticRange) */
const selectRange = (r: AbstractRange): void =>
  window.getSelection()!.setBaseAndExtent(r.startContainer, r.startOffset, r.endContainer, r.endOffset);

/** Selects node (embed format replaces it) */
function selectNode(n: Node): void {
  const r = document.createRange();
  r.selectNode(n);
  selectRange(r);
}

/** Inserts text at point
 * @returns point after inserted text */
function insertText(n: Node, offset: number, s: string): [Node, number] {
  if (n.nodeType === Node.TEXT_NODE) {
    (n as Text).insertData(offset, s);
    return [n, offset + s.length];
  }
  return [n.insertBefore(document.createTextNode(s), n.childNodes[offset] ?? null), s.length];
}

/** Form-control with rich text editor (WYSIWYG) & toolbar; behavior & styles are similar to npm quill
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
 * * $value is sanitized html (`undefined` if there is no text & embeds): only formats of $tools are kept
 * (`<strong>`, `<em>`, `<a>`, `<h1>`, `<blockquote>` etc.) with paragraphs `<p>`, lists & indents;
 * a single plain paragraph goes without `<p>` (`text` instead of `<p>text</p>`)
 * * undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y, OS-native) works for text & formats
 * * tools are defined in static $tools: change it to redefine labels, shortcuts etc. or to add a custom tool
 * * shortcuts are similar to Google Docs: Ctrl+B, Ctrl+Shift+7, Ctrl+Alt+1 etc. (Cmd on macOS/iOS);
 * they're shown in tooltips & dropdown items (see $options.hideHotKeysHint); Alt+F10 focuses toolbar (Arrows - navigate, Esc - return)
 * * inline format (bold etc.) with collapsed selection is applied to the next typed text
 * * typed quote or bracket wraps selected text like in code editors: `"text"`, `(text)` (see static $wrapChars)
 * * typed `trigger` opens tool dropdown near caret: `{` for placeholders, `@` for mentions etc.
 * * content styles are global: use `<div wup-textrich>{$value}</div>` to show value outside control
 * @tutorial innerHTML @example
 * <label>
 *   <span> // extra span requires to use with icons via label:before, label:after without adjustments
 *      <wup-richinput contenteditable="true" role="textbox" aria-multiline="true" wup-textrich />
 *      <strong>{$options.label}</strong>
 *   </span>
 * </label>
 * <div role="toolbar"> // moved to the top via css
 *   <div role="group">
 *     <button tool="bold" aria-pressed="false"></button>
 *     <button tool="header" role="combobox" aria-label="Heading" aria-expanded="false">Normal</button> // dropdown
 *   </div>
 *   <div role="group"><button tool="btnClear" clear></button></div> // $refBtnClear
 * </div>
 * <footer role="note" aria-label="Characters: {count} of {max}" w-tooltip>{count} / {max}</footer> // $refFooter
 * <wup-popup><wup-text/></wup-popup> // $ask: link url etc.
 * <wup-popup menu><ul role="listbox"><li role="option"><h1 role="none">Heading 1</h1></li>...</ul></wup-popup> // dropdown menu */
export default class WUPTextRichControl<
  ValueType = string,
  TOptions extends WUP.TextRich.Options = WUP.TextRich.Options,
  EventMap extends WUP.TextRich.EventMap = WUP.TextRich.EventMap
> extends WUPTextAreaControl<ValueType, TOptions, EventMap> {
  /** Returns this.constructor // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146 */
  #ctr = this.constructor as typeof WUPTextRichControl;

  /** Static $tools by name */
  get #tools(): Record<string, WUP.TextRich.Tool> {
    return this.#ctr.$tools;
  }

  static get $styleRoot(): string {
    return "";
  }

  static get $style(): string {
    return super.$style;
  }

  /** Text announced by screen-readers; @defaultValue `press Alt + F10 to focus toolbar` */
  static $ariaDescription = __wupln("press Alt + F10 to focus toolbar", "aria");
  /** Label of link popup; @defaultValue `Enter link` */
  static $textLink = __wupln("Enter link", "content");
  /** Error of invalid link; @defaultValue `Invalid link` */
  static $errorLink = __wupln("Invalid link", "validation");
  /** `aria-label` of toolbar; @defaultValue `Formatting` */
  static $ariaToolbar = __wupln("Formatting", "aria");
  /** Shortcut to focus toolbar (Arrows - navigate, Esc - return)
   * @see {@link WUP.TextRich.Tool.hotKey}
   * @defaultValue `Alt+F10` */
  static $hotKeyToolbar = "Alt+F10";
  /** Opening => closing char: typed over selection wraps it like in code editors (`(` gives `(text)`, `text` stays selected);
   *  remove pair (or clear map) to replace selection as usual
   * @defaultValue quotes & brackets */
  static $wrapChars = new Map([
    ['"', '"'],
    ["'", "'"],
    ["`", "`"],
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
    ["<", ">"],
  ]);

  /** Toolbar tools by name (used in $options.toolbar): change it to redefine labels, shortcuts etc. or to add a custom tool
   *  (applied on the next toolbar render)
   * @see {@link WUP.TextRich.Tool}
   * @example
   * WUPTextRichControl.$tools.strike.label = "Crossed out";
   * WUPTextRichControl.$tools.strike.hotKey = "Control+Shift+S";
   * delete WUPTextRichControl.$tools.header.values![5].hotKey; // disable shortcut of `Heading 6`
   * // custom tools (TS: add `highlight: true; upper: true;` to WUP.TextRich.ToolValues)
   * WUPTextRichControl.$tools.highlight = {
   *   label: "Highlight",
   *   className: "my-icon-highlight", // css: `.my-icon-highlight { --icon-img: url("data:image/svg+xml,...") }`
   *   kind: "inline", // toggled by default format
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
      create: "b", // <strong> is styled as control label
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
      hotKey: "Control+Shift+X", // or "Control+Shift+X Alt+Shift+5" (Alt+Shift+5 as in Google Docs)
      kind: "inline",
      is: ({ tagName: t }) => t === "S" || t === "STRIKE" || t === "DEL" || undefined, // undefined - not applied (false is a value)
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
      // unsafe url (`javascript:` etc.) => sanitizer removes link
      is: (el) => (el.tagName === "A" && sanitizeUrl(el.getAttribute("href") || "")) || undefined,
      create: (url) =>
        Object.assign(document.createElement("a"), { href: url, target: "_blank", rel: "noopener noreferrer" }),
      // selection inside link removes it, otherwise asks url
      ask: (target, c, cur) => (cur === undefined ? c.askLink(target, "https://") : Promise.resolve("")),
      format: ({ range, value: url, editor, tool, control, applyDefault }) => {
        if (!range.collapsed) {
          applyDefault(); // empty url removes link
        } else if (url) {
          const a = createOf(tool, url); // url as text
          a.textContent = url;
          control.$insert(a);
        } else {
          const a = formatParents(range.startContainer, isOf(tool), editor)[0]; // remove the whole link
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
        const t = el.tagName === "LI" && el.parentElement?.tagName;
        return (t === "OL" && "ordered") || (t === "UL" && "bullet") || undefined;
      },
      format: ({ lines, value, editor }) => {
        const tag = value === "ordered" ? "OL" : "UL";
        const isOn = lines.every((l) => l.parentElement!.tagName === tag);
        lines.forEach((l) => {
          if (isOn) {
            setLineTag(l, "DIV");
          } else if (l.parentElement!.tagName !== tag) {
            const li = setLineTag(l, "LI"); // moves item out of another list
            li.parentNode!.insertBefore(document.createElement(tag), li).appendChild(li);
          }
        });
        // merge adjacent lists: `<ol><li>a</li></ol><ol><li>b</li></ol>` => `<ol><li>a</li><li>b</li></ol>`
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
      // unsupported font size is shown as default
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
      // icons via classes (see css)
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
      // collapsed selection: removes formats of the next typed text (see applyFormat)
      format: ({ lines, texts, editor, control }) => {
        // tools of subclass
        Object.values(
          (control.constructor as typeof WUPTextRichControl).$tools as Record<string, WUP.TextRich.Tool>
        ).forEach((t) => t.kind === "inline" && t.is && removeInline(texts, isOf(t), editor));
        // plain paragraph
        lines.forEach((l) => setLineTag(l, document.createElement("div")).removeAttribute("style"));
      },
    },
    btnClear: {
      label: __wupln("Clear content", "aria"),
      labelBack: __wupln("Restore", "aria"),
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
    toolbar: [
      ["header"], // = [{ header: [1, 2, 3, 4, 5, 6, false] }]
      ["bold", "italic", "underline", "strike"],
      ["blockquote", "code"],
      ["link"],
      [{ list: "ordered" }, { list: "bullet" }], // buttons; ["list"] is dropdown
      [{ script: "sub" }, { script: "super" }],
      [{ indent: -1 }, { indent: 1 }],
      ["size"],
      // not supported yet: color, background
      ["align"],
      ["clean"],
      ["btnClear"], // if $options.clearButton is true
    ],
    hideHotKeysHint: false,
  });

  static override cloneDefaults<T extends Record<string, any>>(): T {
    const d = super.cloneDefaults() as WUP.TextRich.Options;
    // otherwise changing $options.toolbar[i] mutates $defaults
    d.toolbar = d.toolbar.slice();
    return d as unknown as T;
  }

  $refInput = Object.assign(document.createElement("wup-richinput") as WUPTextRichInput, {
    _tools: this.#ctr.$tools, // sanitizer keeps their formats
  }) as unknown as HTMLInputElement;

  /** Toolbar with buttons & dropdowns */
  $refToolbar = document.createElement("div");

  /** Formats shown by toolbar: to skip refresh if nothing changed */
  #shown?: string;
  /** Last selection in editor: restored when focus is on toolbar */
  #range?: Range;

  protected override renderControl(): void {
    super.renderControl();
    const bar = this.$refToolbar;
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", this.#ctr.$ariaToolbar);
    bar.addEventListener("click", (e) => this.gotToolbarClick(e));
    this.appendChild(bar); // after editor (moved up via css): otherwise form autofocus focuses toolbar

    // screen-reader hint: how to reach toolbar
    const inp = this.$refInput;
    const hint = this.$refLabel.appendChild(document.createElement("span"));
    hint.id = this.#ctr.$uniqueId;
    hint.className = this.#ctr.classNameHidden;
    hint.textContent = this.#ctr.$ariaDescription;
    inp.setAttribute("aria-describedby", hint.id);
    inp.setAttribute("wup-textrich", ""); // global content styles

    useTooltipOnce("w-tooltip");
    // hover on link opens url popup, on embed & token - tool dropdown;
    // skipped while selecting by mouse & for touch (buttons = 1) & while pointer stays over the same element
    onEvent(inp, "pointermove", (e) => {
      const el = !e.buttons && this.hoverOf(e.target as Element);
      el !== false && el !== this.#under && this.gotHover((this.#under = el));
    });
    // touch leaves element right after tap: popup is closed by tap elsewhere or on blur
    onEvent(inp, "pointerleave", (e) => e.pointerType !== "touch" && this.gotHover((this.#under = null)));
    // press opens popup of element at once (caret is placed as usual), press elsewhere closes it
    const press = (t: Element): void => {
      const el = this.hoverOf(t);
      clearTimeout(this.#hoverTimer);
      if (el !== (this.#ask?.hovered ?? null)) {
        el ? this.askHover(el) : this.#ask!.done();
      }
    };
    // touch presses on click: otherwise popup opens when scrolling starts
    onEvent(inp, "pointerdown", (e) => e.pointerType !== "touch" && press(e.target as Element));
    inp.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const a = t.closest("a");
      a && e.preventDefault(); // readonly (contenteditable=false): browser follows any url (`javascript:` etc.)
      const href = a && (e.ctrlKey || e.metaKey) && sanitizeUrl(a.href);
      if (href) {
        // Ctrl/Cmd+Click opens link: browser doesn't follow links in contenteditable
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      press(t); // touch (mouse is pressed on pointerdown already)
      // embed with `ask` (image etc.): asked value replaces it
      const name = this.embedTool(t);
      if (name && this.#tools[name].kind === "embed" && this.#tools[name].ask) {
        selectNode(t);
        this.applyFormat(name, undefined, false, t);
      }
    });
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.TextRich.Options> | null): void {
    super.gotChanges(propsChanged as any); // creates/removes $refBtnClear & footer
    (!propsChanged ||
      propsChanged.includes("toolbar") ||
      propsChanged.includes("hideHotKeysHint") ||
      propsChanged.includes("clearButton")) &&
      this.renderToolbar();
  }

  protected override countChars(): number {
    return htmlToText(this.$refInput.value).length;
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
    this.#shown = undefined; // force refresh of new items
    this.refreshToolbar();
  }

  /** Renders toolbar item into group */
  protected renderTool(group: HTMLElement, item: WUP.TextRich.ToolbarItem): void {
    const [name, picked] = (typeof item === "string" ? [item] : Object.entries(item)[0]) as [string, unknown];
    const tool = this.#tools[name];
    // value from tool: with label, shortcut & class
    const valueOf = (v: unknown): WUP.TextRich.ToolValue => tool.values?.find((t) => t.value === v) ?? { value: v };
    if (!tool) {
      this.throwError(`Toolbar item '${name}' isn't defined in $tools`, undefined, true);
    } else if (name === "btnClear") {
      const b = this.$refBtnClear; // exists if $options.clearButton is true
      if (b) {
        this.setClearLabel(b); // button is reused: hideHotKeysHint can be changed
        group.appendChild(b);
      }
    } else if (picked === undefined || Array.isArray(picked)) {
      this.renderButton(group, name, tool, undefined, (picked as unknown[] | undefined)?.map(valueOf) ?? tool.values);
    } else {
      this.renderButton(group, name, tool, valueOf(picked));
    }
  }

  /** Renders toolbar button: `v` - button of value (`list:ordered`), `values` - dropdown, otherwise toggle or action */
  protected renderButton(
    group: HTMLElement,
    name: string,
    tool: WUP.TextRich.Tool,
    v?: WUP.TextRich.ToolValue,
    values?: WUP.TextRich.ToolValue[]
  ): void {
    const b = group.appendChild(document.createElement("button")) as HTMLButtonElement & ToolElement;
    b.type = "button";
    b.tabIndex = -1; // reachable via Alt+F10
    b.setAttribute("tool", v ? `${name}:${v.value}` : name);
    this.setToolLabel(b, v ? labelOf(v) : tool.label ?? name, v ? v.hotKey : tool.hotKey);
    addClass(b, tool.className, v?.className);
    if (values) {
      b.setAttribute("role", "combobox"); // select-only combobox
      b.setAttribute("aria-expanded", false);
      values.some((x) => x.className) && b.setAttribute("icon", ""); // shows icon of the current value instead of label
    } else if (tool.is && tool.kind !== "embed") {
      b.setAttribute("aria-pressed", false); // actions & embeds have no state
    }
    b._format = name;
    b._value = v?.value;
    b._values = values;
  }

  /** Sets `aria-label` & tooltip `{label} ({hotKey})` of button or icon item of dropdown */
  protected setToolLabel(b: HTMLElement, label: string, hotKey: string | undefined): void {
    b.setAttribute("aria-label", label);
    const hint = this.setHotKeys(b, hotKey);
    b.setAttribute("w-tooltip", hint && `${label} (${hint})`); // empty - tooltip shows aria-label
  }

  /** Sets label of clear button by its state: clear or restore */
  protected setClearLabel(b: HTMLElement): void {
    const t = this.#ctr.$tools.btnClear;
    this.setToolLabel(b, (b.getAttribute("clear") ? t.labelBack : t.label) ?? "btnClear", t.hotKey);
  }

  /** Sets `aria-keyshortcuts` (`Control` => `Meta` on macOS/iOS)
   * @returns hint: `Ctrl+Shift+X / Alt+Shift+5` or `⇧⌘X` on macOS/iOS (empty if $options.hideHotKeysHint) */
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
        // order of macOS menus
        return `${keys.includes("Alt") ? "⌥" : ""}${keys.includes("Shift") ? "⇧" : ""}${
          keys.includes("Control") ? "⌘" : ""
        }${k}`;
      })
      .join(" / ");
  }

  /** Returns clear button placed in toolbar instead of label */
  protected override renderBtnClear(): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.tabIndex = -1;
    b.setAttribute("tool", "btnClear");
    b.setAttribute("clear", ""); // icon & state as in other controls
    b.addEventListener("click", () => {
      this.restoreSelection(); // returns focus to editor like other tools
      this.clearValue();
    });
    return b;
  }

  /** Renders dropdown item: icon (if `className`) or label inside element of format (preview via `create`) */
  protected renderItem(li: HTMLElement, tool: WUP.TextRich.Tool, v: WUP.TextRich.ToolValue): void {
    const label = labelOf(v);
    if (v.className) {
      li.setAttribute("icon", "");
      addClass(li, v.className);
      this.setToolLabel(li, label, v.hotKey); // label & shortcut in tooltip like for buttons
      return;
    }
    let preview: HTMLElement | undefined;
    if (tool.create && tool.kind !== "embed") {
      // inner element: otherwise checkmark of selected item is scaled too
      preview = li.appendChild(createOf(tool, v.value));
      preview.setAttribute("role", "none"); // hides semantics: heading etc.
      preview.textContent = label;
    } else {
      li.textContent = label;
    }
    const hint = this.setHotKeys(li, v.hotKey);
    if (preview && isBlockTag(preview.tagName)) {
      hint && li.setAttribute("w-tooltip", `${label} (${hint})`); // headings are big: hint only in tooltip
    } else if (hint) {
      const kbd = li.appendChild(document.createElement("kbd")); // at the right like in OS menus
      kbd.setAttribute("aria-hidden", true); // announced via aria-keyshortcuts
      kbd.textContent = hint;
    }
  }

  /** Updates toolbar state by formats of selection (skipped if nothing changed) */
  protected refreshToolbar(formats = this.getFormats()): void {
    const shown = JSON.stringify([...formats]);
    if (shown === this.#shown) {
      return;
    }
    this.#shown = shown;
    this.$refToolbar.querySelectorAll<ToolElement>("[aria-pressed],[aria-expanded]").forEach((el) => {
      const name = el._format;
      const cur = formats.get(name) ?? false;
      if (el._values) {
        // dropdown shows icon or label of the current value (even if value isn't rendered: `Heading 3`)
        const tool = this.#tools[name];
        const v = tool.values?.find((x) => x.value === cur);
        if (el.hasAttribute("icon")) {
          el.className = "";
          addClass(el, tool.className, v?.className);
        } else {
          const label = cur === false ? tool.label ?? name : String(cur); // unknown value as is: `someProp`
          el.textContent = v ? labelOf(v) : label;
        }
      } else {
        el.setAttribute("aria-pressed", el._value === undefined ? cur !== false : cur === el._value);
      }
    });
  }

  /** Returns formats of selection (+ pending ones for the next typed text): tool => value
   *  of the nearest element at selection start or of its line (see `is` & `kind`) */
  protected getFormats(): Map<string, unknown> {
    const m = new Map<string, unknown>();
    const inp = this.$refInput;
    const sel = window.getSelection();
    const n = sel?.rangeCount ? firstNode(sel.getRangeAt(0)) : null;
    if (n && inp.contains(n)) {
      // line: child of editor or list item
      const line = formatParents(n, (el) => el.parentElement === inp || el.tagName === "LI", inp)[0];
      Object.entries(this.#tools).forEach(([name, t]) => {
        const el = t.is && (t.kind === "line" || t.kind === "lineStyle" ? line : formatParents(n, isOf(t), inp)[0]);
        const v = el ? t.is!(el as HTMLElement) : undefined;
        v !== undefined && m.set(name, v);
      });
      this.#pending.forEach((v, k) => (v === false ? m.delete(k) : m.set(k, v)));
    }
    return m;
  }

  /** Focuses editor & restores the last selection (if focus is on toolbar) */
  protected restoreSelection(): void {
    const inp = this.$refInput;
    if (document.activeElement === inp) {
      return;
    }
    inp.focus({ preventScroll: true });
    const r = this.#range;
    r && inp.contains(r.startContainer) && selectRange(r);
  }

  /** Applies toolbar button: toggles format or opens dropdown menu */
  protected applyTool(el: ToolElement): void {
    const name = el._format;
    if (el._values) {
      document.activeElement !== el && this.restoreSelection(); // dropdown focused via keyboard keeps focus
      this.askMenu(name, el).then((v) => v != null && this.applyFormat(name, v, true));
    } else {
      this.applyFormat(name, el._value, false);
    }
  }

  /** Applies tool to selection like toolbar does (tool may be not rendered): sets value if passed,
   *  otherwise asks it (`ask` or dropdown) or toggles format
   * @example
   * el.$format("bold"); // toggles bold
   * el.$format("header", 2); // sets heading 2
   * el.$format("link"); // asks url via popup
   * el.$format("link", "https://example.com"); // wraps selection into link
   * el.$format("header"); // asks value via dropdown near selection */
  $format<K extends keyof WUP.TextRich.ToolValues>(name: K, value?: WUP.TextRich.ToolValues[K]): void {
    this.applyFormat(name, value, value !== undefined);
  }

  /** Applies tool to selection; asks value if it's missing (via `ask` or dropdown);
   *  inline format with collapsed selection is pending for the next typed text (like quill)
   * @param isSet set value (dropdown item, asked value etc.), otherwise toggle format (button)
   * @param target element to place popup near (clicked embed) */
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
    const tool = this.#tools[name];
    const f = this.getFormats();
    if (value === undefined && (tool.ask || tool.values)) {
      // restore by positions: focus can move out (to modal etc.) & nodes can be re-rendered
      const pos = this.getSelectionPos();
      (tool.ask
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
    const v = value ?? true; // tool without values
    if (sel.isCollapsed && ((tool.kind === "inline" && !tool.ask && !tool.trigger) || name === "clean")) {
      // pending format for the next typed text (Ctrl+B and type)
      const p = this.#pending;
      if (name === "clean") {
        Object.entries(this.#tools).forEach(
          ([k, t]) => t.kind === "inline" && !t.ask && !t.trigger && f.has(k) && p.set(k, false)
        );
      } else {
        const isOff = !v || (!isSet && isMatch(f.get(name), v)); // toggle
        p.set(name, !isOff && v);
      }
      this.#pendingAt = [sel.anchorNode!, sel.anchorOffset];
      this.refreshToolbar();
    } else {
      this.changeContent(() => this.formatSelection(tool, v, !!isSet));
    }
  }

  /** $insert placed caret: formatSelection doesn't restore selection */
  #isInserted = false;

  /** Applies `format` of tool or default one & restores selection by positions (format can move or split nodes);
   *  then joins split text nodes & removes empty `style` attributes */
  protected formatSelection(tool: WUP.TextRich.Tool, value: unknown, isSet: boolean): void {
    const pos = this.getSelectionPos();
    this.#isInserted = false;
    const range = window.getSelection()!.getRangeAt(0); // after getSelectionPos: it wraps lines
    const editor: HTMLElement = this.$refInput;
    let lines = tool.format && linesOf(range, editor); // before custom format: it can move range
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
    editor.normalize();
    editor.querySelectorAll("[style='']").forEach((el) => el.removeAttribute("style"));
    !this.#isInserted && this.setSelectionPos(pos);
  }

  /** Creates token (placeholder, mention): `{firstName}`, `@john` */
  protected createToken(tool: WUP.TextRich.Tool, value: unknown): HTMLElement {
    const el = createOf(tool, value);
    el.textContent = tool.trigger! + value + (this.#ctr.$wrapChars.get(tool.trigger!) ?? "");
    return el;
  }

  /** Applies default format by `kind`: sets value if `isSet`, otherwise toggles format */
  protected formatByKind(ctx: WUP.TextRich.FormatContext): void {
    const { tool, value, isSet, editor } = ctx; // lines & texts are lazy: read below only where needed
    switch (tool.kind) {
      case "inline": {
        if (tool.trigger && isSet && value !== false) {
          // token replaces selection or token around caret
          const cur = formatParents(ctx.range.startContainer, isOf(tool), editor)[0];
          cur && selectNode(cur);
          this.$insert(this.createToken(tool, value));
          break;
        }
        const { texts } = ctx;
        const any = isOf(tool);
        const f = isOf(tool, value);
        const create = (): HTMLElement => createOf(tool, value);
        if (isSet || !value) {
          removeInline(texts, any, editor);
          value && addInline(texts, f, create, editor);
        } else {
          // single value only: remove other values (sub vs super)
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
            // new element: otherwise <div> keeps attributes of format (class etc.)
            setLineTag(l, isOff ? document.createElement("div") : createOf(tool, value));
          } else {
            tool.set!(l, isOff ? undefined : value);
          }
        });
        break;
      }
      case "embed":
        this.$insert(createOf(tool, value)); // caret goes after it
        break;
      default: // action
    }
  }

  /** Runs custom change of editor: saves history, updates $value & toolbar */
  protected changeContent(fn: () => void): void {
    const inp = this.$refInput as unknown as WUPTextRichInput;
    const h = this._refHistory;
    const prev = inp.value;
    // otherwise history saves selection after changes (wrong for insertion)
    const isState = h && !h._stateBeforeInput;
    isState && (h._stateBeforeInput = h.inputState);
    fn();
    inp._cached = undefined;
    if (inp.value !== prev) {
      h?.save(prev, inp.value);
      inp._keepCache = true; // value is sanitized already: skip it on input
      this.fireInput();
    } else if (isState) {
      h._stateBeforeInput = undefined;
    }
    this.refreshToolbar();
  }

  /** Pending formats for the next typed text: tool => value (`false` removes format) */
  #pending = new Map<string, unknown>();
  /** Caret position of pending formats: they're reset when caret moves */
  #pendingAt?: [Node, number];

  /** Inserts text typed at token edge outside it: otherwise browser extends token (`{firstName}x`)
   * @returns false if caret isn't at token edge */
  protected insertOutOfToken(text: string): boolean {
    const sel = window.getSelection()!;
    const n = sel.focusNode;
    if (!sel.isCollapsed || !n) {
      return false;
    }
    const tools = Object.values(this.#tools);
    const isToken = (el: Element): boolean =>
      tools.some((t) => t.kind === "inline" && t.trigger && t.is?.(el as HTMLElement) !== undefined);
    const off = sel.focusOffset;
    const kids = n.childNodes;
    // caret inside token (the outer one) or next to it (after insertion): browser types into the previous node
    const el =
      formatParents(n, isToken, this.$refInput).pop() ??
      [kids[off - 1], kids[off]].find((x): x is Element => x instanceof Element && isToken(x));
    if (!el) {
      return false;
    }
    const isStart = !textAt(el, n, off, true);
    if (!isStart && textAt(el, n, off)) {
      return false; // caret in the middle: edit token text
    }
    const t = document.createTextNode(text);
    isStart ? el.before(t) : el.after(t);
    sel.collapse(t, t.length);
    return true;
  }

  /** Returns inline formats (except tokens) whose elements end at caret */
  protected formatsAtEnd(): string[] {
    const sel = window.getSelection()!;
    const n = sel.focusNode;
    if (!sel.isCollapsed || !n) {
      return [];
    }
    return Object.entries(this.#tools)
      .filter(([, t]) => {
        const el = t.kind === "inline" && !t.trigger && formatParents(n, isOf(t), this.$refInput).pop(); // the outer one
        return el && !textAt(el, n, sel.focusOffset);
      })
      .map(([name]) => name);
  }

  /** ArrowRight/ArrowLeft at the end of formatted element: the next typed text goes out of it / back into it (caret stays)
   * @returns false if there is nothing to leave/return */
  protected leaveFormats(isLeave: boolean): boolean {
    const p = this.#pending;
    const arr = this.formatsAtEnd().filter((k) => (p.get(k) === false) !== isLeave);
    if (!arr.length) {
      return false;
    }
    const sel = window.getSelection()!;
    arr.forEach((k) => (isLeave ? p.set(k, false) : p.delete(k)));
    this.#pendingAt = [sel.anchorNode!, sel.anchorOffset];
    this.refreshToolbar();
    return true;
  }

  /** Inserts typed text with formats shown by toolbar: pending ones or of elements ending at caret
   *  (otherwise Chrome types after link)
   * @returns false if browser can insert it as usual */
  protected insertTyped(text: string): boolean {
    const sel = window.getSelection()!;
    if (!this.#pending.size) {
      const isEnd = !!this.formatsAtEnd().length;
      isEnd && sel.collapse(...insertText(sel.focusNode!, sel.focusOffset, text));
      return isEnd;
    }
    const inp = this.$refInput;
    const tools = this.#tools;
    const r = sel.getRangeAt(0);
    r.deleteContents();
    const isEmbed = embedOf(tools);
    // move caret out of elements of removed/changed formats (`true` - added toggle format)
    this.#pending.forEach((v, k) => {
      const el = v !== true && formatParents(r.startContainer, isOf(tools[k]), inp).pop(); // the outer one
      el && splitAt(el, r, isEmbed);
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
    return true;
  }

  /** Wraps selection into typed char & its pair (see $wrapChars), keeps content selected;
   *  edge whitespaces stay outside (double click on Windows selects trailing space, triple click - line break)
   * @returns false if char has no pair or selection has no visible content */
  protected wrapSelection(open: string): boolean {
    const close = this.#ctr.$wrapChars.get(open);
    const sel = window.getSelection()!;
    if (sel.isCollapsed || !close) {
      return false;
    }
    const r = sel.getRangeAt(0);
    const isEmbed = embedOf(this.#tools);
    const inner = document.createRange(); // from the 1st visible char (or embed) to the last one
    const w = document.createTreeWalker(r.commonAncestorContainer, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n: Node | null = w.currentNode; n; n = w.nextNode()) {
      if (!intersects(r, n)) {
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
      insertText(inner.endContainer, inner.endOffset, close);
      inner.setStart(...insertText(startContainer, startOffset, open));
      selectRange(inner);
    });
    return true;
  }

  /** Returns selection (anchor & focus) as char offsets (line break & embed = 1 char): valid even if nodes are re-rendered;
   *  wraps loose inline content into lines at first (Chrome doesn't wrap the 1st line: `abc<div>def</div>`, `<div><br></div>abc`) */
  protected getSelectionPos(): [number, number] {
    const inp = this.$refInput;
    const sel = window.getSelection()!;
    // (editor, index) => (child, 0), the end of editor => the end of the last child:
    // otherwise index is wrong after wrapping (or out of editor: IndexSizeError)
    const childPos = (n: Node, offset: number): [Node, number] => {
      const c = n === inp && (inp.childNodes[offset] ?? inp.lastChild);
      if (!c) {
        return [n, offset];
      }
      return c === inp.childNodes[offset]
        ? [c, 0]
        : [c, c.nodeType === Node.TEXT_NODE ? (c as Text).length : c.childNodes.length];
    };
    const [an, ao] = childPos(sel.anchorNode!, sel.anchorOffset);
    const [fn1, fo] = childPos(sel.focusNode!, sel.focusOffset);
    // again after wrapping: empty editor gets the 1st line (caret goes into it)
    wrapLines(inp) && sel.setBaseAndExtent(...childPos(an, ao), ...childPos(fn1, fo));
    const isEmbed = embedOf(this.#tools);
    return [
      charsBefore(inp, sel.anchorNode!, sel.anchorOffset, isEmbed),
      charsBefore(inp, sel.focusNode!, sel.focusOffset, isEmbed),
    ];
  }

  /** Sets selection by char offsets (see getSelectionPos) */
  protected setSelectionPos([a, f]: [number, number]): void {
    const inp = this.$refInput;
    const isEmbed = embedOf(this.#tools);
    window.getSelection()!.setBaseAndExtent(...pointAt(inp, a, isEmbed), ...pointAt(inp, f, isEmbed));
  }

  /** Opened popup: $ask or dropdown menu */
  #ask?: TextRichAsk;
  #hoverTimer?: ReturnType<typeof setTimeout>;
  /** Hovered element with popup (see hoverOf): reset on popup close, so pointer move hovers it again
   *  (but not a stationary pointer: embed chosen via menu is a new element under it) */
  #under?: HTMLElement | null;

  /** Asks value via popup with text control near target (link url etc.):
   *  Enter submits, Escape or blur cancels (`null`); Enter/Escape return focus & selection to editor
   * @param target element to place popup near (ex. tool button)
   * @param value initial value
   * @param opts options of text control: label, validations etc.
   * @param hovered element edited via hover popup (link): text control isn't focused, popup closes on pointer leave,
   * clearing value resolves `""` (to remove link)
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

  /** Opens popup instead of the current one
   * @returns asked value or `null` if canceled */
  protected openAsk<T>(a: TextRichAsk): Promise<T | null> {
    this.#ask?.done();
    return new Promise((resolve) => {
      a.onClose = (v, isBack) => {
        this.#ask = undefined;
        this.#under = undefined;
        clearTimeout(this.#hoverTimer);
        isBack && this.restoreSelection(); // otherwise user moves focus
        resolve(v);
      };
      a.popup.onpointerenter = () => this.#ask?.hovered && this.gotHover(this.#ask.hovered);
      a.popup.onpointerleave = (e) => e.pointerType !== "touch" && this.gotHover(null); // touch leaves right after tap
      this.#ask = a;
      a.open(this);
    });
  }

  /** Asks link url via $ask: `hovered` - hovered link (empty url removes it) */
  protected askLink(target: HTMLElement, url: string, hovered?: HTMLElement): Promise<string | null> {
    const { $textLink, $errorLink } = this.#ctr;
    const validations = { required: !hovered, url: (v?: string) => !!v && !sanitizeUrl(v) && $errorLink };
    return this.$ask(target, url, { label: $textLink, validations }, hovered);
  }

  /** Asks tool value via its dropdown menu near target: focus stays in editor (or dropdown), menu is closed on selection change
   * @param target embed, token, dropdown or range (selection, typed trigger)
   * @param isHover opened by hover: closes on pointer leave, ignores keys (except Escape) & selection
   * @param onSelect called on selection change instead of closing: to filter by typed text etc.
   * @returns chosen value or `null` if canceled or tool isn't rendered as dropdown */
  protected askMenu(
    name: string,
    target: HTMLElement | Range,
    isHover?: boolean,
    onSelect?: (m: TextRichMenu) => void
  ): Promise<unknown> {
    const b = this.findTool(name);
    if (!b?._values) {
      return Promise.resolve(null);
    }
    const tool = this.#tools[name];
    const m = new TextRichMenu({
      button: b,
      owner: isHover ? null : (document.activeElement === b && b) || this.$refInput,
      target,
      values: b._values,
      selected: isHover ? tool.is?.(target as HTMLElement) : this.getFormats().get(name) ?? false,
      render: (li, v) => this.renderItem(li, tool, v),
    });
    if (!isHover) {
      const sel = window.getSelection()!;
      const pos = (): unknown[] => [sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset];
      const at = pos();
      m.onSelect = () => (onSelect ? onSelect(m) : pos().some((v, i) => v !== at[i]) && m.done());
    }
    return this.openAsk(m);
  }

  /** Called on typing: typed `trigger` opens tool dropdown; chosen value replaces trigger & text typed after it */
  protected gotTrigger(): void {
    const sel = window.getSelection()!;
    const n = sel.focusNode as Text | null;
    if (!sel.isCollapsed || n?.nodeType !== Node.TEXT_NODE) {
      return;
    }
    const s = n.data.slice(0, sel.focusOffset);
    const found = Object.entries(this.#tools).find(([, t]) => t.trigger && s.endsWith(t.trigger));
    if (found) {
      const [name, tool] = found;
      const tr = tool.trigger!;
      const r = document.createRange(); // typed trigger (live range: typing after it doesn't extend it)
      r.setStart(n, s.length - tr.length);
      r.setEnd(n, s.length);
      // filter by text typed after trigger; close if caret leaves it, whitespace is typed or nothing matches
      this.askMenu(name, r, false, (m) => {
        const typed = document.createRange(); // from trigger to caret (collapsed if caret is before trigger)
        typed.setStart(r.startContainer, r.startOffset);
        sel.isCollapsed && this.$refInput.contains(sel.focusNode) && typed.setEnd(sel.focusNode!, sel.focusOffset);
        const str = typed.toString();
        const q = str.startsWith(tr) && !/\s/.test(str) && str.slice(tr.length).toLowerCase();
        // label or value contains typed text: `{name` & `{firstName` show `First Name`
        const has = (x: string): boolean => x.toLowerCase().includes(q as string);
        (q === false || !m.filter((v) => has(labelOf(v)) || has(String(v.value)))) && m.done();
      }).then((v) => {
        if (v != null) {
          // select typed text: embed & token replace it, line formats delete it at first, action gets it selected
          sel.setBaseAndExtent(r.startContainer, r.startOffset, sel.focusNode!, sel.focusOffset);
          const isLine = tool.kind === "line" || tool.kind === "lineStyle";
          isLine && this.changeContent(() => sel.getRangeAt(0).deleteContents());
          this.applyFormat(name, v, true);
        }
      });
    }
  }

  /** Called before typing: typed pair of trigger (see $wrapChars) turns typed text into token even if it isn't in values
   *  (`{someProp` + `}` gives placeholder `someProp`) unless `is` rejects it
   * @returns false if typed text isn't token */
  protected gotTokenEnd(data: string): boolean {
    const sel = window.getSelection()!;
    const n = sel.focusNode as Text | null;
    if (!sel.isCollapsed || n?.nodeType !== Node.TEXT_NODE) {
      return false;
    }
    const s = n.data.slice(0, sel.focusOffset) + data;
    let typed: string | undefined;
    const found = Object.entries(this.#tools).find(([k, t]) => {
      const tr = t.kind === "inline" && t.trigger;
      typed = tr ? typedValue(s, tr, this.#ctr.$wrapChars.get(tr)) : undefined;
      // `is` can reject value: unknown placeholder etc.
      return typed && this.findTool(k) && t.is?.(this.createToken(t, typed)) !== undefined;
    });
    if (!found) {
      return false;
    }
    const [name, tool] = found;
    this.#ask?.done(); // trigger menu
    sel.setBaseAndExtent(n, sel.focusOffset - typed!.length - tool.trigger!.length, n, sel.focusOffset);
    this.applyFormat(name, typed, true); // separate undo step
    return true;
  }

  /** Returns tool name if element is its embed or token & it's editable (tool is rendered):
   *  via `ask` on click or via dropdown on hover (`isHover`) */
  protected embedTool(el: Element, isHover?: boolean): string | undefined {
    const [name, t] =
      Object.entries(this.#tools).find(
        ([, x]) => (x.kind === "embed" || (x.kind === "inline" && x.trigger)) && x.is?.(el as HTMLElement) !== undefined
      ) ?? [];
    const can = t && !this.$isReadOnly && !this.$isDisabled && (!isHover || !t.ask) && this.findTool(name!);
    return can ? name : undefined;
  }

  /** Returns element with hover popup under pointer: embed, token or link */
  protected hoverOf(t: Element): HTMLElement | null {
    return this.embedTool(t, true) ? (t as HTMLElement) : t.closest("a");
  }

  /** Called when pointer enters element with hover popup (see hoverOf) or its popup, or leaves them (`el` is `null`):
   *  opens/closes popup with delay (not while user edits value) */
  protected gotHover(el: HTMLElement | null): void {
    const l = this.#ask;
    if (l && (!l.hovered || l.popup.contains(document.activeElement))) {
      return; // popup isn't opened by hover or user edits value
    }
    clearTimeout(this.#hoverTimer);
    if (el === (l?.hovered ?? null)) {
      return; // pointer moves between element & popup
    }
    const { hoverOpenTimeout, hoverCloseTimeout } = WUPPopupElement.$defaults;
    this.#hoverTimer = setTimeout(
      () => (el?.isConnected ? this.askHover(el) : this.#ask?.done()),
      el ? hoverOpenTimeout : hoverCloseTimeout
    );
  }

  /** Opens hover popup: dropdown of embed/token (chosen value replaces it) or link url */
  protected askHover(el: HTMLElement): void {
    const name = this.embedTool(el, true);
    if (name) {
      this.askMenu(name, el, true).then((v) => {
        if (v != null && el.isConnected) {
          this.$refInput.focus({ preventScroll: true }); // otherwise control restores previous selection
          selectNode(el);
          this.applyFormat(name, v, true); // replaces element, caret goes after it
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

  /** Replaces selection with node & places caret after it: use it in `Tool.format` to insert content */
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

  /** Replaces selection with sanitized html: blocks split the current line at caret */
  protected insertHTML(html: string): void {
    const f = htmlToEditor(html, this.#tools);
    const inp = this.$refInput;
    const sel = window.getSelection()!;
    this.getSelectionPos(); // wraps loose content: otherwise caret at editor root has no line
    this.deleteLines(sel.getRangeAt(0)) || sel.getRangeAt(0).deleteContents(); // the rest of the last line joins the 1st one
    const r = sel.getRangeAt(0);
    const line = getLines(inp).findLast((l) => l.contains(r.startContainer));
    const first = f.firstElementChild;
    if (!first) {
      return;
    }
    if ((f.childNodes.length === 1 && first.tagName === "DIV") || !line || line.tagName === "LI") {
      // inline content: lines are separated by <br>
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
    splitAt(line, r, embedOf(this.#tools)); // empty parts are removed
    r.insertNode(f);
    window.getSelection()!.collapse(last, last.childNodes.length);
  }

  /** Deletes range across lines instead of browser (it wraps moved content into `<span style>`):
   *  the rest of the last line joins the 1st one; if the 1st line is deleted from its start, the last line keeps its tag
   *  (triple click on heading + Delete doesn't turn the next paragraph into heading);
   *  if everything is deleted, the empty line becomes a plain paragraph
   * @returns false if range is in a single line or nested lists are involved (browser deletes it) */
  protected deleteLines(sr: AbstractRange | undefined): boolean {
    const inp = this.$refInput;
    const lines = getLines(inp);
    const lineAt = (n: Node): HTMLElement | undefined => lines.findLast((l) => l.contains(n));
    const a = sr && lineAt(sr.startContainer);
    const b = sr && lineAt(sr.endContainer);
    if (!a || !b || a === b || a.contains(b) || b.parentElement!.closest("li")) {
      return false;
    }
    const isEmbed = embedOf(this.#tools);
    const pos = charsBefore(inp, sr.startContainer, sr.startOffset, isEmbed);
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
      listTags.has(list.tagName) && !list.firstElementChild && list.remove();
    };
    if (isKeep) {
      if (!isRest) {
        // everything is deleted: plain paragraph without leftovers
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

  /** Fires `input` to update $value after custom changes */
  protected fireInput(): void {
    this.$refInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }

  protected gotToolbarClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest("[tool]") as ToolElement | null;
    if (el?._format) {
      const l = this.#ask;
      l?.done();
      !(el._values && l?.popup.$options.target === el) && this.applyTool(el); // click on dropdown toggles its menu
    }
  }

  /** Toolbar keys: Arrows/Home/End - navigate, Esc - back to editor, ArrowDown/ArrowUp - open dropdown
   * @returns true if key is handled */
  protected gotToolbarKey(e: KeyboardEvent): boolean {
    const el = e.target as ToolElement;
    const k = e.key;
    if ((k === "ArrowDown" || k === "ArrowUp") && el._values) {
      this.applyTool(el); // otherwise page is scrolled
    } else if (k === "Escape") {
      this.restoreSelection(); // otherwise value is cleared
    } else if (k === "ArrowLeft" || k === "ArrowRight" || k === "Home" || k === "End") {
      const arr = Array.from(this.$refToolbar.querySelectorAll<HTMLElement>("[role=group] > button"));
      const i = arr.indexOf(el);
      arr.at({ Home: 0, End: -1, ArrowLeft: i - 1, ArrowRight: (i + 1) % arr.length }[k])!.focus(); // Arrows cycle
    } else {
      return false;
    }
    return true;
  }

  protected override gotFocus(ev: FocusEvent): Array<() => void> {
    const arr = super.gotFocus(ev);
    const onSelect = (): void => {
      const sel = window.getSelection();
      if (sel?.rangeCount && this.$refInput.contains(sel.getRangeAt(0).startContainer)) {
        this.#range = sel.getRangeAt(0).cloneRange();
        const p = this.#pendingAt;
        p && (sel.anchorNode !== p[0] || sel.anchorOffset !== p[1]) && this.#pending.clear(); // caret moved
        this.refreshToolbar();
        this.#ask?.onSelect?.(); // filter or close menu
      }
    };
    onSelect();
    arr.push(this.appendEvent(document, "selectionchange", onSelect));
    return arr;
  }

  protected override gotFocusLost(): void {
    super.gotFocusLost();
    const l = this.#ask;
    // hover/tap popup & menu (focus stays in editor)
    (l?.hovered || l?.onKey) && l.done();
    this.#range = undefined;
    this.#pending.clear();
    this.refreshToolbar(new Map());
  }

  /** Returns rendered button or dropdown by key `name` or `name:value` */
  protected findTool(key: string): ToolElement | null {
    return this.$refToolbar.querySelector(`[tool="${key}"]`);
  }

  /** Applies rendered button or dropdown item by key `name` or `name:value`
   * @returns false if it isn't rendered */
  protected applyKey(key: string): boolean {
    const el = this.findTool(key);
    if (el) {
      el._format ? this.applyTool(el) : el.click(); // clear button isn't ToolElement
      return true;
    }
    const [name, v] = key.split(":");
    const item = this.findTool(name)?._values?.find((x) => `${x.value}` === v);
    item && this.applyFormat(name, item.value, true);
    return !!item;
  }

  /** Applies tool by its `hotKey` (if tool is rendered)
   * @returns true if event must be prevented */
  protected gotHotKey(e: KeyboardEvent): boolean {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    // AltGr (= Ctrl+Alt on Windows) types chars in some keyboard layouts
    if ((!mod && !e.altKey) || (isMac ? e.ctrlKey : e.metaKey) || e.getModifierState("AltGraph")) {
      return false;
    }
    const key = (codeKeys[e.code as keyof typeof codeKeys] ?? e.code.replace(/^(Key|Digit)/, "")).toUpperCase();
    /** Returns index of matched shortcut or `-1` */
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
    const found = Object.entries(this.#tools).find(
      ([, t]) => match(t.hotKey) !== -1 || t.values?.some((v) => match(v.hotKey) !== -1)
    );
    if (!found) {
      return mod && !e.altKey && !e.shiftKey && browserHotKeys.has(e.code); // block browser formatting
    }
    const [name, tool] = found;
    const i = match(tool.hotKey);
    const val = i === -1 ? tool.values!.find((v) => match(v.hotKey) !== -1) : undefined;
    if (!tool.values || val) {
      return this.applyKey(val ? `${name}:${val.value}` : name); // not rendered: browser handles shortcut
    }
    // tool shortcut: the 1st one selects the previous rendered value (bigger font), the 2nd one - the next value
    const { values } = tool;
    const items = this.findTool(name)?._values;
    const isRendered = (v: WUP.TextRich.ToolValue): boolean =>
      !!this.findTool(`${name}:${v.value}`) || !!items?.some((x) => x.value === v.value);
    if (!values.some(isRendered)) {
      return false;
    }
    const cur = this.getFormats().get(name) ?? false;
    const at = values.findIndex((v) => v.value === cur);
    const next = (i ? values.slice(at + 1) : values.slice(0, at < 0 ? undefined : at).reverse()).find(isRendered);
    next && this.applyFormat(name, next.value, true);
    return true;
  }

  protected override gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    const t = e.target as Node;
    const isInp = t === this.$refInput;
    const isBar = this.$refToolbar.contains(t);
    const l = this.#ask;
    const k = e.key;
    const isMod = e.altKey || e.ctrlKey || e.metaKey;
    const isArrow = !isMod && !e.shiftKey && (k === "ArrowRight" || k === "ArrowLeft");
    if (
      ((isInp || isBar) && this.gotHotKey(e)) || // not for control in link popup
      // menu keys: otherwise caret moves, line is added, button is clicked etc.
      ((isInp || isBar) && l?.onKey?.(e)) ||
      (isBar && !isMod && this.gotToolbarKey(e)) ||
      // the 1st ArrowRight moves caret to the end of format (bold, link), the 2nd one - out of it (caret stays visually)
      (isInp && isArrow && this.leaveFormats(k === "ArrowRight"))
    ) {
      e.preventDefault();
    } else if (k === "Escape" && l?.hovered) {
      e.preventDefault(); // closes hover popup instead of clearing value
      l.done();
    } else {
      super.gotKeyDown(e);
    }
  }

  protected override gotBeforeInput(e: WUP.Text.GotInputEvent): void {
    const t = e.inputType;
    if (t.startsWith("format")) {
      e.preventDefault(); // browser formatting (Safari, iOS menus) => custom one: to keep history
      // formatBold => bold, formatJustifyCenter => align:center etc.; color, font etc. aren't supported
      const f = t.slice(6).toLowerCase();
      const k =
        (f === "justifyfull" && "align:justify") ||
        (f === "justifyleft" && "align:false") ||
        (f.startsWith("justify") && `align:${f.slice(7)}`) || // center, right
        (f.endsWith("script") && `script:${f.slice(0, -6)}`) || // superscript, subscript
        (f.endsWith("dent") && `indent:${f === "indent" ? 1 : -1}`) || // indent, outdent
        (f === "remove" && "clean") ||
        f.replace("strikethrough", "strike"); // bold, italic, underline
      this.applyKey(k); // rendered tools only
      return;
    }
    super.gotBeforeInput(e); // undo/redo & state before changes
    if (e.defaultPrevented) {
      return;
    }
    const s = t === "insertText" && e.data;
    if (s && (this.wrapSelection(s) || this.gotTokenEnd(s))) {
      e.preventDefault(); // done via changeContent: separate undo step
      return;
    }
    const isPaste = t === "insertFromPaste" || t === "insertFromPasteAsQuotation" || t === "insertFromDrop";
    const html = isPaste && e.dataTransfer?.getData("text/html");
    if (html) {
      // sanitized: otherwise browser pastes anything (images, colors etc.)
      e.preventDefault();
      const [r] = e.getTargetRanges();
      this.$refInput.focus({ preventScroll: true });
      r && selectRange(r);
      this.insertHTML(html);
    } else if (
      (s && (this.insertOutOfToken(s) || this.insertTyped(s))) ||
      (t.startsWith("delete") && this.deleteLines(e.getTargetRanges()[0]))
    ) {
      e.preventDefault();
    } else {
      return;
    }
    this.fireInput(); // saves history by state before changes
    s && this.gotTrigger(); // fired input has no inputType: gotInput skips it
  }

  protected override createHistory(): TextHistory {
    return new TextRichHistory(this.$refInput);
  }

  protected override gotInput(e: WUP.Text.GotInputEvent): void {
    super.gotInput(e);
    e.inputType === "insertText" && this.gotTrigger();
  }

  protected override setClearState(): ValueType | undefined {
    const b = this.$refBtnClear;
    const was = b?.getAttribute("clear");
    const next = super.setClearState(); // called on every change: relabel only if state is changed
    b?.getAttribute("clear") !== was && this.setClearLabel(b!); // without button both are undefined
    return next;
  }
}

customElements.define(tagName, WUPTextRichControl);
