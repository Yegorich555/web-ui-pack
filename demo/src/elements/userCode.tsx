/* eslint-disable react/no-unused-prop-types */
/* eslint-disable react/require-default-props */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react/destructuring-assignment */
import React, { useEffect, useState, memo } from "react";
import Prism from "prismjs";
import getUsedCssVars from "src/helpers/parseCssVars";
import * as wupLib from "web-ui-pack";
import {
  WUPFormElement,
  WUPPasswordControl,
  WUPPopupElement,
  WUPRadioControl,
  WUPSwitchControl,
  WUPTimeObject,
} from "web-ui-pack";
import linkGit from "src/helpers/linkGit";
import WUPBaseControl from "web-ui-pack/controls/baseControl";
import { PopupCloseCases } from "web-ui-pack/popup/popupElement.types";
import WUPBaseElement from "web-ui-pack/baseElement";
import WUPBaseComboControl from "web-ui-pack/controls/baseCombo";
import WUPBaseModal from "web-ui-pack/baseModal";
import * as baseControlModule from "web-ui-pack/controls/baseControl";
import * as baseComboModule from "web-ui-pack/controls/baseCombo";
import * as calendarModule from "web-ui-pack/controls/calendar";
import * as popupTypesModule from "web-ui-pack/popup/popupElement.types";
import * as notifyModule from "web-ui-pack/notifyElement";
import * as formModule from "web-ui-pack/formElement";
import styles from "./userCode.scss";
import Code from "./code";
import Tabs from "./tabs";

export interface UserCodeProps {
  tag?: `wup-${string}`;
  customHTML?: string[];
  customJS?: string;
  linkDemo: string;
  /** Set of alternative values for css-vars. Possible whe css-var used several times and need to skip the real-value */
  // eslint-disable-next-line react/no-unused-prop-types
  cssVarAlt?: Map<string, string>;
  // eslint-disable-next-line react/no-unused-prop-types
  /** @deprecated all css vars parsed from $styleRoot now */
  excludeCssVars?: string[];
}

function renderCssValue(v: string, alt: string | undefined): string | React.JSX.Element {
  if (alt) {
    return <small>{alt}</small>;
  }
  let isColor = v[0] === "#" || v.startsWith("rgb");
  if (
    !isColor &&
    v &&
    !v.startsWith("url") &&
    !v.startsWith("var(--anim-t)") &&
    !v.startsWith("calc") &&
    !v.includes("size")
  ) {
    // set style as color-value and check if color is changed
    const el = document.createElement("span");
    const def = "rgb(1, 1, 1)";
    el.style.color = def;
    el.style.color = v;
    el.style.position = "absolute";
    document.body.appendChild(el);
    const gotColor = window.getComputedStyle(el).color;
    if (def !== gotColor && gotColor !== "rgb(0, 0, 0)") {
      isColor = true; // WARN it's wrong for 'var(--anim-t)'
    }
    el.remove();
  }
  if (isColor) {
    return (
      <>
        <span style={{ background: v }} className={styles.colorBlock} />
        {v}
      </>
    );
  }
  return v;
}

/** Returns attributes of element + some common ones to show on HTML side */
function getHTMLAttrs(el: WUPBaseElement): Array<{ name: string; value: string | null }> {
  let parsedAttrs: Array<{ name: string; value: string | null }> = [];
  const attrs = el.attributes;
  for (let i = 0; i < attrs.length; ++i) {
    const name = attrs[i].nodeName;
    if (name !== "style" && !name.startsWith("aria") && !name.startsWith("role") && name !== "required") {
      parsedAttrs.push({ name, value: attrs[i].nodeValue });
    }
  }

  const addUnique = (a: { name: string; value: string | null }) => {
    if (!parsedAttrs.some((p) => p.name === a.name)) {
      parsedAttrs.push(a);
    }
  };

  if (el instanceof WUPBaseControl) {
    addUnique({ name: "w-autocomplete", value: "off" });
    addUnique({ name: "w-storage", value: "local" });
    addUnique({ name: "w-storagekey", value: "false" });
    addUnique({ name: "w-initvalue", value: "some value here" });
  }
  if (el instanceof WUPSwitchControl || el instanceof WUPPasswordControl || el instanceof WUPRadioControl) {
    addUnique({ name: "w-reverse", value: "false" });
  }
  if (el instanceof WUPBaseControl || el instanceof WUPFormElement) {
    addUnique({ name: "w-autofocus", value: "false" });
    addUnique({ name: "disabled", value: "false" });
    addUnique({ name: "readonly", value: "false" });
    parsedAttrs = parsedAttrs.filter((p) => p.name !== "filled");
  }
  // parsedAttrs.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));
  return parsedAttrs;
}

