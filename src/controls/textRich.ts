import { inheritDefaults } from "../baseElement";
import WUPDropdownElement from "../dropdownElement";
import onEvent from "../helpers/onEvent";
import WUPPopupElement from "../popup/popupElement";
import { PopupOpenCases } from "../popup/popupElement.types";
import { useTooltipOnce } from "../popup/popupTooltip";
import { SetValueReasons, ValidationCases } from "./baseControl";
import WUPTextControl from "./text";
import TextHistory from "./text.history";
import WUPTextAreaControl from "./textArea";
import WUPTextRichInput, {
  embedOf,
  fontSizes,
  htmlToEditor,
  htmlToValue,
  htmlToText,
  isBlockTag,
  listTags,
  sanitizeUrl,
  sizeFormats,
  sizes,
  textAligns,
} from "./textRich.input";
import TextRichHistory from "./textRich.history";
import {
  addInline,
  formatParents,
  fromLinePos,
  getLines,
  InlineFormat,
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
WUPDropdownElement.$use();

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
     * WUPTextRichControl.$tools.upper = { label: "Uppercase", format: (r) => ... };
     * el.$options.toolbar = [["bold", "upper"], ["color"]]; */
    interface ToolValues {
      bold: true;
      italic: true;
      underline: true;
      strike: true;
      // todo add quote - suggest similar icon as blockquote - probably different look of this char: "
      blockquote: true;
      "code-block": true;
      /** Url of link: it's asked via popup */
      link: string;
      /** Removes formatting of selected text */
      "clean-format": true;
      /** Button clear of other controls ($refBtnClear): it's rendered if `$options.clearButton` is true
       *  and works according to `$options.clearActions` (the same as Esc) */
      clear: true;
      /** Heading level; `false` - normal paragraph */
      header: 1 | 2 | 3 | 4 | 5 | 6 | false;
      /** Numbered or bulleted list */
      list: "ordered" | "bullet";
      /** Subscript or superscript */
      script: "sub" | "super";
      /** Decrease (`-1`) or increase (`+1`) indentation */
      indent: -1 | 1;
      /** Font size: `"sm"` - small, `"lg"` - large, `"hg"` - huge; `false` - default */
      size: "sm" | "lg" | "hg" | false;
      /** Text alignment; `"left"` - default */
      align: "left" | "center" | "right" | "justify";
    }
    /** Value of tool: button or item of dropdown (see Tool.values) */
    interface ToolValue<V = any> {
      /** Value applied by tool (ex. `1` for `header`) */
      value: V;
      /** `aria-label` & tooltip of button or text of dropdown item; @defaultValue `String(value)` */
      label?: string;
      /** Keyboard shortcut to apply value (see Tool.hotKey) */
      hotKey?: string;
      /** Icon: css image (`url("data:image/svg+xml,...")` or `var(--wup-icon-...)`);
       *  dropdown with icons shows icon of the current value & labels in tooltips */
      icon?: string;
    }
    /** Tool of toolbar
     * @tutorial Rules
     * * tool without values is rendered as button: it's pressed when format is applied (see `is`), otherwise it's action
     * * tool with values is rendered as dropdown (see `dropdown`) or as button per value
     * * format is applied via `format` or default one according to `kind`: dropdown sets selected value (`false` removes format),
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
       * * `clear`: Escape clears value according to $options.clearActions (the same as in other controls) */
      hotKey?: string;
      /** Icon of button: css image (`url("data:image/svg+xml,...")` or `var(--wup-icon-...)`) set as css-var `--icon-img`;
       *  otherwise point it via css: `wup-textrich [tool="upper"] { --icon-img: url(...) }` */
      icon?: string;
      /** Values used when toolbar item is pointed as string (`"header"` is the same as `{ header: [1, 2, 3, 4, 5, 6, false] }`) */
      values?: ToolValue<V>[];
      /** Values are rendered as dropdown (otherwise as button per value) */
      dropdown?: boolean;
      /** Value of dropdown when format isn't applied (ex. `false` for `header`: Normal) */
      default?: V;
      /** Kind of format: defines default `format`, detection via `is`, sanitizing & behavior of collapsed selection
       * * `inline` - element wraps text (`<b>`, `<a>`, `<span style>`): with collapsed selection format is applied to the next typed text
       * (if tool doesn't have `ask`); it's removed by `clean-format`
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
       *  item of dropdown shows label inside it (ex. heading as preview) */
      create?: (value: V) => HTMLElement;
      /** Sets value of format to line (`undefined` removes it): used by default format & sanitizer of `lineStyle`;
       *  WARN: line replaced via format `line` (heading etc.) keeps only `style`, so use style properties instead of attributes */
      set?: (el: HTMLElement, value: V | undefined) => void;
      /** Asks value via own UI (popup, modal etc.) when tool is applied without value (button or keyboard shortcut of tool without values):
       *  format is applied with resolved value (`null` or `undefined` cancels it);
       *  selection is restored even if focus is moved out of control (to modal etc.)
       * @param target element to place popup near it: button of tool or editor (if tool isn't rendered)
       * @param current value of format applied at the start of selection
       * @see {@link WUPTextRichControl.$ask} - popup with text control */
      ask?: (
        target: HTMLElement,
        control: WUPTextRichControl<any, any, any>,
        current: V | undefined
      ) => Promise<V | null | undefined>;
      /** Renders custom content of dropdown item instead of label (color swatch etc.): label is used as `aria-label` */
      renderItem?: (li: HTMLLIElement, value: V) => void;
      /** Applies format to selected range instead of default one (see `kind`): control saves changes in history,
       *  restores selection (use `control.$insert` to insert content & place caret after it), updates $value & toolbar;
       *  `value` is `true` for tool without values */
      format?: (r: Range, value: V, control: WUPTextRichControl<any, any, any>) => void;
    }
    /** Tools of toolbar
     * @see {@link Tool} */
    type Tools = { [K in keyof ToolValues]: Tool<ToolValues[K]> } & {
      /** Button clear: `labelBack` is label when the next clearing restores previous value (see $options.clearActions) */
      clear: { labelBack: string };
    };
    /** Toolbar item: tool `"bold"`, tool with every value `"header"` (the same as `{ header: [1, 2, 3, 4, 5, 6, false] }`)
     *  or tool with pointed values `{ header: [1, 2, false] }` */
    type ToolbarItem =
      | keyof ToolValues
      | {
          [K in keyof ToolValues]: ToolValues[K] extends true ? never : { [P in K]: ToolValues[P][] };
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
       *   ["header"], // tool with every value
       *   [{ size: ["sm", false, "lg"] }], // tool with pointed values only
       *   ["clean-format"], // removes formatting
       *   ["clear"], // clears value: button clear (if $options.clearButton is true)
       * ]
       * @defaultValue every built-in tool */
      toolbar: ToolbarGroup[];
      /** Hide keyboard shortcuts in tooltips of toolbar buttons (`Bold (Ctrl+B)` => `Bold`) & in items of dropdowns;
       *  `aria-keyshortcuts` is set anyway
       * @see {@link WUP.TextRich.Tool.hotKey}
       * @defaultValue false */
      hideHotKeysHint: boolean;
      // classNames: { bold: ".wup-bold", toolbar?: string | bool | null }; // todo implement this so if pointed className then it must be applied to relevant block, for toolbar expected string=> another classname, and if NOT (false or null) => use same className to related toolbar item
    }
    interface Options<T = string, VM = ValidityMap> extends WUP.TextArea.Options<T, VM>, NewOptions {}
    interface JSXProps<C = WUPTextRichControl> extends WUP.TextArea.JSXProps<C>, WUP.Base.OnlyNames<NewOptions> {
      /** Global reference to object with array
       * @see {@link ToolbarGroup}
       * @example
       * ```js
       * window.myToolbar = [["bold", "italic"], ["clean-format", "clear"]];
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

/** Toolbar button or item of dropdown that applies format on click: `_value` - value of format (ex. `"ordered"` for list) */
type ToolElement = HTMLElement & { _format: string; _value?: unknown };

/** Formats by tagName of element: [tool, value] */
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
  ["BLOCKQUOTE", ["blockquote", true]],
  ["PRE", ["code-block", true]],
  ["OL", ["list", "ordered"]],
  ["UL", ["list", "bullet"]],
]);
/** Returns `is` of tool: value of format applied via element by its tagName (see tagFormats) */
const byTag =
  (tool: string) =>
  (el: Element): any => {
    const f = tagFormats.get(el.tagName);
    return f?.[0] === tool ? f[1] : undefined;
  };
