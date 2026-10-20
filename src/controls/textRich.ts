import { inheritDefaults } from "../baseElement";
import onEvent from "../helpers/onEvent";
import { stringPrettify } from "../helpers/string";
import WUPPopupElement from "../popup/popupElement";
import { useTooltipOnce } from "../popup/popupTooltip";
import WUPTextControl from "./text";
import TextHistory from "./text.history";
import WUPTextAreaControl from "./textArea";
import TextRichHistory from "./textRich.history";
import WUPTextRichInput from "./textRich.input";
import TextRichMenu, { TextRichAsk, TextRichPrompt } from "./textRich.select";
import * as Utils from "./textRich.utils";

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
      /** Link url (asked via popup); typed url is recognized (`https://...`, `www...`) */
      link: string;
      /** Email of link `mailto:`: typed email is recognized (tool is hidden in toolbar) */
      email: string;
      /** Menu of tools in toolbar (hidden ones too) on typing `/` at word start: value is tool & its value
       *  (`header:1`, `bold`); typed text is replaced with chosen format or `placeholder` of tool (tool is hidden in toolbar) */
      command: string;
      /** Removes formatting */
      clean: true;
      /** Clear button ($refBtnClear): rendered if `$options.clearButton` is true (see `$options.clearActions`);
       *  Escape doesn't clear rich text (it undoes recognizing right after it) */
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
      /** Text typed at line start that applies this value like markdown (`1. ` gives numbered list): RegExp must match
       *  the whole text before caret; typed text is removed; works if tool is in toolbar (see `hideOnToolbar`);
       *  undo (Ctrl+Z or Escape right after it) returns typed text */
      recognize?: RegExp;
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
       * * works only if tool is in toolbar (see `hideOnToolbar`)
       * * tool with values: the 1st shortcut selects the previous value, the 2nd one - the next value (`size`: bigger/smaller) */
      hotKey?: string;
      /** Class of toolbar button or dropdown (single class): to set icon via css-var `--icon-img`
       *  (`.my-icon-upper { --icon-img: url("data:image/svg+xml,...") }`); or use `wup-textrich [tool="upper"]` selector instead */
      className?: string;
      /** Class of element created via `create` (in editor, $value & dropdown preview): to style it & detect it in `is` */
      classNameTag?: string;
      /** Hide button (or dropdown) in toolbar: tool works as rendered one (shortcuts, `trigger`, `recognize` etc.)
       *  if it's in $options.toolbar; `label` is still used: item in menu of `command` & `aria-label` of menu of `trigger` */
      hideOnToolbar?: boolean;
      /** Dropdown values in default order (toolbar item `"header"` = `{ header: [1, 2, 3, 4, 5, 6, false] }`);
       *  `false` - format isn't applied (`Normal` of `header`);
       *  without `ask` value is asked via this dropdown opened near editor (on `trigger`, hover on `embed`, $format without value) */
      values?: ToolValue<V>[];
      /** Typed text that opens tool dropdown near caret (`{` - placeholders, `@` - mentions, `/` - commands);
       *  text typed after it filters items by label or value; chosen value replaces typed text;
       *  Arrows - navigate, Enter/Tab/click - choose, Escape/whitespace/caret out - close
       * @tutorial Rules
       * * works only if tool is in toolbar as dropdown (see `hideOnToolbar`)
       * * works at word start only: after whitespace, bracket or quote (`@` of email doesn't open mentions)
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
      /** Recognizes text while user types: word at caret is wrapped into element of `create(text)` as soon as it's matched
       *  (`someone@gmail.c` => email link); element follows its text on typing & deleting (it's removed if text isn't
       *  recognized anymore); undo (Ctrl+Z or Escape right after recognizing) returns plain text & pauses recognizing
       *  till caret leaves word
       * @tutorial Rules
       * * RegExp must match the end of text (use `$`); function returns the recognized end of text or nothing
       * * tool with `values` isn't recognized: value is chosen via menu (see `trigger`), like mentions in messengers;
       * text typed at line start can apply value (see `ToolValue.recognize`): `1. ` gives numbered list
       * * point `placeholder` too: otherwise tool chosen in menu of `command` does nothing visible
       * @example
       * recognize: /(?<!\w)#\w+$/, // hashtags: `#news`
       * recognize: (s) => /\b[A-Z]+-\d+$/.exec(s)?.[0], // Jira issues: `WUP-123` */
      recognize?: RegExp | ((text: string) => string | null | undefined);
      /** Text that inserted as example when user selects this command (type '/' and chose command with this) */
      placeholder?: string;
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
       *  WARN: sanitizer calls it for untrusted html (paste etc.): return only safe values (see `Html.sanitizeUrl`) */
      is?: (el: HTMLElement) => V | undefined;
      /** Creates element to wrap related part of text
       * @example
       * create: "div", // equal to () => document.createElement("div")
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
       *  (use `editor.$insert` to insert content & place caret after it), updates $value & toolbar
       * @example
       * format: ({ texts }) => texts.forEach((t) => (t.data = t.data.toUpperCase())), // uppercase selected text
       * format: ({ editor }) => editor.$insert(document.createTextNode(new Date().toLocaleDateString())), // insert date
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
      editor: WUPTextRichInput;
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
      /** Toolbar items split into groups (`null` or empty array hides toolbar); custom tools must be defined in static $tools
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
      toolbar: ToolbarGroup[] | null;
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
      "w-hideHotKeysHint"?: WUP.Base.JSXBoolAttr;
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
type ToolElement = HTMLElement & {
  _format: keyof WUP.TextRich.ToolValues;
  _value?: unknown;
  _values?: WUP.TextRich.ToolValue[];
};

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
 * * ArrowRight at the end of inline format (bold, link etc.) or ArrowLeft at its start: the next typed text goes out of it
 * (caret stays visually), the opposite arrow returns into it; then ArrowRight at the end of the last block (list, quote,
 * code, heading) adds new line after it
 * * Enter continues inline formats in the next line except turned off (Bold toggled off), left via arrow, recognized text & tokens
 * * typed quote or bracket wraps selected text like in code editors: `"text"`, `(text)` (see static $wrapChars)
 * * typed `trigger` opens tool dropdown near caret: `{` for placeholders, `@` for mentions etc.
 * * typed text is recognized: links, emails (see `recognize` of $tools), lists by `1. ` & `- ` at line start;
 * undo (Ctrl+Z or Escape right after recognizing) returns typed text; Escape doesn't clear value (clear button only)
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
      placeholder: "https://example.com",
      // brackets are balanced (`wiki/Foo_(bar)`), the last char isn't punctuation
      recognize:
        /(?<![\w@./:-])(?:https?:\/\/|www\.)(?:[^\s<>()]|\([^\s<>()]*\))*(?:[^\s<>().,;:!?'"]|\([^\s<>()]*\))$/i,
      // unsafe url (`javascript:` etc.) => sanitizer removes link; emails are own tool
      is: (el) => {
        const url = el.tagName === "A" && Utils.Html.sanitizeUrl(el.getAttribute("href") || "");
        return (url && !/^mailto:/i.test(url) && url) || undefined;
      },
      create: (url) =>
        Object.assign(document.createElement("a"), {
          href: /^www\./i.test(url) ? `https://${url}` : url,
          target: "_blank",
          rel: "noopener noreferrer",
        }),
      // selection inside link removes it, otherwise asks url
      ask: (target, c, cur) => (cur === undefined ? c.askLink(target, "https://") : Promise.resolve("")),
      format: ({ range, value: url, editor, tool, applyDefault }) => {
        if (!range.collapsed) {
          applyDefault(); // empty url removes link
        } else if (url) {
          const a = Utils.Formats.create(tool, url); // url as text
          a.textContent = url;
          editor.$insert(a);
        } else {
          const a = Utils.Formats.parents(
            range.startContainer,
            (el) => tool.is!(el as HTMLElement) !== undefined,
            editor
          )[0]; // remove the whole link
          a?.replaceWith(...a.childNodes);
        }
      },
    },
    email: {
      label: __wupln("Email", "aria"), // item in menu of command
      hideOnToolbar: true,
      kind: "inline",
      // `someone@gmail.c` is recognized while typing
      recognize: /(?<![\p{L}\p{N}._%+:/-])[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}+$/u,
      placeholder: "name@example.com",
      is: (el) => {
        const href = (el.tagName === "A" && el.getAttribute("href")) || "";
        return (/^mailto:/i.test(href) && href.slice(7)) || undefined;
      },
      create: (v) => Object.assign(document.createElement("a"), { href: `mailto:${v}` }),
    },
    command: {
      label: __wupln("Commands", "aria"), // aria-label of menu
      hideOnToolbar: true,
      trigger: "/", // menu of commands like in Notion & Slack
      // menu lists tools of toolbar (see commandValues): value is tool & its value (`header:1`)
      format: ({ value, editor, control }) => {
        editor.$insert(document.createDocumentFragment()); // removes typed `/text`
        Promise.resolve().then(() => control.applyCommand(value)); // after this change
      },
    },
    list: {
      values: [
        // typed `1. ` & `- ` like in Google Docs & Notion: space confirms it (`1.5 kg` isn't list)
        {
          value: "ordered",
          label: __wupln("Numbered list", "aria"),
          hotKey: "Control+Shift+7",
          recognize: /^1[.)]\s$/,
        },
        { value: "bullet", label: __wupln("Bulleted list", "aria"), hotKey: "Control+Shift+8", recognize: /^[-*]\s$/ },
      ],
      kind: "line",
      is: (el) => {
        const t = el.tagName === "LI" && el.parentElement?.tagName;
        return (t === "OL" && "ordered") || (t === "UL" && "bullet") || undefined;
      },
      format: ({ lines, value }) => {
        const tag = value === "ordered" ? "OL" : "UL";
        const isOn = lines.every((l) => l.parentElement!.tagName === tag);
        lines.forEach((l) => {
          if (isOn) {
            Utils.Lines.setTag(l, "DIV");
          } else if (l.parentElement!.tagName !== tag) {
            // item of another list is nested into the previous item (Enter in numbered list & bulleted list),
            // the 1st one keeps its level (whole list is converted): it's moved out of its list only
            const isItem = l.tagName === "LI";
            isItem && Utils.Lines.nest(l);
            const li = isItem ? Utils.Lines.lift(l) : Utils.Lines.setTag(l, "LI");
            const list = li.parentNode!.insertBefore(document.createElement(tag), li);
            list.appendChild(li);
            // merge adjacent lists: `<ol><li>a</li></ol><ol><li>b</li></ol>` => `<ol><li>a</li><li>b</li></ol>`
            Utils.Formats.mergePrev(list.nextSibling);
            Utils.Formats.mergePrev(list);
          }
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
      // list item changes level of nesting, other lines get margin
      format: ({ lines, value }) => {
        const isOut = value < 0;
        let moved: HTMLElement | undefined; // its nested items are moved with it (lines are in order: only last can be)
        const fixed = new Set<Element | null>(); // the 1st item of list: the next selected items aren't nested into it
        // decreasing goes from the end: the next items become nested in moved one
        (isOut ? lines.slice().reverse() : lines).forEach((l) => {
          if (l.tagName === "LI") {
            const isSkip = !isOut && (fixed.has(l.previousElementSibling) || !!moved?.contains(l));
            !isSkip && Utils.Lines.nest(l, isOut) ? (moved = l) : fixed.add(l);
            return;
          }
          // 3em per level (the same as quill); pasted indent can be in px
          const [, n, unit] = Utils.indentReg.exec(l.style.marginLeft) ?? [];
          const em = unit === "px" ? +n / (parseFloat(getComputedStyle(l).fontSize) || 16) : +(n ?? 0);
          const level = Math.min(8, Math.max(0, Math.round(em / 3) + value));
          l.style.marginLeft = level ? `${level * 3}em` : "";
        });
      },
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
        return size ? Utils.sizeFormats[size as keyof typeof Utils.sizeFormats] ?? false : undefined;
      },
      create: (v) => {
        const el = document.createElement("span");
        el.style.fontSize = Utils.sizes[v as keyof typeof Utils.sizes] ?? "";
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
        return Utils.textAligns.has(a) ? (a as WUP.TextRich.ToolValues["align"]) : undefined;
      },
      set: (el, v) => (el.style.textAlign = v || ""),
    },
    clean: {
      label: __wupln("Clear formatting", "aria"),
      hotKey: "Control+\\",
      // collapsed selection: removes formats of the next typed text (see $format)
      format: ({ lines, texts, editor, control }) => {
        // tools of subclass
        Object.values((control.constructor as typeof WUPTextRichControl).$tools).forEach(
          (t) =>
            t.kind === "inline" &&
            t.is &&
            Utils.Formats.removeInline(texts, (el) => t.is!(el as HTMLElement) !== undefined, editor)
        );
        // plain paragraph
        lines.forEach((l) => Utils.Lines.setTag(l, document.createElement("div")).removeAttribute("style"));
      },
    },
    btnClear: {
      label: __wupln("Clear content", "aria"),
      labelBack: __wupln("Restore", "aria"),
    },
  };

  /** Default options - applied to every element. Change it to configure default behavior */
  static $defaults: WUP.TextRich.Options = inheritDefaults(WUPTextAreaControl.$defaults, {
    validationRules: inheritDefaults(WUPTextAreaControl.$defaults.validationRules, {
      // WARN: validations min/max must depend on visible chars only
      min: (v, setV, c, r) =>
        WUPTextControl.$defaults.validationRules.min!.call!(c, v && Utils.Html.toText(v), setV, c, r),
      max: (v, setV, c, r) =>
        WUPTextControl.$defaults.validationRules.max!.call!(c, v && Utils.Html.toText(v), setV, c, r),
    }),
    toolbar: [
      ["header"], // = [{ header: [1, 2, 3, 4, 5, 6, false] }]
      ["bold", "italic", "underline", "strike"],
      ["blockquote", "code"],
      ["link", "email", "command"], // hidden except link: typed email is recognized, `/` opens menu of tools
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
    d.toolbar = d.toolbar?.slice() ?? null;
    return d as unknown as T;
  }

  static override mergeDefaults<T extends Record<string, any>>(opts: T): T {
    const isHidden = opts.toolbar === null;
    super.mergeDefaults(opts);
    isHidden && ((opts as Record<string, any>).toolbar = null); // otherwise null is replaced with default toolbar
    return opts;
  }

  $refInput = Object.assign(document.createElement("wup-richinput") as WUPTextRichInput & HTMLInputElement, {
    _tools: this.#ctr.$tools, // sanitizer keeps their formats
    _wrapChars: this.#ctr.$wrapChars,
    _isActive: (name: keyof WUP.TextRich.ToolValues) => !!this.findTool(name),
    _applyKey: (key: string) => this.applyKey(key),
    _onFormats: () => this.refreshToolbar(),
  });

  /** Toolbar with buttons & dropdowns */
  $refToolbar = document.createElement("div");

  /** Formats shown by toolbar: to skip refresh if nothing changed */
  #shown?: string;
  /** Last selection in editor: restored when focus is on toolbar */
  #range?: Range;
  /** Screen-reader hint: how to reach toolbar */
  #hint = document.createElement("span");

  protected override renderControl(): void {
    super.renderControl();
    const bar = this.$refToolbar;
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", this.#ctr.$ariaToolbar);
    bar.addEventListener("click", (e) => this.gotToolbarClick(e));
    this.appendChild(bar); // after editor (moved up via css): otherwise form autofocus focuses toolbar

    const inp = this.$refInput;
    const hint = this.$refLabel.appendChild(this.#hint); // text is set on toolbar render
    hint.id = this.#ctr.$uniqueId;
    hint.className = this.#ctr.classNameHidden;
    inp.setAttribute("aria-describedby", hint.id);
    inp.setAttribute("wup-textrich", ""); // global content styles

    useTooltipOnce("w-tooltip");
    // hover on link opens url popup, on embed & token - tool dropdown;
    // skipped while selecting by mouse & for touch (buttons = 1) & while pointer stays over the same element
    onEvent(inp, "pointermove", (e) => {
      const t = e.target as Element;
      if (!e.buttons) {
        // the same target: without lookup of tools
        const [, el] = this.#hoverAt?.[0] === t ? this.#hoverAt : (this.#hoverAt = [t, this.hoverOf(t)]);
        el !== this.#under && this.gotHover((this.#under = el));
      }
    });
    // touch leaves element right after tap: popup is closed by tap elsewhere or on blur
    onEvent(inp, "pointerleave", (e) => {
      this.#hoverAt = undefined;
      e.pointerType !== "touch" && this.gotHover((this.#under = null));
    });
    // press opens popup of element at once (caret is placed as usual), press elsewhere closes it
    const press = (t: Element): void => {
      this.$refInput.resumeRecognize(); // caret leaves word
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
      const href = a && (e.ctrlKey || e.metaKey) && Utils.Html.sanitizeUrl(a.href);
      if (href) {
        // Ctrl/Cmd+Click opens link: browser doesn't follow links in contenteditable
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      press(t); // touch (mouse is pressed on pointerdown already)
      // embed with `ask` (image etc.): asked value replaces it
      const name = this.embedTool(t);
      if (name && this.#ctr.$tools[name].kind === "embed" && this.#ctr.$tools[name].ask) {
        Utils.Ranges.select(t);
        this.$format(name, undefined, false, t);
      }
    });
  }

  protected override gotChanges(propsChanged: Array<keyof WUP.TextRich.Options> | null): void {
    super.gotChanges(propsChanged as any); // creates/removes $refBtnClear & footer
    this.#hoverAt = undefined; // readonly, toolbar etc. change element with hover popup
    (!propsChanged ||
      propsChanged.includes("toolbar") ||
      propsChanged.includes("hideHotKeysHint") ||
      propsChanged.includes("clearButton")) &&
      this.renderToolbar();
  }

  protected override countChars(): number {
    return Utils.Html.toText(this.$refInput.value).length;
  }

  /** Renders toolbar according to $options.toolbar */
  protected renderToolbar(): void {
    const bar = this.$refToolbar;
    bar.replaceChildren();
    this._opts.toolbar?.forEach((items) => {
      const g = document.createElement("div");
      g.setAttribute("role", "group");
      items.forEach((item) => this.renderTool(g, item));
      g.hidden = !g.querySelector(":scope > :not([hidden])"); // tools with `hideOnToolbar` only
      g.firstChild && bar.appendChild(g);
    });
    bar.hidden = !bar.querySelector(":scope > :not([hidden])");
    this.#hint.textContent = bar.hidden ? "" : this.#ctr.$ariaDescription;
    this.$refInput.setTools(this.#ctr.$tools); // after render: tools work if they're in toolbar
    this.#shown = undefined; // force refresh of new items
    this.refreshToolbar();
  }

  /** Renders toolbar item into group */
  protected renderTool(group: HTMLElement, item: WUP.TextRich.ToolbarItem): void {
    const [name, picked] = (typeof item === "string" ? [item] : Object.entries(item)[0]) as [
      keyof WUP.TextRich.ToolValues,
      unknown
    ];
    const tool: WUP.TextRich.Tool = this.#ctr.$tools[name];
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
      const values = (picked as unknown[] | undefined)?.map(valueOf) ?? tool.values;
      this.renderButton(
        group,
        name,
        tool,
        undefined,
        values ?? (name === "command" ? this.commandValues() : undefined)
      );
    } else {
      this.renderButton(group, name, tool, valueOf(picked));
    }
  }

  /** Renders toolbar button: `v` - button of value (`list:ordered`), `values` - dropdown, otherwise toggle or action */
  protected renderButton(
    group: HTMLElement,
    name: keyof WUP.TextRich.ToolValues,
    tool: WUP.TextRich.Tool,
    v?: WUP.TextRich.ToolValue,
    values?: WUP.TextRich.ToolValue[]
  ): void {
    const b = group.appendChild(document.createElement("button")) as HTMLButtonElement & ToolElement;
    b.type = "button";
    b.tabIndex = -1; // reachable via Alt+F10
    b.setAttribute("tool", v ? `${name}:${v.value}` : name);
    tool.hideOnToolbar && (b.hidden = true); // works as rendered one
    this.setToolLabel(
      b,
      v ? v.label ?? stringPrettify(String(v.value), true, true) : tool.label ?? name,
      v ? v.hotKey : tool.hotKey
    );
    tool.className && b.classList.add(tool.className);
    v?.className && b.classList.add(v.className);
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
  protected renderMenuItem(li: HTMLElement, tool: WUP.TextRich.Tool, v: WUP.TextRich.ToolValue): void {
    const label = v.label ?? stringPrettify(String(v.value), true, true);
    if (v.className) {
      li.setAttribute("icon", "");
      li.classList.add(v.className);
      this.setToolLabel(li, label, v.hotKey); // label & shortcut in tooltip like for buttons
      return;
    }
    let preview: HTMLElement | undefined;
    if (tool.create && tool.kind !== "embed") {
      // inner element: otherwise checkmark of selected item is scaled too
      preview = li.appendChild(Utils.Formats.create(tool, v.value));
      preview.setAttribute("role", "none"); // hides semantics: heading etc.
      preview.textContent = label;
    } else {
      li.textContent = label;
    }
    const hint = this.setHotKeys(li, v.hotKey);
    if (preview && Utils.Lines.isBlockTag(preview.tagName)) {
      hint && li.setAttribute("w-tooltip", `${label} (${hint})`); // headings are big: hint only in tooltip
    } else if (hint) {
      const kbd = li.appendChild(document.createElement("kbd")); // at the right like in OS menus
      kbd.setAttribute("aria-hidden", true); // announced via aria-keyshortcuts
      kbd.textContent = hint;
    }
  }

  /** Updates toolbar state by formats of selection (skipped if nothing changed) */
  protected refreshToolbar(formats = this.$refInput.getFormats()): void {
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
        const tool: WUP.TextRich.Tool = this.#ctr.$tools[name];
        const v = tool.values?.find((x) => x.value === cur);
        if (el.hasAttribute("icon")) {
          el.className = "";
          tool.className && el.classList.add(tool.className);
          v?.className && el.classList.add(v.className);
        } else {
          const label = cur === false ? tool.label ?? name : String(cur); // unknown value as is: `someProp`
          el.textContent = v ? v.label ?? stringPrettify(String(v.value), true, true) : label;
        }
      } else {
        el.setAttribute("aria-pressed", el._value === undefined ? cur !== false : cur === el._value);
      }
    });
  }

  /** Focuses editor & restores the last selection (if focus is on toolbar) */
  protected restoreSelection(): void {
    const inp = this.$refInput;
    if (document.activeElement === inp) {
      return;
    }
    inp.focus({ preventScroll: true });
    const r = this.#range;
    r && inp.contains(r.startContainer) && Utils.Ranges.select(r);
  }

  /** Applies toolbar button: toggles format or opens dropdown menu */
  protected applyTool(el: ToolElement): void {
    const name = el._format;
    if (el._values) {
      document.activeElement !== el && this.restoreSelection(); // dropdown focused via keyboard keeps focus
      this.askMenu(name, el).then((v) => v != null && this.$format(name, v, true));
    } else {
      this.$format(name, el._value, false);
    }
  }

  /** Applies tool to selection like toolbar does (tool may be not rendered): sets value if passed,
   *  otherwise asks it (via `ask` or dropdown) or toggles format;
   *  inline format with collapsed selection is pending for the next typed text (like quill)
   * @param isSet set value (dropdown item, asked value etc.), otherwise toggle format (button); default: value is passed
   * @example
   * el.$format("bold"); // toggles bold
   * el.$format("header", 2); // sets heading 2
   * el.$format("list", "ordered", false); // toggles ordered list
   * el.$format("link"); // asks url via popup
   * el.$format("link", "https://example.com"); // wraps selection into link
   * el.$format("header"); // asks value via dropdown near selection */
  $format<K extends keyof WUP.TextRich.ToolValues>(name: K, value?: WUP.TextRich.ToolValues[K], isSet?: boolean): void;
  /** @param target element to place popup near (clicked embed) */
  $format(name: keyof WUP.TextRich.ToolValues, value: unknown, isSet: boolean, target?: HTMLElement): void;
  $format(name: keyof WUP.TextRich.ToolValues, value?: unknown, isSet?: boolean, target?: HTMLElement): void {
    if (this.$isDisabled || this.$isReadOnly) {
      return;
    }
    this.restoreSelection();
    const inp = this.$refInput;
    const sel = window.getSelection()!;
    if (!sel.rangeCount || !inp.contains(sel.anchorNode)) {
      return;
    }
    const tool: WUP.TextRich.Tool = this.#ctr.$tools[name];
    const b = this.findTool(name);
    if (value === undefined && (tool.ask || tool.values || b?._values)) {
      const cur = inp.getFormats().get(name);
      // restore by positions: focus can move out (to modal etc.) & nodes can be re-rendered
      const pos = inp.getSelectionPos();
      (tool.ask
        ? tool.ask(target ?? (b && !b.hidden ? b : inp), this as WUPTextRichControl, cur)
        : this.askMenu(name, target ?? sel.getRangeAt(0).cloneRange())
      ).then((v) => {
        if (v != null) {
          inp.focus({ preventScroll: true });
          inp.setSelectionPos(pos);
          this.$format(name, v, true);
        }
      });
      return;
    }
    inp.applyFormat(name, value ?? true, isSet ?? value !== undefined, this as WUPTextRichControl); // `true` for tool without values
  }

  /** Opened popup: $ask or dropdown menu */
  #ask?: TextRichAsk;
  #hoverTimer?: ReturnType<typeof setTimeout>;
  /** Hovered element with popup (see hoverOf): reset on popup close, so pointer move hovers it again
   *  (but not a stationary pointer: embed chosen via menu is a new element under it) */
  #under?: HTMLElement | null;
  /** The last target of pointer & its element with hover popup (see hoverOf) */
  #hoverAt?: [Element, HTMLElement | null];

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
    return new Promise((res) => {
      a.onClose = (v, isBack) => {
        this.#ask = undefined;
        this.#under = undefined;
        clearTimeout(this.#hoverTimer);
        isBack && this.restoreSelection(); // otherwise user moves focus
        res(v);
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
    const validations = { required: !hovered, url: (v?: string) => !!v && !Utils.Html.sanitizeUrl(v) && $errorLink };
    return this.$ask(target, url, { label: $textLink, validations }, hovered);
  }

  /** Asks tool value via its dropdown menu near target: focus stays in editor (or dropdown), menu is closed on selection change
   * @param target embed, token, dropdown or range (selection, typed trigger)
   * @param isHover opened by hover: closes on pointer leave, ignores keys (except Escape) & selection
   * @param onSelect called on selection change instead of closing: to filter by typed text etc.
   * @returns chosen value or `null` if canceled or tool isn't rendered as dropdown */
  protected askMenu(
    name: keyof WUP.TextRich.ToolValues,
    target: HTMLElement | Range,
    isHover?: boolean,
    onSelect?: (m: TextRichMenu) => void
  ): Promise<unknown> {
    const b = this.findTool(name);
    if (!b?._values) {
      return Promise.resolve(null);
    }
    const tool: WUP.TextRich.Tool = this.#ctr.$tools[name];
    const m = new TextRichMenu({
      button: b,
      owner: isHover ? null : (document.activeElement === b && b) || this.$refInput,
      target,
      values: b._values,
      selected: isHover ? tool.is?.(target as HTMLElement) : this.$refInput.getFormats().get(name) ?? false,
      render: (li, v) => this.renderMenuItem(li, tool, v),
    });
    if (!isHover) {
      const sel = window.getSelection()!;
      const pos = (): unknown[] => [sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset];
      const at = pos();
      m.onSelect = () => (onSelect ? onSelect(m) : pos().some((v, i) => v !== at[i]) && m.done());
    }
    return this.openAsk(m);
  }

  /** Returns items of menu of tool `command`: tools of toolbar (hidden ones too) except itself & clear button;
   *  dropdown gives item per value (`Font size: Huge`), tool with menu (mention etc.) - single item */
  protected commandValues(): WUP.TextRich.ToolValue[] {
    const arr: WUP.TextRich.ToolValue[] = [];
    this._opts.toolbar!.flat().forEach((item) => {
      // called on toolbar render
      const [name, picked] = (typeof item === "string" ? [item] : Object.entries(item)[0]) as [
        keyof WUP.TextRich.ToolValues,
        unknown
      ];
      const t: WUP.TextRich.Tool = this.#ctr.$tools[name];
      if (!t || name === "command" || name === "btnClear") {
        return;
      }
      const label = t.label ?? name;
      const values =
        picked === undefined
          ? t.values
          : [picked].flat().map((v) => t.values?.find((x) => x.value === v) ?? { value: v });
      if (!values || t.trigger) {
        arr.push({ value: name, label, hotKey: t.hotKey });
        return;
      }
      values.forEach((v) => {
        const l = v.label ?? stringPrettify(String(v.value), true, true);
        // `Heading 1` as is, `Huge` => `Font size: Huge`
        const full = t.label && !l.toLowerCase().includes(t.label.toLowerCase()) ? `${t.label}: ${l}` : l;
        arr.push({ value: `${name}:${v.value}`, label: full, hotKey: v.hotKey });
      });
    });
    return arr;
  }

  /** Applies tool chosen in menu of `command` (value `header:1`, `bold` etc.): tool with menu (`trigger` & values)
   *  inserts its trigger, tool with `placeholder` inserts it formatted & selected, other one is applied like $format */
  protected applyCommand(key: string): void {
    const [name, ...rest] = key.split(":") as [keyof WUP.TextRich.ToolValues, ...string[]];
    const tool: WUP.TextRich.Tool = this.#ctr.$tools[name];
    if (!tool) {
      return;
    }
    const s = rest.join(":"); // value can contain `:`
    const v = rest.length ? tool.values?.find((x) => `${x.value}` === s)?.value : undefined;
    const isMenu = !rest.length && !!tool.trigger && !!this.findTool(name)?._values;
    const text = isMenu ? tool.trigger : tool.placeholder;
    if (!text) {
      this.$format(name, v, !!rest.length);
      return;
    }
    const inp = this.$refInput;
    const [pos] = inp.getSelectionPos();
    inp.collectAuto(); // before changes: see recognize
    const t = document.createTextNode(text);
    inp.changeContent(() => inp.$insert(t));
    if (isMenu) {
      window.getSelection()!.collapse(t, t.length); // in text: like typed trigger
      this.gotTrigger(); // menu of tool
    } else if (tool.recognize) {
      inp.recognize();
      inp.setSelectionPos([pos, pos + text.length]); // to type over it
    } else {
      inp.setSelectionPos([pos, pos + text.length]);
      this.$format(name, v, !!rest.length);
    }
  }

  /** Called on typing: typed `trigger` opens tool dropdown; chosen value replaces trigger & text typed after it */
  protected gotTrigger(): void {
    const sel = window.getSelection()!;
    const n = sel.focusNode as Text | null;
    if (!sel.isCollapsed || n?.nodeType !== Node.TEXT_NODE) {
      return;
    }
    const s = n.data.slice(0, sel.focusOffset);
    const inp = this.$refInput;
    // at word start (`@` of email isn't mention) & tool has menu
    const found = inp._entries.find(
      ([k, t]) =>
        t.trigger &&
        s.endsWith(t.trigger) &&
        /(?:^|[\s([{"'])$/.test(s.slice(0, -t.trigger.length)) &&
        this.findTool(k)?._values
    );
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
        sel.isCollapsed && inp.contains(sel.focusNode) && typed.setEnd(sel.focusNode!, sel.focusOffset);
        const str = typed.toString();
        const q = str.startsWith(tr) && !/\s/.test(str) && str.slice(tr.length).toLowerCase();
        // label or value contains typed text: `{name` & `{firstName` show `First Name`
        const has = (x: string): boolean => x.toLowerCase().includes(q as string);
        (q === false ||
          !m.filter((v) => has(v.label ?? stringPrettify(String(v.value), true, true)) || has(String(v.value)))) &&
          m.done();
      }).then((v) => {
        if (v != null) {
          // select typed text: embed & token replace it, line formats delete it at first, action gets it selected
          sel.setBaseAndExtent(r.startContainer, r.startOffset, sel.focusNode!, sel.focusOffset);
          const isLine = tool.kind === "line" || tool.kind === "lineStyle";
          isLine && inp.changeContent(() => sel.getRangeAt(0).deleteContents());
          this.$format(name, v, true);
        }
      });
    }
  }

  /** Called before typing: typed pair of trigger (see $wrapChars) turns typed text into token even if it isn't in values
   *  (`{someProp` + `}` gives placeholder `someProp`) unless `is` rejects it
   * @returns false if typed text isn't token */
  protected gotTokenEnd(data: string): boolean {
    const found = this.$refInput.tokenEnd(data); // typed text is selected
    if (!found) {
      return false;
    }
    this.#ask?.done(); // trigger menu
    this.$format(found[0], found[1], true); // separate undo step
    return true;
  }

  /** Returns tool name if element is its embed or token & it's editable (tool is rendered):
   *  via `ask` on click or via dropdown on hover (`isHover`) */
  protected embedTool(el: Element, isHover?: boolean): keyof WUP.TextRich.ToolValues | undefined {
    const [name, t] =
      this.$refInput._entries.find(
        ([, x, is]) => (x.kind === "embed" || (x.kind === "inline" && x.trigger)) && is?.(el)
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
          Utils.Ranges.select(el);
          this.$format(name, v, true); // replaces element, caret goes after it
        }
      });
    } else if (el.tagName === "A") {
      this.askLink(el, el.getAttribute("href")!, el).then(
        (url) =>
          url != null &&
          this.$refInput.changeContent(() => (url ? el.setAttribute("href", url) : el.replaceWith(...el.childNodes)))
      );
    }
  }

  protected gotToolbarClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest("[tool]") as ToolElement | null;
    if (el?._format) {
      const l = this.#ask;
      l?.done();
      // click on dropdown toggles its menu (not menu near range: typed trigger etc.)
      !(el._values && l instanceof TextRichMenu && l.target === el) && this.applyTool(el);
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
      const arr = Array.from(this.$refToolbar.querySelectorAll<HTMLElement>("[role=group] > button:not([hidden])"));
      const i = arr.indexOf(el);
      arr.at({ Home: 0, End: -1, ArrowLeft: i - 1, ArrowRight: (i + 1) % arr.length }[k])!.focus(); // Arrows cycle
    } else {
      return false;
    }
    return true;
  }

  protected override gotFocus(ev: FocusEvent): Array<() => void> {
    const arr = super.gotFocus(ev);
    const inp = this.$refInput;
    const onSelect = (): void => {
      const sel = window.getSelection();
      if (sel?.rangeCount && inp.contains(sel.getRangeAt(0).startContainer)) {
        this.#range = sel.getRangeAt(0).cloneRange();
        inp.gotSelect(); // resets pending formats if caret moved
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
    this.$refInput.gotFocusLost();
    this.refreshToolbar(new Map());
  }

  /** Returns rendered button or dropdown by key `name` or `name:value` */
  protected findTool(key: string): ToolElement | null {
    // not via selector `[tool="${key}"]`: value can contain quotes (`"Times New Roman", serif`)
    const arr = this.$refToolbar.querySelectorAll<ToolElement>("[tool]");
    return Array.prototype.find.call(arr, (el: Element) => el.getAttribute("tool") === key) ?? null;
  }

  /** Applies rendered button or dropdown item by key `name` or `name:value`
   * @returns false if it isn't rendered */
  protected applyKey(key: string): boolean {
    const el = this.findTool(key);
    if (el) {
      el._format ? this.applyTool(el) : el.click(); // clear button isn't ToolElement
      return true;
    }
    const [name, ...rest] = key.split(":") as [keyof WUP.TextRich.ToolValues, ...string[]];
    const v = rest.join(":"); // value can contain `:`
    const item = this.findTool(name)?._values?.find((x) => `${x.value}` === v);
    item && this.$format(name, item.value, true);
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
      this.$refToolbar.querySelector<HTMLElement>("button:not([hidden])")?.focus();
      return true;
    }
    const found = this.$refInput._entries.find(
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
    const cur = this.$refInput.getFormats().get(name) ?? false;
    const at = values.findIndex((v) => v.value === cur);
    const next = (i ? values.slice(at + 1) : values.slice(0, at < 0 ? undefined : at).reverse()).find(isRendered);
    next && this.$format(name, next.value, true);
    return true;
  }

  /** Tab/Shift+Tab in list item: moves selected items to the next/previous level (via rendered tool `indent`)
   * @returns false if nothing is changed: focus goes to the next/previous element as usual */
  protected gotTab(isOut: boolean): boolean {
    const inp = this.$refInput;
    const sel = window.getSelection()!;
    if (!sel.rangeCount || !Utils.Lines.of(sel.getRangeAt(0), inp).some((l) => l.tagName === "LI")) {
      return false;
    }
    const prev = inp.value;
    return this.applyKey(`indent:${isOut ? -1 : 1}`) && inp.value !== prev;
  }

  protected override gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    const t = e.target as Node;
    const inp = this.$refInput;
    const isInp = t === inp;
    const isBar = this.$refToolbar.contains(t);
    const l = this.#ask;
    const k = e.key;
    const isMod = e.altKey || e.ctrlKey || e.metaKey;
    const isArrow = !isMod && !e.shiftKey && (k === "ArrowRight" || k === "ArrowLeft");
    /^(Arrow|Home$|End$|Page)/.test(k) && inp.resumeRecognize(); // caret leaves word
    if (
      ((isInp || isBar) && this.gotHotKey(e)) || // not for control in link popup
      // menu keys: otherwise caret moves, line is added, button is clicked etc.
      ((isInp || isBar) && l?.onKey?.(e)) ||
      (isBar && !isMod && this.gotToolbarKey(e)) ||
      (isInp && k === "Tab" && !isMod && this.gotTab(e.shiftKey)) ||
      // arrow at the edge of format (bold, link) or ArrowRight at the end of the last block (list etc.): see leaveFormats
      (isInp && isArrow && inp.leaveFormats(k === "ArrowRight"))
    ) {
      e.preventDefault();
    } else if (k === "Escape" && l?.hovered) {
      e.preventDefault(); // closes hover popup instead of closing modal etc.
      l.done();
    } else if (k === "Escape") {
      // right after recognizing (link, list by `1. ` etc.) it's undone like via Ctrl+Z; value isn't cleared (clear button only)
      isInp && inp.undoAuto() && e.preventDefault();
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
    const inp = this.$refInput;
    inp.gotBeforeInput(e); // before changes
    super.gotBeforeInput(e); // undo/redo & state before changes
    if (e.defaultPrevented) {
      return;
    }
    const s = t === "insertText" && e.data;
    if (s && (inp.wrapSelection(s) || this.gotTokenEnd(s))) {
      e.preventDefault(); // done via changeContent: separate undo step
    } else if (inp.replaceInput(e)) {
      // fired input has no inputType: gotInput skips it
      s && this.gotTrigger();
      s && inp.gotRecognize(s);
    }
  }

  protected override createHistory(): TextHistory {
    return (this.$refInput._history = new TextRichHistory(this.$refInput)); // custom changes of editor are saved via it
  }

  protected override gotInput(e: WUP.Text.GotInputEvent): void {
    super.gotInput(e);
    e.inputType === "insertText" && this.gotTrigger();
    this.$refInput.gotInput(e);
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

// todo prop hotKeys replace to KnownKeys[] - is there any type-list of keyboard keys?