function RenderHTMLCode({
  el,
  customHTML,
}: {
  el: WUPBaseElement;
  customHTML: string[] | undefined;
}): React.JSX.Element | null {
  if (customHTML) {
    return (
      <>
        {customHTML.map((c, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <Code code={c} key={i.toString()} />
        ))}
      </>
    );
  }

  const tag = el.tagName.toLowerCase();
  const parsedCode = `html
<${tag}
  ${getHTMLAttrs(el)
    .map((a) => a.name + (!a.value ? "" : `="${a.value}"`))
    .join("\n  ")}
></${tag}>`;

  return <Code code={parsedCode} />;
}

/** Paths of popup placements by functions: `WUPPopupElement.$placements.$top.$middle.$adjust` */
const placements = new Map<unknown, string>();
(function collect(obj: Record<string, unknown>, path: string) {
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    if (typeof v === "function" && !placements.has(v)) {
      placements.set(v, `${path}.${k}`);
      collect(v as unknown as Record<string, unknown>, `${path}.${k}`);
    }
  });
})(WUPPopupElement.$placements, "WUPPopupElement.$placements");

/** Returns JS-code of value: Date => `new Date("...")`, objects & arrays are multiline if too long */
function stringifyValue(v: unknown, indent: string): string {
  if (v == null) {
    return String(v);
  }
  if (v instanceof Date) {
    const parts = [
      v.getUTCFullYear(),
      v.getUTCMonth(),
      v.getUTCDate(),
      v.getUTCHours(),
      v.getUTCMinutes(),
      v.getUTCSeconds(),
      v.getUTCMilliseconds(),
    ];
    while (parts.length > 3 && !parts[parts.length - 1]) {
      parts.pop(); // skip zero time
    }
    return `new Date(Date.UTC(${parts.join(", ")}))`;
  }
  if (v instanceof WUPTimeObject) {
    return `new WUPTimeObject(${v.hours}, ${v.minutes})`;
  }
  if (v instanceof HTMLElement) {
    return `document.querySelector("${v.tagName.toLowerCase()}")`;
  }
  switch (typeof v) {
    case "string":
      return JSON.stringify(v);
    case "function":
      return placements.get(v) ?? "() => {/* ... */}";
    case "object": {
      const next = `${indent}  `;
      const isArr = Array.isArray(v);
      const items = isArr
        ? v.map((a) => stringifyValue(a, next))
        : Object.keys(v)
            .filter((k) => !k.startsWith("_")) // skip internal props: validations._invalidInput etc.
            .map((k) => {
              const key = /^[a-z_$][\w$]*$/i.test(k) ? k : JSON.stringify(k);
              return `${key}: ${stringifyValue((v as Record<string, unknown>)[k], next)}`;
            });
      const [open, close] = isArr ? ["[", "]"] : ["{", "}"];
      if (!items.length) {
        return open + close;
      }
      const inline = isArr ? `[${items.join(", ")}]` : `{ ${items.join(", ")} }`;
      return inline.length < 60 && !inline.includes("\n")
        ? inline
        : `${open}\n${next}${items.join(`,\n${next}`)},\n${indent}${close}`;
    }
    default:
      return String(v);
  }
}