/** Formatting via browser (keyboard shortcuts etc.): `beforeinput.inputType` => tool; other `format...` are prevented */
const formatInputs = new Map<string, string>([
  ["formatBold", "bold"],
  ["formatItalic", "italic"],
  ["formatUnderline", "underline"],
  ["formatStrikeThrough", "strike"],
  ["formatSuperscript", "script:super"],
  ["formatSubscript", "script:sub"],
  ["formatJustifyFull", "align:justify"],
  ["formatJustifyCenter", "align:center"],
  ["formatJustifyRight", "align:right"],
  ["formatJustifyLeft", "align:left"],
  ["formatIndent", "indent:1"],
  ["formatOutdent", "indent:-1"],
  ["formatRemove", "clean-format"],
]);
/** Command key is Cmd instead of Ctrl (iPadOS reports Macintosh, iOS - like Mac OS X) */
const isMac = navigator.userAgent.includes("Mac");
/** Keys of shortcuts by `KeyboardEvent.code` (physical key): letters & digits are taken from code (`KeyB` => `B`) */
const codeKeys = new Map<string, string>([
  ["Period", "."],
  ["Comma", ","],
  ["BracketLeft", "["],
  ["BracketRight", "]"],
  ["Backslash", "\\"],
]);
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

/** Returns inline format of tool: element applies it if `is` returns pointed value (any value if it's `true`) */
function inlineOf(t: WUP.TextRich.Tool, value: unknown = true): InlineFormat {
  return { is: (el) => isMatch(t.is!(el as HTMLElement), value), create: (v) => t.create!(v) };
}

