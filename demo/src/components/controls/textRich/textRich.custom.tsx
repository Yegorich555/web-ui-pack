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
    }
  }
}

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

WUPTextRichControl.$tools.mention = {
  label: "Mention", // aria-label of menu & item in menu of commands
  hideOnToolbar: true,
  // menu on typing `@` at word start (not in email); without values typed `@name` is recognized via `recognize`
  values: [
    { value: "john", label: "John Smith" },
    { value: "kate", label: "Kate Brown" },
    { value: "alex", label: "Alex Green" },
  ],
  trigger: "@",
  kind: "inline",
  recognize: /(?<![\p{L}\p{N}\p{M}_.@/-])@[\p{L}\p{N}\p{M}_](?:[\p{L}\p{N}\p{M}_.-]*[\p{L}\p{N}\p{M}_])?$/u,
  is: (el) => (el.classList.contains(styles.mention) ? el.textContent!.slice(1) : undefined),
  create: "span", // chosen value is inserted as `<span>@john</span>`
  classNameTag: styles.mention,
};

/** Default toolbar extended with custom tools */
const toolbar = WUPTextRichControl.$defaults.toolbar!.map((group): WUP.TextRich.ToolbarGroup => {
  switch (group[0]) {
    case "link":
      return [...group, "phone", "colorCode", "tag", "mention"]; // hidden (see `hideOnToolbar`): typed text is recognized
    case "size":
      return [...group, "font"];
    case "align":
      return [...group, { direction: "rtl" }];
    default:
      return group;
  }
});
// placeholder is rendered as dropdown (tool with values)
toolbar.splice(
  toolbar.findIndex(([first]) => first === "clean"),
  0,
  ["image", "placeholder"]
);
(window as any).myTextRichToolbarCustom = toolbar;
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
      <small>
        Font, direction, image & placeholder (type <b>{"{"}</b> to choose it or <b>{"{someProp}"}</b>), phone (
        <b>+1 (555) 123-45-67</b>), color code (<b>#ff0000</b>), hashtag & mention (type <b>@</b> to choose it) are
        added via static $tools; type <b>/</b> to choose any tool. See details in{" "}
        <MyLink href="/demo/src/components/controls/textRich/textRich.custom.tsx">textRich/textRich.custom.tsx</MyLink>{" "}
        &{" "}
        <MyLink href="/demo/src/components/controls/textRich/textRich.custom.scss">
          textRich/textRich.custom.scss
        </MyLink>
        . Footer shows count of chars & validations.max (hidden via $options.hideFooter)
      </small>
      <wup-textrich
        w-name="customTools"
        w-label="Rich text with custom tools"
        w-toolbar="window.myTextRichToolbarCustom"
        w-validations="window.myTextRichValidationsMax"
        w-initValue={[
          '<p>Text with <span style="font-family: serif;">serif</span> & <span style="font-family: monospace;">monospace</span> fonts</p>',
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
