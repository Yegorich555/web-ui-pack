import Example from "src/elements/example";
import MyLink from "src/elements/myLink";
import { WUPTextRichControl } from "web-ui-pack";
import imageConvert from "web-ui-pack/helpers/files/imageConvert";
import selectFiles from "web-ui-pack/helpers/files/selectFiles";
import imgLogo from "../../../assets/logo-small.png";
import styles from "./example1.scss";

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

(window as any).myTextRichToolbarCustom = [
  ["bold", "italic", "underline"],
  ["size", "font"], // font - custom tool
  ["align", { direction: "rtl" }], // direction - custom tool
  ["image", "placeholder"], // custom tools: placeholder is rendered as dropdown (tool with values)
  ["clean"],
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

export default function Example1() {
  return (
    <Example header="Custom tools" link="demo/src/components/controls/textRich/example1.tsx">
      <small>
        Font, direction, image & placeholder (type <b>{"{"}</b> to choose it or <b>{"{someProp}"}</b>) are added via
        static $tools. See details in{" "}
        <MyLink href="/demo/src/components/controls/textRich/example1.tsx">textRich/example1.tsx</MyLink> &{" "}
        <MyLink href="/demo/src/components/controls/textRich/example1.scss">textRich/example1.scss</MyLink>. Footer
        shows count of chars & validations.max (hidden via $options.hideFooter)
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
        ].join("")}
        ref={gotRef}
      />
    </Example>
  );
}