/** Modules with enums by import paths; const enums exist at runtime because of `preserveConstEnums` */
const enumModules: Record<string, object> = {
  "controls/baseControl": baseControlModule,
  "controls/baseCombo": baseComboModule,
  "controls/calendar": calendarModule,
  "popup/popupElement.types": popupTypesModule,
  notifyElement: notifyModule,
  formElement: formModule,
};
/** Options typed via enums: `Class.option` => [enum name, import path, isFlags] */
const enumOptions: Record<string, [string, string, boolean?]> = {
  "WUPBaseControl.clearActions": ["ClearActions", "controls/baseControl"],
  "WUPBaseControl.validationCase": ["ValidationCases", "controls/baseControl", true],
  "WUPBaseComboControl.openCase": ["MenuOpenCases", "controls/baseCombo", true],
  "WUPCalendarControl.startWith": ["PickersEnum", "controls/calendar"],
  "WUPCalendarControl.endWith": ["PickersEnum", "controls/calendar"],
  "WUPPopupElement.openCase": ["PopupOpenCases", "popup/popupElement.types", true],
  "WUPPopupElement.animation": ["PopupAnimations", "popup/popupElement.types"],
  "WUPNotifyElement.openCase": ["NotifyOpenCases", "notifyElement"],
  "WUPFormElement.submitActions": ["SubmitActions", "formElement", true],
};

/** Returns JS-code of enum value: `PickersEnum.Day`, `MenuOpenCases.onFocus | MenuOpenCases.onClick` or null if it isn't enum */
function stringifyEnum(v: unknown, option: string): string | null {
  const opt = enumOptions[option];
  if (!opt || typeof v !== "number") {
    return null;
  }
  const [name, path, isFlags] = opt;
  const e = (enumModules[path] as Record<string, Record<string | number, string | number>>)[name];
  if (e[v] !== undefined) {
    return `${name}.${e[v]}`;
  }
  if (!isFlags) {
    return null;
  }
  const flags = Object.keys(e).filter((k) => typeof e[k] === "number" && e[k] && (v & +e[k]) === e[k]);
  return flags.reduce((sum, k) => sum | +e[k], 0) === v ? flags.map((k) => `${name}.${k}`).join(" | ") : null;
}

// mark `...` in JS code as button to show all options; via hook because Prism re-renders code on every highlightAll()
Prism.hooks.add("complete", (env) => {
  env.element
    ?.closest(`.${styles.jsCode}`)
    ?.querySelectorAll(".token.operator")
    .forEach((t) => {
      if (t.textContent === "...") {
        t.classList.add(styles.more);
        t.setAttribute("role", "button");
        t.setAttribute("tabindex", "0");
        t.setAttribute("title", "Show all options");
      }
    });
});

/** Opens modal with code of all $options */
function showAllOptions(cls: string, code: string): void {
  const m = document.createElement("wup-modal");
  m.$options.selfRemove = true;
  m.innerHTML = `<h2>${cls}.$options</h2><div class="code ${styles.allOptions}"><pre><code class="language-js"></code></pre></div>`;
  const c = m.querySelector("code")!;
  c.textContent = code;
  Prism.highlightElement(c);
  document.body.appendChild(m);
}

/** Classes by names; base classes aren't exported from web-ui-pack but required because names are minified in production */
const allClasses: Record<string, unknown> = {
  ...wupLib,
  WUPBaseElement,
  WUPBaseControl,
  WUPBaseComboControl,
  WUPBaseModal,
};
const getClassName = (c: typeof WUPBaseElement): string =>
  Object.keys(allClasses).find((k) => allClasses[k] === c) ?? c.name;

/** Returns options grouped by classes where defined: own options first, then from the nearest parent to the base one */
function groupByClass(
  ctr: typeof WUPBaseElement,
  keys: string[]
): Array<{ from: typeof WUPBaseElement; keys: string[] }> {
  const all = new Set(Object.keys(ctr.$defaults));
  const chain: unknown[] = [];
  for (let p = Object.getPrototypeOf(ctr); p !== HTMLElement; p = Object.getPrototypeOf(p)) {
    chain.push(p);
  }
  // parents are not only prototypes: $defaults can be inherited from several classes (WUPDateControl from WUPCalendarControl)
  const parents = Object.values(allClasses)
    .filter((c): c is typeof WUPBaseElement => typeof c === "function" && "$defaults" in c && c !== ctr)
    .map((c) => ({ c, keys: Object.keys(c.$defaults) }))
    // prototype can exclude some options (WUPTextAreaControl excludes `mask` etc.)
    .filter((p) => chain.includes(p.c) || (p.keys.length < all.size && p.keys.every((k) => all.has(k))))
    // the most base first; prototype is preferred for the same keys
    .sort((a, b) => a.keys.length - b.keys.length || +!chain.includes(a.c) - +!chain.includes(b.c));

  const groups = new Map<typeof WUPBaseElement, string[]>();
  keys.forEach((k) => {
    const from = parents.find((p) => p.keys.includes(k))?.c ?? ctr;
    groups.set(from, [...(groups.get(from) ?? []), k]);
  });
  return [ctr, ...parents.map((p) => p.c).reverse()]
    .filter((c) => groups.has(c))
    .map((c) => ({ from: c, keys: groups.get(c)! }));
}

