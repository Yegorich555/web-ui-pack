import Example from "src/elements/example";
import MyLink from "src/elements/myLink";
import { WUPTextRichControl } from "web-ui-pack";
import imageConvert from "web-ui-pack/helpers/files/imageConvert";
import selectFiles from "web-ui-pack/helpers/files/selectFiles";
import imgLogo from "../../../assets/logo-small.png";
import styles from "./textRich.custom.scss";

WUPTextRichControl.$use();

declare global {
  namespace WUP.TextRich {
    // custom tools: key is name of tool, value is type of its value
    interface ToolValues {
      /** Text direction of line: right-to-left (Arabic, Hebrew etc.); `false` - default */
      direction: "rtl" | false;
      /** Font family of text; `false` - default */
      font: "serif" | "monospace" | false;
      /** Url of image: it's asked via browser-dialog to select file */
      image: string;
      /** Name of placeholder `{firstName}`: it's chosen from menu shown on typing `{` */
      placeholder: string;
      /** Phone of link `tel:`: typed phone in format `+1 (555) 123-45-67` is recognized */
      phone: string;
      /** Css color `#ff0000` shown with swatch: typed color is recognized */
      colorCode: string;
      /** Hashtag `#news` (text without `#`): typed hashtag is recognized */
      tag: string;
      /** Mention `@john` (name without `@`): it's chosen from menu shown on typing `@` */
      mention: string;
      /** Inline code `<code>`: typed `` `code` `` is formatted */
      codeInline: true;
    }
  }
}

