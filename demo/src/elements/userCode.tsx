/* eslint-disable react/no-unused-prop-types */
/* eslint-disable react/require-default-props */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react/destructuring-assignment */
import React, { useEffect, useState, memo } from "react";
import getUsedCssVars from "src/helpers/parseCssVars";
import { WUPFormElement, WUPPasswordControl, WUPRadioControl, WUPSwitchControl } from "web-ui-pack";
import linkGit from "src/helpers/linkGit";
import WUPBaseControl from "web-ui-pack/controls/baseControl";
import { PopupCloseCases } from "web-ui-pack/popup/popupElement.types";
import WUPBaseElement from "web-ui-pack/baseElement";
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

function renderCssValue(v: string, alt: string | undefined): string | JSX.Element {
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

function RenderHTMLCode({
  el,
  customHTML,
}: {
  el: WUPBaseElement;
  customHTML: string[] | undefined;
}): JSX.Element | null {
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
  const tag = el.tagName.toLowerCase();
  const parsedCode = `html
<${tag}
  ${parsedAttrs.map((a) => a.name + (!a.value ? "" : `="${a.value}"`)).join("\n  ")}
></${tag}>`;

  return <Code code={parsedCode} />;
}

function RenderCssVars(props: UserCodeProps & { el: WUPBaseElement }): JSX.Element {
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
                p.$onWillHide = (e) => {
                  (e.detail.hideCase === PopupCloseCases.onPopupClick ||
                    e.detail.hideCase === PopupCloseCases.onFocusOut) &&
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
  const el = document.querySelector(props.tag);
  const [, updateState] = useState<number>();
  useEffect(() => {
    !el && setTimeout(() => updateState(1));
  }, []);

  if (!el) {
    return null;
  }
  if (!(el instanceof WUPBaseElement)) {
    throw new Error("Only WUPBaseElement expected");
  }
  return (
    <Tabs
      items={[
        {
          label: "HTML",
          render: <RenderHTMLCode {...(props as any)} el={el} />,
        },
        {
          label: "CSS vars",
          render: <RenderCssVars {...(props as any)} el={el} />,
        },
        {
          label: "JS/TS",
          render: props.customJS ? (
            <Code code={props.customJS} />
          ) : (
            <div style={{ padding: "1em" }}>
              See common example{" "}
              <a href={linkGit("CODESTYLE.md")} target="_blank" rel="noreferrer" className={styles.defLink}>
                here
              </a>{" "}
              and{" "}
              <a href={linkGit(props.linkDemo)} target="_blank" rel="noreferrer" className={styles.defLink}>
                demo code here
              </a>
            </div>
          ),
        },
      ]}
    />
  );
}

export default memo(UserCode, () => true);
