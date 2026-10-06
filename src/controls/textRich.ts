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
  htmlToEditor,
  htmlToText,
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
  inlineFormats,
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
      /** Font size: `"sm"` - small, `"lg"` - large, `"hg"` - huge; `false` - default */
      size: "sm" | "lg" | "hg" | false;
      /** Text alignment; `"left"` - default */
      align: "left" | "center" | "right" | "justify";
    }
    /** Toolbar button: toggles format (bold, blockquote etc.), inserts link,
     *  removes formatting of selected text (clean-format) or clears value (clear)
     * @tutorial Rules
     * * `clear` is the button clear of other controls ($refBtnClear): it's rendered if `$options.clearButton` is true
     * and works according to `$options.clearActions` (the same as Esc) */
    type ToolbarButton =
      | "bold"
      | "italic"
      | "underline"
      | "strike"
      // todo add quote - suggest similar icon as blockquote - probably different look of this char: "
      | "blockquote"
      | "code-block"
      | "link"
      | "clean-format"
      | "clear";
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
    /** Key of toolbar item: button `"bold"`, dropdown `"size"` or format with value `"header:1"` */
    type ToolKey =
      | ToolbarButton
      | keyof FormatValues
      | { [K in keyof FormatValues]: `${K}:${FormatValues[K]}` }[keyof FormatValues];
    /** Keyboard shortcuts of toolbar items in format of `aria-keyshortcuts`: `Control+Shift+X`
     *  (several shortcuts are separated by space: `Control+Shift+X Alt+Shift+5`); point `undefined` to disable shortcut
     * @tutorial Rules
     * * `Control` is Cmd on macOS/iOS (shown as `⌘`)
     * * shortcut must contain `Control` or `Alt`; key is compared by physical key (`KeyboardEvent.code`), so it works with any keyboard layout
     * * shortcut works only if related tool is rendered in toolbar (see $options.toolbar)
     * * `size`: the 1st shortcut increases font size, the 2nd one decreases it
     * * `toolbar`: focuses toolbar (Arrows to navigate, Esc to return)
     * * `clear`: Escape clears value according to $options.clearActions (the same as in other controls) */
    type HotKeys = { [K in ToolKey | "toolbar"]?: string };

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
       *   ["clean-format"], // removes formatting
       *   ["clear"], // clears value: button clear (if $options.clearButton is true)
       * ]
       * @defaultValue every supported item */
      toolbar: ToolbarGroup[];
      /** Hide keyboard shortcuts in tooltips of toolbar buttons (`Bold (Ctrl+B)` => `Bold`) & in items of dropdowns;
       *  `aria-keyshortcuts` is set anyway
       * @see {@link WUPTextRichControl.$hotKeys}
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

/** Toolbar buttons without value */
const toolButtons = new Set<string>([
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "code-block",
  "link",
  "clean-format",
]);
/** Formats rendered as dropdown with default value (when format isn't applied); other formats are rendered as buttons */
const pickerDefaults = new Map<string, unknown>([
  ["header", false],
  ["size", false],
  ["align", "left"],
]);
/** Buttons without pressed state */
const actionButtons = new Set<string>(["clean-format", "indent"]);
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
  ["BLOCKQUOTE", ["blockquote", true]],
  ["PRE", ["code-block", true]],
  ["OL", ["list", "ordered"]],
  ["UL", ["list", "bullet"]],
]);
/** Values of format `size` from smaller to larger: shortcuts of `size` change font size step by step */
const sizeSteps: unknown[] = ["sm", false, "lg", "hg"];
/** Formatting via browser (keyboard shortcuts etc.): `beforeinput.inputType` => tool; other `format...` are prevented */
const formatInputs = new Map<string, WUP.TextRich.ToolKey>([
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
/** Codes of keys formatting via browser (Ctrl/Cmd + B, I, U): prevented so only shortcuts of $hotKeys work */
const browserHotKeys = new Set<string>(["KeyB", "KeyI", "KeyU"]);
/** Inline formats that can be pointed for the next typed text (when selection is collapsed) */
const pendingFormats = new Set<string>(["bold", "italic", "underline", "strike", "script", "size"]);

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
 * * $value is html (`undefined` if there is no text); it's sanitized: only supported formats are kept
 * (paragraph `<p>`, `<strong>`, `<em>`, `<u>`, `<s>`, `<sub>`, `<sup>`, `<a>`, `<h1>...<h6>`, `<blockquote>`, `<pre>`, `<ol>`, `<ul>`)
 * * formatting is saved in custom history: undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y, OS-native) works for text & formats
 * * keyboard shortcuts (see static $hotKeys) are similar to Google Docs: Ctrl+B, Ctrl+Shift+7, Ctrl+Alt+1 etc. (Cmd on macOS/iOS);
 * they're shown in tooltips of toolbar buttons & in items of dropdowns (see $options.hideHotKeysHint);
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
 * <wup-popup link><wup-text/></wup-popup> // to enter url: appended on click on toolbar button `link` or on hover on link */
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
    ["clean-format", __wupln("Clear formatting", "aria")],
    ["clear", __wupln("Clear content", "aria")],
    ["clear:back", __wupln("Restore", "aria")], // the next clearing restores previous value (see $options.clearActions)
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
    ["size:hg", __wupln("Huge", "content")],
    ["size:lg", __wupln("Large", "content")],
    ["size:false", __wupln("Default", "content")],
    ["size:sm", __wupln("Small", "content")],
    ["align", __wupln("Alignment", "aria")],
    ["align:left", __wupln("Left", "aria")],
    ["align:center", __wupln("Center", "aria")],
    ["align:right", __wupln("Right", "aria")],
    ["align:justify", __wupln("Justify", "aria")],
  ]);

  /** Keyboard shortcuts of toolbar items: change it to redefine shortcuts (applied on the next rendering of toolbar)
   * @see {@link WUP.TextRich.HotKeys}
   * @example
   * WUPTextRichControl.$hotKeys.strike = "Control+Shift+S";
   * delete WUPTextRichControl.$hotKeys["header:6"]; // disable shortcut
   * @defaultValue similar to Google Docs, Gmail & Slack */
  static $hotKeys: WUP.TextRich.HotKeys = {
    toolbar: "Alt+F10",
    bold: "Control+B",
    italic: "Control+I",
    underline: "Control+U",
    strike: "Control+Shift+X", // possible "Control+Shift+X Alt+Shift+5", // Alt+Shift+5 - the same as in Google Docs
    blockquote: "Control+Shift+9",
    "code-block": "Control+Alt+Shift+C",
    link: "Control+K",
    "clean-format": "Control+\\",
    clear: "Escape",
    "header:false": "Control+Alt+0",
    "header:1": "Control+Alt+1",
    "header:2": "Control+Alt+2",
    "header:3": "Control+Alt+3",
    "header:4": "Control+Alt+4",
    "header:5": "Control+Alt+5",
    "header:6": "Control+Alt+6",
    "list:ordered": "Control+Shift+7",
    "list:bullet": "Control+Shift+8",
    "script:sub": "Control+,",
    "script:super": "Control+.",
    "indent:-1": "Control+[",
    "indent:1": "Control+]",
    size: "Control+Shift+. Control+Shift+,", // increase & decrease
    "align:left": "Control+Shift+L",
    "align:center": "Control+Shift+E",
    "align:right": "Control+Shift+R",
    "align:justify": "Control+Shift+J",
  };

  /** Values of formats used when toolbar item is pointed as string (ex. `"header"` is the same as `{ header: [1, 2, 3, 4, 5, 6, false] }`) */
  static $toolbarValues: WUP.TextRich.ToolbarValues = {
    header: [1, 2, 3, 4, 5, 6, false],
    list: ["ordered", "bullet"],
    script: ["sub", "super"],
    indent: [-1, 1],
    size: ["hg", "lg", false, "sm"],
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
      ["size"], // equal to [{size: ["hg", "lg", false, "sm"]}]
      // not supported => direction
      // not supported => [{ font: [] }],
      // not supported => { colors: true },
      // not supported => [{ background: [] }],
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

  $refInput = document.createElement("wup-richinput") as HTMLInputElement;
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
    bar.setAttribute("aria-label", this.#ctr.$labels.get("toolbar")!);
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
    const isHints = propsChanged?.includes("hideHotKeysHint");
    (!propsChanged || isHints || propsChanged.includes("toolbar") || propsChanged.includes("clearButton")) &&
      this.renderToolbar();
    isHints && this.setClearState(); // button clear isn't re-rendered: update its tooltip
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
    const [format, values] = (
      typeof item === "string"
        ? [item, this.#ctr.$toolbarValues[item as keyof WUP.TextRich.FormatValues]]
        : Object.entries(item)[0]
    ) as [string, unknown[] | undefined];

    if (format === "clear") {
      this.$refBtnClear && group.appendChild(this.$refBtnClear); // it's created by super if $options.clearButton is true
    } else if (!values) {
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
    this.setToolLabel(b, key);
    !actionButtons.has(format) && b.setAttribute("aria-pressed", false);
    b._format = format;
    b._value = value;
  }

  /** Sets `aria-label` & tooltip of toolbar button by key of `$labels`;
   *  tooltip includes keyboard shortcut `{Tool} ({HotKeys})` if it exists & isn't hidden via $options.hideHotKeysHint */
  protected setToolLabel(b: HTMLElement, key: string): void {
    const label = this.#ctr.$labels.get(key) ?? key;
    b.setAttribute("aria-label", label);
    const hint = this.setHotKeys(b, b.getAttribute("tool") ?? key); // button clear: the same shortcut for `clear` & `clear:back`
    b.setAttribute("w-tooltip", hint && `${label} (${hint})`); // empty: tooltip shows aria-label
  }

  /** Sets `aria-keyshortcuts` of toolbar item by $hotKeys (`Control` is `Meta` on macOS/iOS)
   * @returns text of shortcuts: `Ctrl+Shift+X / Alt+Shift+5` or `⇧⌘X` on macOS/iOS (empty if hidden via $options.hideHotKeysHint) */
  protected setHotKeys(el: HTMLElement, key: string): string {
    const hk = this.#ctr.$hotKeys[key as WUP.TextRich.ToolKey];
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
    this.setToolLabel(b, "clear");
    b.addEventListener("click", () => {
      this.restoreSelection(); // the same as other tools: focus is returned to editor
      this.clearValue();
    });
    return b;
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
    this.setToolLabel(b, format);
    const ul = dd.appendChild(document.createElement("wup-popup")).appendChild(document.createElement("ul"));
    ul.setAttribute("role", "listbox");
    values.forEach((v) => {
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
      const hint = this.setHotKeys(li, key);
      if (hint) {
        const kbd = li.appendChild(document.createElement("kbd")); // at the right side of item (like in menus of OS)
        kbd.setAttribute("aria-hidden", true); // announced via aria-keyshortcuts
        kbd.textContent = hint;
      }
      li._format = format;
      li._value = v;
    });
  }

  /** Updates state of toolbar items according to formats of selection (skipped if formats aren't changed) */
  protected refreshToolbar(formats = this.getFormats()): void {
    const shown = JSON.stringify([...formats]);
    if (shown === this.#shown) {
      return;
    }
    this.#shown = shown;
    this.$refToolbar.querySelectorAll<ToolElement>("[tool]").forEach((el) => {
      const f = el._format ?? el.getAttribute("tool")!; // dropdown & button clear don't have `_format`
      const cur = formats.get(f) ?? pickerDefaults.get(f);
      if (el.tagName === "LI") {
        el.setAttribute("aria-selected", el._value === cur);
      } else if (el.hasAttribute("aria-pressed")) {
        el.setAttribute("aria-pressed", el._value === undefined ? cur !== undefined : cur === el._value);
      } else if (f === "align") {
        el.firstElementChild!.setAttribute("value", String(cur)); // icon of dropdown is defined by value
      } else if (pickerDefaults.has(f)) {
        el.firstElementChild!.textContent = this.#ctr.$labels.get(`${f}:${cur}`) ?? String(cur);
      }
    });
  }

  /** Returns formats applied to selection (defined by the start of selection) including formats for the next typed text */
  protected getFormats(): Map<string, unknown> {
    const m = new Map<string, unknown>();
    const inp = this.$refInput;
    const sel = window.getSelection();
    const n = sel?.rangeCount ? firstNode(sel.getRangeAt(0)) : null;
    if (n && inp.contains(n)) {
      let el = (n.nodeType === Node.ELEMENT_NODE ? n : n.parentElement) as HTMLElement;
      for (; el !== inp; el = el.parentElement!) {
        const f = tagFormats.get(el.tagName);
        f && !m.has(f[0]) && m.set(f[0], f[1]);
        el.tagName === "A" && m.set("link", el.getAttribute("href"));
        const size = sizeFormats.get(el.style.fontSize);
        size && !m.has("size") && m.set("size", size);
        const a = el.style.textAlign;
        !m.has("align") && textAligns.has(a) && m.set("align", a);
      }
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
    if (format === "link" && !f.has("link")) {
      this.askLink(this.findTool("link") ?? inp, "https://").then(
        (url) => url && this.changeContent(() => this.addLink(url))
      );
    } else if (sel.isCollapsed && (pendingFormats.has(format) || format === "clean-format")) {
      // format for the next typed text (Ctrl+B and type text)
      const p = this.#pending;
      if (format === "clean-format") {
        pendingFormats.forEach((k) => f.has(k) && p.set(k, false));
      } else if (format === "size") {
        p.set(format, value || false);
      } else if (format === "script") {
        p.set(format, f.get(format) === value ? false : value);
      } else {
        p.set(format, !f.has(format));
      }
      this.#pendingAt = [sel.anchorNode!, sel.anchorOffset];
      this.refreshToolbar();
    } else {
      this.changeContent(() => this.keepSelection((r) => this.formatRange(r, format, value)));
    }
  }

  /** Calls fn that changes editor (not by browser), saves changes to history, updates $value & toolbar */
  protected changeContent(fn: () => void): void {
    const inp = this.$refInput as unknown as WUPTextRichInput;
    const prev = inp.value;
    fn();
    inp._cached = undefined;
    if (inp.value !== prev) {
      this._refHistory?.save(prev, inp.value);
      this.fireInput();
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
      case "script": {
        // toggle: format is removed if every text node has it already
        const nodes = splitRange(r);
        const isScript = format === "script";
        isScript && removeInline(nodes, inlineFormats.get(value === "sub" ? "script:super" : "script:sub")!, inp); // only one is possible
        const fmt = inlineFormats.get(isScript ? `script:${value}` : format)!;
        nodes.every((t) => formatParents(t, fmt, inp).length)
          ? removeInline(nodes, fmt, inp)
          : addInline(nodes, fmt, true, inp);
        break;
      }
      case "size":
      case "link": {
        const fmt = inlineFormats.get(format)!;
        // remove link: whole link if selection is collapsed
        const a = format === "link" && !value && r.collapsed && formatParents(r.startContainer, fmt, inp)[0];
        if (a) {
          a.replaceWith(...a.childNodes);
        } else {
          const nodes = splitRange(r);
          removeInline(nodes, fmt, inp);
          value && addInline(nodes, fmt, value, inp);
        }
        break;
      }
      case "header":
        linesOf(r, inp).forEach((l) => setLineTag(l, value ? `H${value}` : "DIV"));
        break;
      case "blockquote":
      case "code-block": {
        const lines = linesOf(r, inp);
        const tag = format === "blockquote" ? "BLOCKQUOTE" : "PRE";
        const isOn = lines.every((l) => l.tagName === tag);
        lines.forEach((l) => setLineTag(l, isOn ? "DIV" : tag));
        break;
      }
      case "list": {
        const lines = linesOf(r, inp);
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
        inp.querySelectorAll(":scope > ol + ol, :scope > ul + ul").forEach((el) => {
          el.previousElementSibling!.append(...el.childNodes);
          el.remove();
        });
        break;
      }
      case "align":
      case "indent":
        linesOf(r, inp).forEach((l) => {
          if (format === "align") {
            l.style.textAlign = value === "left" ? "" : (value as string);
          } else {
            // 3em per level (the same as quill)
            const m = /^(\d+(\.\d+)?)em$/.exec(l.style.marginLeft);
            const level = Math.min(8, Math.max(0, Math.round((m ? +m[1] : 0) / 3) + (value as number)));
            l.style.marginLeft = level ? `${level * 3}em` : "";
          }
          this.removeEmptyStyle.call(l);
        });
        break;
      case "clean-format": {
        const lines = linesOf(r, inp); // before changes in range
        const nodes = splitRange(r);
        inlineFormats.forEach((fmt) => removeInline(nodes, fmt, inp));
        lines.forEach((l) => setLineTag(l, "DIV").removeAttribute("style"));
        break;
      }
      // no default
    }
  }

  /** Formats for the next typed text (when selection is collapsed): format => value (`false` to remove format) */
  #pending = new Map<string, unknown>();
  /** Position of caret when formats for the next typed text are pointed: they're reset when caret is moved */
  #pendingAt?: [Node, number];

  /** Inserts text with formats pointed for the next typed text */
  protected insertPending(text: string): void {
    const inp = this.$refInput;
    const sel = window.getSelection()!;
    const r = sel.getRangeAt(0);
    r.deleteContents();
    // move caret out of elements of removed/changed formats: `true` means format without value is added
    this.#pending.forEach((v, k) => {
      if (v !== true) {
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
        const el = fmt.create(v);
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

  /** Popup with text control to enter url of link: `done` closes it & resolves url (`null` if canceled),
   * `isBack` - return focus & selection to editor; `a` - link which url is edited via popup opened by hover */
  #link?: { popup: WUPPopupElement; done: (url: string | null, isBack: boolean) => void; a?: HTMLAnchorElement };
  #hoverTimer?: ReturnType<typeof setTimeout>;

  /** Asks url of link via popup with text control: Enter submits, Escape or moving focus out cancels (resolves `null`);
   *  returns focus & selection back to editor on Enter/Escape
   * @param target element popup is placed near
   * @param url initial value of text control
   * @param isHover popup is opened by hover (to edit existed link): text control isn't focused, popup is closed when pointer leaves it,
   * clearing value (Enter with empty value or button clear) resolves `""` to remove link */
  protected askLink(target: HTMLElement, url: string, isHover = false): Promise<string | null> {
    this.#link?.done(null, false); // only one popup at once
    const p = document.createElement("wup-popup");
    p.$options.openCase = PopupOpenCases.onInit;
    p.$options.target = target;
    p.setAttribute("link", "");
    const el = p.appendChild(document.createElement("wup-text"));
    el.$options.label = this.#ctr.$textLink;
    el.$options.validations = { required: !isHover, url: (v) => !!v && !sanitizeUrl(v) && this.#ctr.$errorLink };
    el.$options.validationCase = ValidationCases.onChangeSmart; // without onFocusWithValue: otherwise error is shown at once
    el.$options.readOnly = this.$isReadOnly;
    el.$options.autoFocus = !isHover;
    el.$initValue = url;

    return new Promise((resolve) => {
      const done = (v: string | null, isBack: boolean): void => {
        this.#link = undefined;
        clearTimeout(this.#hoverTimer);
        isBack && this.restoreSelection(); // otherwise focus is moved by user
        p.$close().finally(() => p.remove());
        resolve(v);
      };
      this.#link = { popup: p, done, a: isHover ? (target as HTMLAnchorElement) : undefined };
      p.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault(); // otherwise value of control is cleared
          done(null, true);
        } else if (e.key === "Enter") {
          e.preventDefault(); // otherwise form is submitted
          !el.$validate() && done(el.$value ?? "", true);
        }
      });
      el.addEventListener("$change", (e) => {
        e.stopPropagation(); // nested control isn't related to form
        isHover && e.detail.reason === SetValueReasons.clear && el.$value === undefined && done("", true);
      });
      p.addEventListener(
        "focusout",
        (e) => this.#link?.done === done && !p.contains(e.relatedTarget as Node) && done(null, false)
      );
      // closed by itself: when target is removed
      p.addEventListener("$close", (e) => e.target === p && this.#link?.done === done && done(null, false));
      p.addEventListener("pointerenter", () => this.#link?.a && this.gotHoverLink(this.#link.a));
      p.addEventListener("pointerleave", () => this.gotHoverLink(null));
      this.appendChild(p);
    });
  }

  /** Called when pointer is over link or its popup (`a` is related link) or out of them (`a` is `null`):
   *  shows popup to edit url of link with delay & hides it when pointer is out (but not while user edits url) */
  protected gotHoverLink(a: HTMLAnchorElement | null): void {
    const l = this.#link;
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
          this.askLink(a, a.getAttribute("href")!, true).then(
            (url) =>
              url != null &&
              this.changeContent(() => (url ? a.setAttribute("href", url) : a.replaceWith(...a.childNodes)))
          );
        } else {
          this.#link?.done(null, false);
        }
      },
      a ? hoverOpenTimeout : hoverCloseTimeout
    );
  }

  /** Adds link to selection or inserts link with url as text if selection is collapsed */
  protected addLink(href: string): void {
    if (window.getSelection()!.isCollapsed) {
      const a = inlineFormats.get("link")!.create(href);
      a.textContent = href;
      this.insertNode(a);
    } else {
      this.keepSelection((r) => this.formatRange(r, "link", href));
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
      sel.collapse(r.startContainer, r.startOffset);
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
        if (listTags.has(el.tagName)) {
          Array.from(el.children).forEach(flatten);
          return;
        }
        frag.lastChild && frag.append(document.createElement("br"));
        Array.from(el.childNodes).forEach((n) => (listTags.has(n.nodeName) ? flatten(n as Element) : frag.append(n)));
      };
      Array.from(f.children).forEach(flatten);
      this.insertNode(frag);
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

  /** Called on keydown in editor or toolbar: applies tool by keyboard shortcut ($hotKeys) if tool is rendered in toolbar
   * @returns true if event must be prevented */
  protected gotHotKey(e: KeyboardEvent): boolean {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    // AltGraph: AltGr+key (the same as Ctrl+Alt+key on Windows) types char with some keyboard layouts
    if ((!mod && !e.altKey) || (isMac ? e.ctrlKey : e.metaKey) || e.getModifierState("AltGraph")) {
      return false;
    }
    const key = (codeKeys.get(e.code) ?? e.code.replace(/^(Key|Digit)/, "")).toUpperCase();
    let i = -1; // index of pressed shortcut of tool
    const tool = Object.entries(this.#ctr.$hotKeys).find(([, hk]) => {
      i =
        hk?.split(" ").findIndex((s) => {
          const keys = s.split("+");
          return (
            keys.pop()!.toUpperCase() === key &&
            keys.includes("Control") === mod &&
            keys.includes("Alt") === e.altKey &&
            keys.includes("Shift") === e.shiftKey
          );
        }) ?? -1;
      return i !== -1;
    })?.[0];
    if (!tool) {
      return mod && !e.altKey && !e.shiftKey && browserHotKeys.has(e.code); // otherwise browser formats via beforeinput
    }
    if (tool === "toolbar") {
      this.$refToolbar.querySelector("button")?.focus();
      return true;
    }
    const el = this.findTool(tool);
    if (!el) {
      return false; // tool isn't rendered: browser shortcut works as usual
    }
    if (tool === "size") {
      // the 1st shortcut increases font size, the 2nd one decreases it: to the nearest value of dropdown
      const cur = sizeSteps.indexOf(this.getFormats().get("size") ?? false);
      const next = (i ? sizeSteps.slice(0, cur).reverse() : sizeSteps.slice(cur + 1)).find((v) =>
        this.findTool(`size:${v}`)
      );
      next !== undefined && this.applyFormat("size", next);
    } else {
      el._format ? this.applyFormat(el._format, el._value) : el.click(); // button clear isn't ToolElement
    }
    return true;
  }

  protected override gotKeyDown(e: KeyboardEvent & { submitPrevented?: boolean }): void {
    const t = e.target as Node;
    if ((t === this.$refInput || this.$refToolbar.contains(t)) && this.gotHotKey(e)) {
      e.preventDefault(); // skipped for nested control in popup of link
      return;
    }
    const l = this.#link;
    if (e.key === "Escape" && l?.a) {
      e.preventDefault(); // otherwise value is cleared: the 1st Escape closes popup of link
      l.done(null, false);
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

  protected override setInputValue(v: string, reason: SetValueReasons): void {
    if (v && v === this.$refInput.value) {
      return; // skip re-rendering: it resets selection & scroll
    }
    super.setInputValue(v, reason);
  }

  protected override setClearState(): ValueType | undefined {
    const next = super.setClearState();
    // label (tooltip) of button clear depends on state like its icon: the next clearing restores previous value or clears it
    this.$refBtnClear && this.setToolLabel(this.$refBtnClear, this.#ctr.$isEmpty(next) ? "clear" : "clear:back");
    return next;
  }
}

customElements.define(tagName, WUPTextRichControl);