function RenderJSCode({ el }: { el: WUPBaseElement }): React.JSX.Element {
  const ctr = el.constructor as typeof WUPBaseElement;
  const cls = getClassName(ctr);
  const tag = el.tagName.toLowerCase();
  const keys = Object.keys(ctr.$defaults).filter((k) => k !== "validationRules"); // rules are impossible to override via $options
  const defKey = keys.findLast((k) => typeof ctr.$defaults[k] === "boolean");
  const opts: Record<string, any> = { ...el.$options };
  if (opts.validations) {
    // Date, Time: options min, max, exclude override validations (assigned to validations) - so skip such copies
    const vls = { ...opts.validations };
    Object.keys(vls).forEach((k) => vls[k] === opts[k] && delete vls[k]);
    opts.validations = vls;
  }
  const initValue = el instanceof WUPBaseControl ? el.$initValue : undefined;
  // the same options as attributes on HTML side; all options if there are few of them or no one is defined via attributes
  let shownKeys: string[] = getHTMLAttrs(el)
    .map((a) => a.name.replace(/^w-/, ""))
    .map((a) => keys.find((k) => k.toLowerCase() === a))
    .filter((k) => k !== undefined);
  shownKeys = shownKeys.length && keys.length >= 14 ? shownKeys : keys;
  const renderOptions = (arr: string[], hasMore: boolean): string => {
    // option the same as nested one (min === validations.min) is assigned via reference after
    const nested = new Map<unknown, string>();
    arr.forEach((k) => {
      const v = opts[k];
      if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
        Object.keys(v).forEach((n) => {
          const sub = v[n];
          sub && typeof sub === "object" && !nested.has(sub) && nested.set(sub, `${k}.${n}`);
        });
      }
    });
    const linked = arr.filter((k) => nested.has(opts[k]));
    const lines: string[] = [];
    groupByClass(ctr, arr).forEach((g) => {
      const items = g.keys
        .filter((k) => !linked.includes(k))
        .map((k) => {
          const v = stringifyEnum(opts[k], `${getClassName(g.from)}.${k}`) ?? stringifyValue(opts[k], "  ");
          return `${k}: ${v},`;
        });
      if (g.from !== ctr && items.length) {
        lines.length && lines.push(""); // empty line between groups
        lines.push(`// From ${getClassName(g.from)}`);
      }
      lines.push(...items);
    });
    hasMore && lines.push("...");
    return `el.$options = {
${lines.map((l) => l && `  ${l}`).join("\n")}
};${linked.map((k) => `\nel.$options.${k} = el.$options.${nested.get(opts[k])};`).join("")}`;
  };

  const onShowAll = (e: React.UIEvent): void => {
    const t = e.target as HTMLElement;
    if (t.classList.contains(styles.more) && (e.type === "click" || (e as React.KeyboardEvent).key === "Enter")) {
      showAllOptions(cls, renderOptions(keys, false));
    }
  };

  const body = `${cls}.$use(); // register <${tag}>${
    defKey
      ? `
${cls}.$defaults.${defKey} = ${stringifyValue(ctr.$defaults[defKey], "")}; // global defaults (inherited classes too)`
      : ""
  }