/** Sets value of inline format to text nodes: format is removed if value is empty */
function setInline(nodes: Text[], f: InlineFormat, value: unknown, root: Node): void {
  removeInline(nodes, f, root);
  value && addInline(nodes, f, value, root);
}

/** Form-control with rich text editor (WYSIWYG): text is formatted via toolbar; behavior & styles are similar to npm quill
 * @see demo {@link https://yegorich555.github.io/web-ui-pack/control/textRich}
 * @example
  const el = document.createElement("wup-textrich");
  el.$options.name = "description";
  el.$options.toolbar = [
    ["bold", "italic", "underline"],
    [{ list: ["ordered", "bullet"] }],
    ["clean-format", "clear"],
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
 * * $value is html (`undefined` if there is no text & embeds); it's sanitized (pointed via $value & $initValue too): only formats of $tools are kept
 * (`<strong>`, `<em>`, `<u>`, `<s>`, `<sub>`, `<sup>`, `<a>`, `<h1>...<h6>`, `<blockquote>`, `<pre>` etc.)
 * with paragraphs `<p>`, lists `<ol>`, `<ul>` & indentation
 * * formatting is saved in custom history: undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y, OS-native) works for text & formats
 * * tools of toolbar are defined in static $tools: change it to redefine labels, keyboard shortcuts etc. or add custom tool
 * * keyboard shortcuts (see static $tools) are similar to Google Docs: Ctrl+B, Ctrl+Shift+7, Ctrl+Alt+1 etc. (Cmd on macOS/iOS);
 * they're shown in tooltips of toolbar buttons & in items of dropdowns (align & header: in tooltips) (see $options.hideHotKeysHint);
 * Alt+F10 to focus toolbar (Arrows to navigate, Esc to return);
 * with collapsed selection inline format (bold etc.) is applied to the next typed text
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
 *     <wup-dropdown tool="header">
 *       <button>Normal</button>
 *       <wup-popup><ul role="listbox"><li role="option" tool="header:1"><h1 role="none">Heading 1</h1></li>...</ul></wup-popup>
 *     </wup-dropdown>
 *   </div>
 *   <div role="group"><button tool="clear" clear></button></div> // $refBtnClear: placed in toolbar instead of label
 * </div>
 * <wup-popup><wup-text/></wup-popup> // to enter value via $ask: url on click on toolbar button `link` or on hover on link */
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
   *   icon: "url('data:image/svg+xml,...')",
   *   kind: "inline", // default format toggles it
   *   is: (el) => el.tagName === "MARK" || undefined,
   *   create: () => document.createElement("mark"),
   * };
   * WUPTextRichControl.$tools.upper = {
   *   label: "Uppercase",
   *   icon: "url('data:image/svg+xml,...')",
   *   format: (r) => splitRange(r).forEach((t) => (t.data = t.data.toUpperCase())), // from web-ui-pack/controls/textRich.format
   * };
   * el.$options.toolbar = [["bold", "highlight", "upper"]];
   * @defaultValue keyboard shortcuts are similar to Google Docs, Gmail & Slack */
  static $tools: WUP.TextRich.Tools = {
    header: {
      label: __wupln("Heading", "aria"),
      dropdown: true,
      default: false,
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
      is: byTag("header"),
      create: (v) => document.createElement(v ? `h${v}` : "div"),
    },
    bold: {
      label: __wupln("Bold", "aria"),
      hotKey: "Control+B",
      kind: "inline",
      is: byTag("bold"),
      create: () => document.createElement("b"), // <strong> is styled as label of the control
    },
    italic: {
      label: __wupln("Italic", "aria"),
      hotKey: "Control+I",
      kind: "inline",
      is: byTag("italic"),
      create: () => document.createElement("em"),
    },
    underline: {
      label: __wupln("Underline", "aria"),
      hotKey: "Control+U",
      kind: "inline",
      is: byTag("underline"),
      create: () => document.createElement("u"),
    },
    strike: {
      label: __wupln("Strikethrough", "aria"),
      hotKey: "Control+Shift+X", // possible "Control+Shift+X Alt+Shift+5", // Alt+Shift+5 - the same as in Google Docs
      kind: "inline",
      is: byTag("strike"),
      create: () => document.createElement("s"),
    },
    blockquote: {
      label: __wupln("Quote", "aria"),
      hotKey: "Control+Shift+9",
      kind: "line",
      is: byTag("blockquote"),
      create: () => document.createElement("blockquote"),
    },
    "code-block": {
      label: __wupln("Code block", "aria"),
      hotKey: "Control+Alt+Shift+C",
      kind: "line",
      is: byTag("code-block"),
      create: () => document.createElement("pre"),
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
      format(r, url, c) {
        const inp = c.$refInput;
        const fmt = inlineOf(this);
        const a = !url && r.collapsed && formatParents(r.startContainer, fmt, inp)[0]; // whole link is removed
        if (a) {
          a.replaceWith(...a.childNodes);
        } else if (url && r.collapsed) {
          const el = this.create!(url); // link with url as text
          el.textContent = url;
          c.$insert(el);
        } else {
          setInline(splitRange(r), fmt, url, inp);
        }
      },
    },
    list: {
      values: [
        { value: "ordered", label: __wupln("Numbered list", "aria"), hotKey: "Control+Shift+7" },
        { value: "bullet", label: __wupln("Bulleted list", "aria"), hotKey: "Control+Shift+8" },
      ],
      kind: "line",
      is: (el) => (el.tagName === "LI" ? byTag("list")(el.parentElement!) : undefined),
      format: (r, v, c) => {
        const inp = c.$refInput;
        const lines = linesOf(r, inp);
        const tag = v === "ordered" ? "OL" : "UL";
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
        inp.querySelectorAll(":scope > ol + ol, :scope > ul + ul").forEach((el) => {
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
      is: byTag("script"),
      create: (v) => document.createElement(v === "sub" ? "sub" : "sup"),
    },
    indent: {
      values: [
        { value: -1, label: __wupln("Decrease indent", "aria"), hotKey: "Control+[" },
        { value: 1, label: __wupln("Increase indent", "aria"), hotKey: "Control+]" },
      ],
      format: (r, v, c) =>
        linesOf(r, c.$refInput).forEach((l) => {
          // 3em per level (the same as quill)
          const m = /^(\d+(\.\d+)?)em$/.exec(l.style.marginLeft);
          const level = Math.min(8, Math.max(0, Math.round((m ? +m[1] : 0) / 3) + v));
          l.style.marginLeft = level ? `${level * 3}em` : "";
          c.removeEmptyStyle.call(l);
        }),
    },
    size: {
      label: __wupln("Font size", "aria"),
      hotKey: "Control+Shift+. Control+Shift+,", // increase & decrease
      dropdown: true,
      default: false,
      values: [
        { value: "hg", label: __wupln("Huge", "content") },
        { value: "lg", label: __wupln("Large", "content") },
        { value: false, label: __wupln("Default", "content") },
        { value: "sm", label: __wupln("Small", "content") },
      ],
      kind: "inline",
      // any font size is removed via format, unsupported one is shown as default; `<font size>` is produced by other editors
      is: (el) => {
        const size =
          el.tagName === "FONT" ? fontSizes.get(el.getAttribute("size")!) : el.tagName === "SPAN" && el.style.fontSize;
        return size ? ((sizeFormats.get(size) ?? false) as WUP.TextRich.ToolValues["size"]) : undefined;
      },
      create: (v) => {
        const el = document.createElement("span");
        el.style.fontSize = sizes.get(v) ?? "";
        return el;
      },
    },
    align: {
      label: __wupln("Alignment", "aria"),
      dropdown: true,
      default: "left",
      values: [
        {
          value: "center",
          label: __wupln("Center", "aria"),
          hotKey: "Control+Shift+E",
          icon: "var(--wup-icon-align-center)",
        },
        {
          value: "right",
          label: __wupln("Right", "aria"),
          hotKey: "Control+Shift+R",
          icon: "var(--wup-icon-align-left)", // mirrored via css
        },
        {
          value: "justify",
          label: __wupln("Justify", "aria"),
          hotKey: "Control+Shift+J",
          icon: "var(--wup-icon-align-justify)",
        },
        {
          value: "left",
          label: __wupln("Left", "aria"),
          hotKey: "Control+Shift+L",
          icon: "var(--wup-icon-align-left)",
        },
      ],
      kind: "lineStyle",
      is: (el) => {
        const a = el.style.textAlign || el.getAttribute("align") || ""; // attribute `align` is deprecated but still used
        return textAligns.has(a) ? (a as WUP.TextRich.ToolValues["align"]) : undefined;
      },
      set: (el, v) => (el.style.textAlign = v === "left" ? "" : v ?? ""),
    },
    "clean-format": {
      label: __wupln("Clear formatting", "aria"),
      hotKey: "Control+\\",
      // with collapsed selection inline formats are removed for the next typed text
      format: (r, _v, c) => {
        const inp = c.$refInput;
        const lines = linesOf(r, inp); // before changes in range
        const nodes = splitRange(r);
        Object.values(c.#ctr.$tools as Record<string, WUP.TextRich.Tool>).forEach(
          (t) => t.kind === "inline" && t.is && removeInline(nodes, inlineOf(t), inp)
        );
        // new paragraph without attributes of formats
        lines.forEach((l) => setLineTag(l, document.createElement("div")).removeAttribute("style"));
      },
    },
    clear: {
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
      ["blockquote", "code-block"],
      ["link"], // todo add to example custom tool => image: true, video: true
      ["list"], // equal to [{ list: ["ordered", "bullet"] ]
      ["script"], // equal to [{script: ['sub', 'super']}]
      ["indent"], // equal to [{indent: [-1, +1]}]
      ["size"], // equal to [{size: ["hg", "lg", false, "sm"]}]
      // todo add to example as custom tool => direction
      // todo add to example as custom tool => [{ font: [] }],
      // not supported yet => [{ color: true, background: true}],
      ["align"], // equal to [{ align: ["center", "right", "justify", "left", false] }],
      ["clean-format"],
      ["clear"], // button clear (rendered if $options.clearButton is true)
    ],
    hideHotKeysHint: false,
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
    // hover on link shows popup to edit url; skipped during selecting by mouse
    onEvent(inp, "pointerover", (e) => !e.buttons && this.gotHoverLink((e.target as Element).closest("a")));
    onEvent(inp, "pointerleave", () => this.gotHoverLink(null));
    // Ctrl/Cmd + Click opens link in new tab: browser doesn't follow links inside contenteditable
    inp.addEventListener("click", (e) => {
      const a = (e.ctrlKey || e.metaKey) && (e.target as Element).closest("a");
      const href = a && sanitizeUrl(a.href);
      if (href) {
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
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
    const [name, picked] = (typeof item === "string" ? [item] : Object.entries(item)[0]) as [string, unknown[]?];
    const tool = (this.#ctr.$tools as Record<string, WUP.TextRich.Tool>)[name];
    if (!tool) {
      this.throwError(`Toolbar item '${name}' isn't defined in $tools`, undefined, true);
    } else if (name === "clear") {
      const b = this.$refBtnClear; // it's created by super if $options.clearButton is true
      if (b) {
        this.setClearLabel(b); // button isn't re-rendered: hint can be changed
        group.appendChild(b);
      }
    } else {
      // values pointed in toolbar are taken from tool: with labels, shortcuts & icons
      const values = picked?.map((v) => tool.values?.find((t) => t.value === v) ?? { value: v }) ?? tool.values;
      if (!values) {
        this.renderButton(group, name, tool);
      } else if (tool.dropdown) {
        this.renderPicker(group, name, tool, values);
      } else {
        values.forEach((v) => this.renderButton(group, name, tool, v));
      }
    }
  }

  /** Renders button of toolbar: button with value applies it (ex. `list:ordered`), without value - toggles format or runs action */
  protected renderButton(group: HTMLElement, name: string, tool: WUP.TextRich.Tool, v?: WUP.TextRich.ToolValue): void {
    const b = group.appendChild(document.createElement("button")) as HTMLButtonElement & ToolElement;
    b.type = "button";
    b.tabIndex = -1; // toolbar is reachable via Alt+F10
    b.setAttribute("tool", v ? `${name}:${v.value}` : name);
    this.setToolLabel(b, v ? v.label ?? String(v.value) : tool.label ?? name, v ? v.hotKey : tool.hotKey);
    const icon = v ? v.icon : tool.icon;
    icon && b.style.setProperty("--icon-img", icon);
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
    const t = this.#ctr.$tools.clear;
    this.setToolLabel(b, (b.getAttribute("clear") ? t.labelBack : t.label) ?? "clear", t.hotKey);
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

  /** Returns button clear: it's placed in toolbar (item `clear`) instead of label */
  protected override renderBtnClear(): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.tabIndex = -1;
    b.setAttribute("tool", "clear");
    b.setAttribute("clear", ""); // icon & state are the same as in other controls
    b.addEventListener("click", () => {
      this.restoreSelection(); // the same as other tools: focus is returned to editor
      this.clearValue();
    });
    return b;
  }

  /** Renders dropdown of toolbar: item shows label inside element of format (preview via `create`),
   *  icon (if value has it: label is shown via tooltip) or custom content (`renderItem`) */
  protected renderPicker(
    group: HTMLElement,
    name: string,
    tool: WUP.TextRich.Tool,
    values: WUP.TextRich.ToolValue[]
  ): void {
    const dd = group.appendChild(document.createElement("wup-dropdown"));
    dd.$options.openCase = PopupOpenCases.onClick; // without onFocus: otherwise it's opened on navigation via Arrows
    dd.$options.closeOnPopupClick = false; // closed manually: otherwise popup returns focus to button instead of editor
    dd.setAttribute("tool", name);
    values.some((v) => v.icon) && dd.setAttribute("icon", ""); // button shows icon of the current value instead of label
    const b = dd.appendChild(document.createElement("button"));
    b.type = "button";
    b.tabIndex = -1;
    this.setToolLabel(b, tool.label ?? name, tool.hotKey);
    const ul = dd.appendChild(document.createElement("wup-popup")).appendChild(document.createElement("ul"));
    ul.setAttribute("role", "listbox");
    values.forEach((v) => {
      const li = ul.appendChild(document.createElement("li")) as HTMLLIElement & ToolElement;
      const label = v.label ?? String(v.value);
      li.setAttribute("role", "option");
      li.setAttribute("tool", `${name}:${v.value}`);
      li.tabIndex = -1;
      li._format = name;
      li._value = v.value;
      if (v.icon) {
        li.setAttribute("icon", "");
        li.style.setProperty("--ctrl-icon-img", v.icon);
        this.setToolLabel(li, label, v.hotKey); // label & shortcut are shown via tooltip like for buttons
        return;
      }
      let preview: HTMLElement | undefined;
      if (tool.renderItem) {
        li.setAttribute("aria-label", label);
        tool.renderItem(li, v.value);
      } else if (tool.create && tool.kind !== "embed") {
        // the same styles as in editor (heading, font size etc.): inner element, otherwise checkmark of selected item is scaled too
        preview = li.appendChild(tool.create(v.value));
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
    });
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
      const cur = formats.get(name) ?? tool?.default;
      if (el.tagName === "LI") {
        el.setAttribute("aria-selected", el._value === cur);
      } else if (el.hasAttribute("aria-pressed")) {
        el.setAttribute("aria-pressed", el._value === undefined ? cur !== undefined : cur === el._value);
      } else if (el.tagName === "WUP-DROPDOWN") {
        // button shows the current value: its icon or label
        const b = el.firstElementChild as HTMLElement;
        const v = tool.values?.find((x) => x.value === cur);
        b.setAttribute("value", String(cur ?? ""));
        el.hasAttribute("icon")
          ? b.style.setProperty("--ctrl-icon-img", v?.icon ?? "")
          : (b.textContent = v?.label ?? (cur === undefined ? tool.label ?? name : String(cur)));
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

  /** Applies tool of $tools to selection (see `kind` & `format` of tool); value is asked via `ask` of tool if it isn't pointed;
   * inline format with collapsed selection is applied to the next typed text (the same as quill) */
  protected applyFormat(name: string, value?: unknown): void {
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
    if (tool.ask && value === undefined) {
      // selection is restored by positions: focus can be moved out of control (to modal etc.) & nodes can be re-rendered
      const pos = this.getSelectionPos();
      tool.ask(this.findTool(name) ?? inp, this, f.get(name)).then((v) => {
        if (v != null) {
          inp.focus({ preventScroll: true });
          this.setSelectionPos(pos);
          this.applyFormat(name, v);
        }
      });
    } else if (sel.isCollapsed && ((tool.kind === "inline" && !tool.ask) || name === "clean-format")) {
      // format for the next typed text (Ctrl+B and type text)
      const p = this.#pending;
      if (name === "clean-format") {
        Object.entries(tools).forEach(([k, t]) => t.kind === "inline" && !t.ask && f.has(k) && p.set(k, false));
      } else if (tool.dropdown) {
        p.set(name, value || false);
      } else if (tool.values) {
        p.set(name, f.get(name) === value ? false : value);
      } else {
        p.set(name, !f.has(name));
      }
      this.#pendingAt = [sel.anchorNode!, sel.anchorOffset];
      this.refreshToolbar();
    } else {
      this.changeContent(() => this.keepSelection((r) => this.formatRange(tool, r, value ?? true))); // tool without values gets `true`
    }
  }

  /** Applies tool to range via its `format` or default one according to `kind` of tool:
   *  dropdown sets selected value (`false` removes format), button toggles format (it's removed if range has it already) */
  protected formatRange(tool: WUP.TextRich.Tool, r: Range, value: unknown): void {
    if (tool.format) {
      tool.format(r, value, this);
      return;
    }
    const inp = this.$refInput;
    const isSet = tool.dropdown;
    switch (tool.kind) {
      case "inline": {
        const nodes = splitRange(r);
        const any = inlineOf(tool);
        const f = inlineOf(tool, value);
        if (isSet) {
          removeInline(nodes, any, inp);
          value && addInline(nodes, f, value, inp);
        } else {
          // only one value is possible: elements with other values are removed (subscript & superscript)
          tool.values && removeInline(nodes, { is: (el) => any.is(el) && !f.is(el), create: f.create }, inp);
          nodes.every((t) => formatParents(t, f, inp).length)
            ? removeInline(nodes, f, inp)
            : addInline(nodes, f, value, inp);
        }
        break;
      }
      case "line":
      case "lineStyle": {
        const lines = linesOf(r, inp);
        const isOff = !value || (!isSet && lines.every((l) => isMatch(tool.is?.(l), value)));
        lines.forEach((l) => {
          if (tool.kind === "line") {
            // new paragraph: otherwise attributes of format are kept (class etc.) if line is <div> already
            setLineTag(l, isOff ? document.createElement("div") : tool.create!(value));
          } else {
            tool.set!(l, isOff ? undefined : value);
            this.removeEmptyStyle.call(l);
          }
        });
        break;
      }
      case "embed":
        this.$insert(tool.create!(value)); // caret is placed after element
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
      const el = v !== true && formatParents(r.startContainer, inlineOf(tools[k]), inp).pop(); // the outer one
      el && splitAt(el, r);
    });
    const t = document.createTextNode(text);
    let node: Node = t;
    this.#pending.forEach((v, k) => {
      if (v !== false && !formatParents(r.startContainer, inlineOf(tools[k], v), inp).length) {
        const el = tools[k].create!(v);
        el.appendChild(node);
        node = el;
      }
    });
    r.insertNode(node);
    sel.collapse(t, t.length);
    this.#pending.clear();
  }

  /** Selection is placed by $insert: it isn't restored by keepSelection */
  #isInserted = false;

  /** Calls fn that changes editor & restores selection by lines & chars (fn can move or split nodes);
   *  selection isn't restored if content is inserted via $insert (caret is placed after it) */
  protected keepSelection(fn: (r: Range) => void): void {
    const pos = this.getSelectionPos();
    this.#isInserted = false;
    fn(window.getSelection()!.getRangeAt(0));
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

  /** Popup with text control to enter value (url of link etc.): `done` closes it & resolves value (`null` if canceled),
   * `isBack` - return focus & selection to editor; `a` - link which url is edited via popup opened by hover */
  #ask?: { popup: WUPPopupElement; done: (v: string | null, isBack: boolean) => void; a?: HTMLAnchorElement };
  #hoverTimer?: ReturnType<typeof setTimeout>;

  /** Asks value via popup with text control placed near target (it's used by tool `link` to enter url):
   *  Enter submits, Escape or moving focus out cancels (resolves `null`); focus & selection are returned to editor on Enter/Escape
   * @param target element popup is placed near (ex. button of tool)
   * @param value initial value of text control
   * @param opts options of text control: label, validations etc.
   * @param a link which url is edited via popup opened by hover: text control isn't focused, popup is closed when pointer leaves it,
   * clearing value (Enter with empty value or button clear) resolves `""` to remove link
   * @example
   * WUPTextRichControl.$tools.image = {
   *   ...
   *   ask: (target, c) => c.$ask(target, "https://", { label: "Image url", validations: { required: true } }),
   * }; */
  $ask(
    target: HTMLElement,
    value: string,
    opts?: Partial<WUP.Text.Options>,
    a?: HTMLAnchorElement
  ): Promise<string | null> {
    this.#ask?.done(null, false); // only one popup at once
    const p = document.createElement("wup-popup");
    p.$options.openCase = PopupOpenCases.onInit;
    p.$options.target = target;
    const el = p.appendChild(document.createElement("wup-text"));
    el.$options.validationCase = ValidationCases.onChangeSmart; // without onFocusWithValue: otherwise error is shown at once
    el.$options.readOnly = this.$isReadOnly;
    el.$options.autoFocus = !a;
    Object.assign(el.$options, opts);
    el.$initValue = value;

    return new Promise((resolve) => {
      const done = (v: string | null, isBack: boolean): void => {
        this.#ask = undefined;
        clearTimeout(this.#hoverTimer);
        isBack && this.restoreSelection(); // otherwise focus is moved by user
        p.$close().finally(() => p.remove());
        resolve(v);
      };
      this.#ask = { popup: p, done, a };
      p.onkeydown = (e) => {
        if (e.key === "Escape") {
          e.preventDefault(); // otherwise value of control is cleared
          done(null, true);
        } else if (e.key === "Enter") {
          e.preventDefault(); // otherwise form is submitted
          !el.$validate() && done(el.$value ?? "", true);
        }
      };
      el.$onChange = (e) => {
        e.stopPropagation(); // nested control isn't related to form
        a && e.detail.reason === SetValueReasons.clear && el.$value === undefined && done("", true);
      };
      // WARN: `onfocusout` isn't supported (there is no such property in HTML spec)
      p.addEventListener(
        "focusout",
        (e) => this.#ask?.done === done && !p.contains(e.relatedTarget as Node) && done(null, false)
      );
      p.$onClose = () => this.#ask?.done === done && done(null, false); // closed by itself: when target is removed
      p.onpointerenter = () => this.#ask?.a && this.gotHoverLink(this.#ask.a);
      p.onpointerleave = () => this.gotHoverLink(null);
      this.appendChild(p);
    });
  }

  /** Asks url of link via popup (see $ask): `a` - link which url is edited via popup opened by hover (clearing url removes link) */
  protected askLink(target: HTMLElement, url: string, a?: HTMLAnchorElement): Promise<string | null> {
    const { $textLink, $errorLink } = this.#ctr;
    const validations = { required: !a, url: (v?: string) => !!v && !sanitizeUrl(v) && $errorLink };
    return this.$ask(target, url, { label: $textLink, validations }, a);
  }

  /** Called when pointer is over link or its popup (`a` is related link) or out of them (`a` is `null`):
   *  shows popup to edit url of link with delay & hides it when pointer is out (but not while user edits url) */
  protected gotHoverLink(a: HTMLAnchorElement | null): void {
    const l = this.#ask;
    if (l && (!l.a || l.popup.contains(document.activeElement))) {
      return; // popup is opened via toolbar or user edits url
    }
    clearTimeout(this.#hoverTimer);
    if (a === (l?.a ?? null)) {
      return; // pointer is moved between link & popup
    }
    const { hoverOpenTimeout, hoverCloseTimeout } = WUPPopupElement.$defaults;
    this.#hoverTimer = setTimeout(
      () => {
        if (a?.isConnected) {
          this.askLink(a, a.getAttribute("href")!, a).then(
            (url) =>
              url != null &&
              this.changeContent(() => (url ? a.setAttribute("href", url) : a.replaceWith(...a.childNodes)))
          );
        } else {
          this.#ask?.done(null, false);
        }
      },
      a ? hoverOpenTimeout : hoverCloseTimeout
    );
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
          next = e.key === "ArrowDown" ? items[(i + 1) % items.length] : items.at(i - 1);
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

  /** Returns rendered toolbar button or item of dropdown by key `format` or `format:value` */
  protected findTool(key: string): ToolElement | null {
    return this.$refToolbar.querySelector(`[tool="${key}"]`);
  }

  /** Called on keydown in editor or toolbar: applies tool by keyboard shortcut (`hotKey` of $tools) if tool is rendered in toolbar
   * @returns true if event must be prevented */
  protected gotHotKey(e: KeyboardEvent): boolean {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    // AltGraph: AltGr+key (the same as Ctrl+Alt+key on Windows) types char with some keyboard layouts
    if ((!mod && !e.altKey) || (isMac ? e.ctrlKey : e.metaKey) || e.getModifierState("AltGraph")) {
      return false;
    }
    const key = (codeKeys.get(e.code) ?? e.code.replace(/^(Key|Digit)/, "")).toUpperCase();
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
      const el = this.findTool(val ? `${name}:${val.value}` : name);
      if (!el) {
        return false; // tool isn't rendered: browser shortcut works as usual
      }
      el._format ? this.applyFormat(el._format, el._value) : el.click(); // button clear isn't ToolElement
      return true;
    }
    // tool with values: the 1st shortcut selects the previous value (increases font size), the 2nd one - the next value;
    // values are taken in order of $tools: the nearest one rendered in toolbar
    const { values } = tool;
    const isRendered = (v: WUP.TextRich.ToolValue): boolean => !!this.findTool(`${name}:${v.value}`);
    if (!values.some(isRendered)) {
      return false;
    }
    const at = values.findIndex((v) => v.value === (this.getFormats().get(name) ?? tool.default));
    const next = (i ? values.slice(at + 1) : values.slice(0, at < 0 ? undefined : at).reverse()).find(isRendered);
    next && this.applyFormat(name, next.value);
    return true;
  }

  protected override gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    const t = e.target as Node;
    if ((t === this.$refInput || this.$refToolbar.contains(t)) && this.gotHotKey(e)) {
      e.preventDefault(); // skipped for nested control in popup of link
      return;
    }
    if (e.key === "Escape") {
      // the 1st Escape closes popup (otherwise value is cleared): dropdown of toolbar opened by mouse (focus stays in editor)
      // or popup of link opened by hover
      const dd = this.$refToolbar.querySelector("[aria-expanded=true]")?.closest("wup-dropdown");
      const l = this.#ask;
      if (dd || l?.a) {
        e.preventDefault();
        dd ? dd.$refPopup.$close() : l!.done(null, false);
        return;
      }
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
      e.preventDefault(); // formatting by browser (menu of Safari, iOS etc.) is replaced with custom one: to save it in custom history
      const k = formatInputs.get(t); // color, font etc. aren't supported
      const el = k && this.findTool(k); // only formats rendered in toolbar
      el && this.applyFormat(el._format, el._value);
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

  /** Returns sanitized html: paragraphs as `<p>`, only formats of $tools & safe elements are kept
   *  (`undefined` if there is no text & embeds) */
  protected sanitize(v: ValueType | undefined): ValueType | undefined {
    // via constructor instead of #ctr: $initValue can be set before fields of class are defined
    const { $tools } = this.constructor as typeof WUPTextRichControl;
    return typeof v === "string" ? ((htmlToValue(v, $tools) || undefined) as ValueType) : v;
  }

  /** Default/init value: it's sanitized the same as $value (only formats of $tools are kept) */
  override get $initValue(): ValueType | undefined {
    return super.$initValue;
  }

  override set $initValue(v: ValueType | undefined) {
    super.$initValue = this.sanitize(v);
  }

  protected override setValue(v: ValueType | undefined, reason: SetValueReasons, skipInput = false): boolean | null {
    // value of editor (user input) & init value are sanitized already
    const isClean = reason === SetValueReasons.userInput || reason === SetValueReasons.initValue;
    return super.setValue(isClean ? v : this.sanitize(v), reason, skipInput);
  }

  protected override setInputValue(v: string, reason: SetValueReasons): void {
    if (v && v === this.$refInput.value) {
      return; // skip re-rendering: it resets selection & scroll
    }
    super.setInputValue(v, reason);
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