// markdown shortcuts like in Notion & Slack: line formats by text typed at line start (it's removed)
const { header, blockquote, code, bold, italic, strike } = WUPTextRichControl.$tools;
header.values!.forEach((v) => {
  v.value && (v.recognize = new RegExp(`^#{${v.value}}\\s$`)); // `# ` ... `###### `
});
blockquote.recognize = /^>\s$/; // `> `
code.recognize = /^```$/; // without space like in Notion
// RegExp with group `text`: text of group is formatted on typed closing marker, markers are removed (`**bold**` => `bold`)
bold.recognize = /(?<!\S)\*\*(?<text>[^*\s](?:[^*]*[^*\s])?)\*\*$/;
italic.recognize = /(?<!\S)_(?<text>[^_\s](?:[^_]*[^_\s])?)_$/;
strike.recognize = /(?<!\S)~~(?<text>[^~\s](?:[^~]*[^~\s])?)~~$/;

WUPTextRichControl.$tools.codeInline = {
  label: "Inline code",
  className: styles.iconCode,
  hotKey: ["Control", "E"], // like in Notion
  kind: "inline",
  recognize: /(?<!\S)`(?<text>[^`\s](?:[^`]*[^`\s])?)`$/, // markdown: `code`
  is: (el) => el.tagName === "CODE" || undefined,
  create: "code",
};

WUPTextRichControl.$tools.direction = {
  values: [{ value: "rtl", label: "Right to left", className: styles.iconRtl }], // label & icon of button `{ direction: "rtl" }`
  kind: "lineStyle", // default format toggles style of selected lines
  is: ({ style: { direction: d } }) => (d === "rtl" ? d : undefined),
  set: (el, v) => (el.style.direction = v || ""),
};

const fonts = new Set(["serif", "monospace"]);
WUPTextRichControl.$tools.font = {
  label: "Font",
  className: styles.font,
  values: [
    { value: false, label: "Default font" }, // otherwise the same as `Default` of size
    { value: "serif" }, // label is prettified value: `Serif`
    { value: "monospace" },
  ],
  kind: "inline", // default format wraps selected text into element via `create` (dropdown item shows label inside it)
  // WARN: sanitizer calls it for pasted html: unsupported font is removed (`false`)
  is: ({ tagName, style: { fontFamily: f } }) =>
    tagName === "SPAN" && f ? fonts.has(f) && (f as WUP.TextRich.ToolValues["font"]) : undefined,
  create: (v) => {
    const el = document.createElement("span");
    el.style.fontFamily = v || "";
    return el;
  },
};

/** Returns url of image if it's safe (it's called by sanitizer for pasted html): http(s), relative or data-url of image */
function imageUrl(src: string | null): string | undefined {
  try {
    // relative url `/someImage.png` is resolved via baseURI, so its protocol is http(s) too
    return src && (/^data:image\//i.test(src) || /^https?:$/.test(new URL(src, document.baseURI).protocol))
      ? src
      : undefined;
  } catch {
    return undefined; // invalid url
  }
}

WUPTextRichControl.$tools.image = {
  label: "Insert image",
  className: styles.iconImage,
  kind: "embed", // default format inserts element via `create` & places caret after it
  is: (el) => (el.tagName === "IMG" ? imageUrl(el.getAttribute("src")) : undefined),
  create: (src) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.style.maxWidth = "100%";
    return img;
  },
  // value is asked on click on button or image (it's replaced by new one)
  // real app uploads file & returns its url `selectFiles((files) => api.upload(files[0]))`
  // here image is reduced & stored in value as data-url
  ask: (_target, control) =>
    selectFiles(
      async ([f]) => {
        const r = new FileReader();
        r.readAsDataURL(await imageConvert(f, { maxWidth: 640, maxHeight: 480 }));
        await new Promise((res) => {
          r.onloadend = res;
        });
        return r.result as string; // data-url
      },
      { accept: ["image/*"], maxSize: 20_000_000 }
    ).catch((err: Error) => {
      control.$showError(err.message); // invalid format of file etc.
      return null; // cancelled
    }),
};

/** Names of placeholders: `{firstName}` etc. is replaced with real value by server (mail merge etc.) */
const placeholders = ["firstName", "lastName", "email", "company", "date"];

/** Returns name of placeholder: text inside braces (`{someProp}` => `someProp`); */
function placeholderOf(el: HTMLElement): string | undefined {
  const allowUnknown = true; //  unknown name is rejected if it isn't allowed: typed `{someProp}` stays text & such element is unwrapped by sanitizer

  const t = el.textContent!;
  const v =
    el.classList.contains(styles.placeholder) && t.length > 2 && t.startsWith("{") && t.endsWith("}") && t.slice(1, -1);
  return v && (allowUnknown || placeholders.includes(v)) ? v : undefined;
}

WUPTextRichControl.$tools.placeholder = {
  label: "Placeholder",
  // dropdown in toolbar & menu shown on typing `{` or on hover on placeholder (chosen value replaces it)
  values: placeholders.map((value) => ({ value, label: value })), // label is name as is: otherwise it's prettified (`First Name`)
  trigger: "{", // menu is filtered by text typed after it; typed `{someProp}` is placeholder too (if `is` allows it)
  // placeholder follows its text: `{firstName}` + `a` is plain text, Backspace returns placeholder (pasted one too);
  // spaces inside are allowed (`{first Name}`), but not after `{`: otherwise code `{ return 1; }` is placeholder
  recognize: /\{[^\s{}][^{}]*\}$/,
  kind: "inline", // editable text like link: caret can be placed inside
  is: placeholderOf, // WARN: sanitizer calls it for pasted html: value is used as text only
  create: "span", // chosen value is inserted as `<span>{firstName}</span>` (trigger, value & its pair `}`)
  classNameTag: styles.placeholder, // highlighted via css
};

/** Returns phone of link `tel:` */
function telOf(el: HTMLElement): string | undefined {
  const href = (el.tagName === "A" && el.getAttribute("href")) || "";
  return (/^tel:/i.test(href) && href.slice(4)) || undefined;
}

// built-in link keeps any safe link: `tel:` ones belong to custom tool phone (otherwise sanitizer nests elements of both)
const { link } = WUPTextRichControl.$tools;
const isLink = link.is!;
link.is = (el) => (telOf(el) ? undefined : isLink(el));

WUPTextRichControl.$tools.phone = {
  label: "Phone", // item in menu of commands (`/`)
  hideOnToolbar: true, // without button: typed phone is recognized
  kind: "inline",
  // strict format `+1 (555) 123-45-67` (mask `+0 (000) 000-00-00`): element appears when phone is typed completely
  recognize: /(?<![\p{L}\p{N}+/.:-])\+\d \(\d{3}\) \d{3}-\d{2}-\d{2}$/u,
  placeholder: "+1 (555) 123-45-67", // inserted when phone is chosen in menu of commands
  is: telOf,
  create: (v) => Object.assign(document.createElement("a"), { href: `tel:${v.replace(/[^\d+]/g, "")}` }),
};

/** Returns true for css hex color: `#f00`, `#ff0000`, `#ff000080` */
const isHexColor = (s: string): boolean => /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(s);

// before tag: tools are recognized in order of $tools
WUPTextRichControl.$tools.colorCode = {
  label: "Color code",
  hideOnToolbar: true,
  kind: "inline",
  // `#f00`, `#ff0000`, `#ff000080` with digit or one repeated char (`#fff`), otherwise it's hashtag (`#cafe`)
  recognize: (s) => {
    const m = /(?<![\p{L}\p{N}\p{M}_&/#])#[\da-f]+$/iu.exec(s)?.[0];
    return m && isHexColor(m) && (/\d/.test(m) || /^#(.)\1+$/i.test(m)) ? m : undefined;
  },
  placeholder: "#ff0000",
  is: (el) => (el.classList.contains(styles.color) ? el.textContent! : undefined),
  create: (v) => {
    const el = document.createElement("span");
    // swatch via css: color is validated, so style can't get unsafe css (`url()` etc.)
    isHexColor(v) && el.style.setProperty("--color", v);
    return el;
  },
  classNameTag: styles.color,
};

WUPTextRichControl.$tools.tag = {
  label: "Hashtag",
  hideOnToolbar: true,
  kind: "inline",
  // `#news`, `#café_2`: not digits only (`#1`), not in word (`C#`) or url
  recognize: /(?<![\p{L}\p{N}\p{M}_&/#])#(?![\p{N}_]+$)[\p{L}\p{N}\p{M}_]+$/u,
  placeholder: "#tag",
  is: (el) => (el.classList.contains(styles.tag) ? el.textContent!.slice(1) : undefined),
  create: "span",
  classNameTag: styles.tag,
};

const mentions: WUP.TextRich.ToolValue<string>[] = [
  { value: "john", label: "John Smith" },
  { value: "kate", label: "Kate Brown" },
  { value: "alex", label: "Alex Green" },
];
/** `false` - mentions from values only: typed `@unknown` & edited one (`@jo|hn` + `123` => `@jo123hn`) stay plain text,
 *  pasted html keeps text only; `true` - any text is mention (see `is` below) */
const allowUnknownMentions = false;
WUPTextRichControl.$tools.mention = {
  label: "Mention", // aria-label of menu & item in menu of commands
  hideOnToolbar: true,
  values: mentions, // menu on typing `@` at word start (not in email)
  trigger: "@",
  kind: "inline",
  // typed `@john` is mention without menu too
  recognize: /(?<![\p{L}\p{N}\p{M}_.@/-])@[\p{L}\p{N}\p{M}_](?:[\p{L}\p{N}\p{M}_.-]*[\p{L}\p{N}\p{M}_])?$/u,
  // `undefined` rejects element: typed or edited text stays plain text, sanitizer unwraps it (paste, $value)
  is: (el) => {
    const v = el.classList.contains(styles.mention) ? el.textContent!.slice(1) : undefined;
    return allowUnknownMentions || mentions.some((m) => m.value === v) ? v : undefined;
  },
  create: "span", // chosen value is inserted as `<span>@john</span>`
  classNameTag: styles.mention,
};

/** Toolbar with custom & customized tools only */
(window as any).myTextRichToolbarCustom = [
  ["header"],
  ["bold", "italic", "strike", "codeInline"],
  ["blockquote", "code"],
  // hidden (see `hideOnToolbar`): typed text is recognized, `/` opens menu of tools (labels & placeholders of custom tools)
  ["link", "phone", "colorCode", "tag", "mention", "command"],
  ["font", { direction: "rtl" }],
  ["image", "placeholder"], // placeholder is rendered as dropdown (tool with values)
] as WUP.TextRich.Options["toolbar"];
(window as any).myTextRichValidationsMax = { max: 500 } as WUP.TextRich.Options["validations"];

/** Called once on mount/unmount: function is defined outside of component, so React doesn't call it on every render */
function gotRef(el: WUPTextRichControl | null): void {
  if (el) {
    // hint on hover: attribute is set in editor only ($value is rebuilt via `create` of tool)
    el.$refInput.addEventListener("pointerover", (e) => {
      const t = e.target as HTMLElement;
      t.tagName === "IMG" && t.setAttribute("w-tooltip", "Click on image to change");
    });
  }
}

export default function TextRichCustom() {
  return (
    <Example header="Custom tools" link="demo/src/components/controls/textRich/textRich.custom.tsx">
      <small className={styles.description}>
        Custom tools added via static $tools:
        <ul>
          <li>
            <b>Font</b>: dropdown with serif & monospace fonts
          </li>
          <li>
            <b>Direction</b>: button of a single value - right-to-left line
          </li>
          <li>
            <b>Image</b>: file is chosen via browser dialog, click on image changes it
          </li>
          <li>
            <b>Placeholder</b>: dropdown & menu on typed <code>{"{"}</code>; typed <code>{"{someProp}"}</code> is
            recognized
          </li>
          <li>
            <b>Inline code</b>: button (Ctrl+E) or typed <code>`code`</code>
          </li>
        </ul>
        Custom tools hidden in toolbar (tool option: hideOnToolbar):
        <ul>
          <li>
            <b>Phone</b>: typed <code>+1 (555) 123-45-67</code> is recognized
          </li>
          <li>
            <b>Color code</b>: typed <code>#ff0000</code> is recognized & shown with swatch
          </li>
          <li>
            <b>Hashtag</b>: typed <code>#news</code> is recognized
          </li>
          <li>
            <b>Mention</b>: menu on typed <code>@</code>, typed <code>@john</code> is recognized
          </li>
        </ul>
        Markdown via recognize of built-in tools (Esc right after it returns typed text):
        <ul>
          <li>
            <b>Heading</b>: <code>#</code> ... <code>######</code> + space at line start
          </li>
          <li>
            <b>Quote</b>: <code>{">"}</code> + space at line start
          </li>
          <li>
            <b>Code block</b>: <code>```</code> at line start
          </li>
          <li>
            <b>Bold</b>: <code>**bold**</code>
          </li>
          <li>
            <b>Italic</b>: <code>_italic_</code>
          </li>
          <li>
            <b>Strikethrough</b>: <code>~~strike~~</code>
          </li>
        </ul>
        Type <code>/</code> to choose any tool (hidden ones too). Footer shows count of chars & validations.max (hidden
        via $options.hideFooter). Drag bottom-right corner to change height ($options.allowResizeH). See details in{" "}
        <MyLink href="/demo/src/components/controls/textRich/textRich.custom.tsx">textRich/textRich.custom.tsx</MyLink>
      </small>
      <wup-textrich
        w-name="customTools"
        w-label="Rich text with custom tools"
        w-toolbar="window.myTextRichToolbarCustom"
        w-validations="window.myTextRichValidationsMax"
        w-allowResizeH
        w-initValue={[
          '<p>Text with <span style="font-family: serif;">serif</span> & <span style="font-family: monospace;">monospace</span> fonts,',
          " <code>inline code</code></p>",
          '<p style="direction: rtl;">Right-to-left line</p>',
          `<p>Image <img src="${imgLogo}" alt="" style="max-width: 100%;"> inside text (click on it to change)</p>`,
          `<p>Dear <span class="${styles.placeholder}">{firstName}</span>, thank you for your order</p>`,
          `<p>Call <a href="tel:+15551234567">+1 (555) 123-45-67</a> about color <span class="${styles.color}">#ff0000</span>,`,
          ` <span class="${styles.tag}">#news</span> by <span class="${styles.mention}">@john</span></p>`,
        ].join("")}
        ref={gotRef}
      />
    </Example>
  );
}