${
  el instanceof WUPBaseControl
    ? `const form = document.body.appendChild(document.createElement("wup-form"));
const el = form.appendChild(document.createElement("${tag}"));`
    : `const el = document.body.appendChild(document.createElement("${tag}"));`
}
${renderOptions(shownKeys, shownKeys.length < keys.length)}${
    initValue === undefined ? "" : `\nel.$initValue = ${stringifyValue(initValue, "")};`
  }${
    el instanceof WUPBaseControl
      ? `\nel.$onChange = (e) => console.warn("$change", { reason: e.detail.reason, value: el.$value });

form.$onChange = (e) => console.warn("form $change", { control: e.target, model: form.$model });
form.$onSubmit = (e) => console.warn("$submit", e.detail.model);`
      : ""
  }`;
  const imports = [cls];
  body.includes("new WUPTimeObject(") && imports.push("WUPTimeObject");
  cls !== "WUPPopupElement" && body.includes("WUPPopupElement.") && imports.push("WUPPopupElement");
  const enumImports: Record<string, string[]> = {};
  Object.values(enumOptions).forEach(([name, path]) => {
    if (body.includes(`${name}.`)) {
      enumImports[path] ??= [];
      !enumImports[path].includes(name) && enumImports[path].push(name);
    }
  });
  const code = `js
import { ${imports.join(", ")} } from "web-ui-pack";${Object.keys(enumImports)
    .map((path) => `\nimport { ${enumImports[path].join(", ")} } from "web-ui-pack/${path}";`)
    .join("")}

${body}`;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className={styles.jsCode} onClick={onShowAll} onKeyDown={onShowAll}>
      <Code code={code} />
    </div>
  );
}

function RenderCssVars(props: UserCodeProps & { el: WUPBaseElement }): React.JSX.Element {
  const [, updateState] = useState({});
  useEffect(() => {
    window.onDarkModeChanged = () => updateState({});
    return () => (window.onDarkModeChanged = undefined);
  }, []);

  const css = getUsedCssVars(props.el);

  // it's not required anymore props.excludeCssVars && console.error("defined excluded css-vars", props.excludeCssVars);
  const defined = css.own.length ? css.own : css.common;
  return (
    <code className={styles.cssVars}>
      {!css.own.length ? null : (
        <>
          <button className={styles.btnCommon} type="button">
            Common Styles
          </button>
          <wup-popup
            class={styles.cssCommon}
            ref={(p) => {
              if (p) {
                p.$onWillClose = (e) => {
                  (e.detail.closeCase === PopupCloseCases.onPopupClick ||
                    e.detail.closeCase === PopupCloseCases.onFocusOut) &&
                    e.preventDefault();
                };
              }
            }}
          >
            <ul>
              {css.common.map((v) => (
                <li key={v.name + v.value}>
                  <span>{v.name}</span>: <span>{renderCssValue(v.value, props.cssVarAlt?.get(v.name))}</span>;
                </li>
              ))}
            </ul>
          </wup-popup>
        </>
      )}
      <ul>
        {defined.map((v) => (
          <li key={v.name + v.value}>
            <span>{v.name}</span>: <span>{renderCssValue(v.value, props.cssVarAlt?.get(v.name))}</span>;
          </li>
        ))}
      </ul>
    </code>
  );
}

function UserCode(props: React.PropsWithChildren<UserCodeProps>) {
  if (!props.tag) {
    return null;
  }
  const [el, setEl] = useState<HTMLElement | null>();
  useEffect(() => {
    // timeout for waiting for layout update otherwise can be found previous item
    setTimeout(() => setEl(document.querySelector(props!.tag as string) as HTMLElement), 1);
  }, []);

  if (!el) {
    return null;
  }
  if (!(el instanceof WUPBaseElement)) {
    throw new Error("Only WUPBaseElement expected");
  }
  const js = props.customJS ? (
    <Code code={props.customJS} />
  ) : (
    <>
      <RenderJSCode el={el} />
      <div style={{ padding: "1em", fontSize: "smaller" }}>
        See common example{" "}
        <a href={linkGit("CODESTYLE.md")} target="_blank" rel="noreferrer" className={styles.defLink}>
          here
        </a>{" "}
        and{" "}
        <a href={linkGit(props.linkDemo)} target="_blank" rel="noreferrer" className={styles.defLink}>
          demo code here
        </a>
      </div>
    </>
  );
  return (
    <Tabs
      storageKey="userCodeTab"
      items={[
        { label: "HTML", render: <RenderHTMLCode {...(props as any)} el={el} /> },
        { label: "CSS vars", render: <RenderCssVars {...(props as any)} el={el} /> },
        { label: "JS/TS", render: js },
      ]}
    />
  );
}

export default memo(UserCode, () => true);
