/* eslint-disable react/require-default-props */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react/destructuring-assignment */
import React, { useEffect, useState } from "react";
import getUsedCssVars from "src/helpers/parseCssVars";
import WUPBaseElement from "web-ui-pack/baseElement";
import WUPBaseControl from "web-ui-pack/controls/baseControl";
import { WUPFormElement, WUPPasswordControl, WUPRadioControl, WUPSwitchControl } from "web-ui-pack";
import styles from "./userCode.scss";
import pageStyles from "./page.scss";
import Code from "./code";

export interface UserCodeProps {
  tag?: `wup-${string}`;
  customHTML?: string[];
  /** Set of alternative values for css-vars. Possible whe css-var used several times and need to skip the real-value */
  cssVarAlt?: Map<string, string>;
  excludeCssVars?: string[];
}

function renderCssValue(v: string, alt: string | undefined): string | JSX.Element {
  if (alt) {
    return <small>{alt}</small>;
  }
  return v;
}

function renderHTMLCode(tag: string, customHTML: string[] | undefined): string | JSX.Element | JSX.Element[] {
  if (customHTML) {
    // eslint-disable-next-line react/no-array-index-key
    return customHTML.map((c, i) => <Code code={c} key={i.toString()} />);
  }
  const [, updateState] = useState<number>();
  useEffect(() => {
    setTimeout(() => updateState(1));
  }, []);

  const el = document.querySelector(tag);
  if (!el) {
    return "";
  }

  const parsedAttrs: Array<{ name: string; value: string | null }> = [];
  const attrs = el.attributes;
  for (let i = 0; i < attrs.length; ++i) {
    const name = attrs[i].nodeName;
    if (name !== "style" && !name.startsWith("aria") && !name.startsWith("role")) {
      parsedAttrs.push({ name, value: attrs[i].nodeValue });
    }
  }

  if (el instanceof WUPBaseControl || el instanceof WUPFormElement) {
    parsedAttrs.push({ name: "disabled", value: "false" });
    parsedAttrs.push({ name: "readonly", value: "false" });
    parsedAttrs.push({ name: "autofocus", value: "false" });
  }
  if (el instanceof WUPSwitchControl || el instanceof WUPPasswordControl || el instanceof WUPRadioControl) {
    parsedAttrs.push({ name: "reverse", value: "false" });
  }
  const isSingleLine = parsedAttrs.length < 4;

  return (
    <code className={styles.htmlCode}>
      {"<"}
      <span className={styles.htmlTag}>{tag}</span>
      <ul className={[styles.htmlAttr, isSingleLine ? styles.htmlAttrSingle : ""].join(" ")}>
        {parsedAttrs.map((a) => (
          <li key={a.name}>
            <span>{a.name}</span>
            {!a.value ? "" : `="${a.value}"`}
          </li>
        ))}
      </ul>
      {">"}
      {"</"}
      <span className={styles.htmlTag}>{tag}</span>
      {">"}
    </code>
  );
}

export default function UserCode(props: React.PropsWithChildren<UserCodeProps>) {
  if (!props.tag) {
    return null;
  }
  const el = document.createElement(props.tag);
  if (!(el instanceof WUPBaseElement)) {
    throw new Error("Only WUPBaseElement expected");
  }

  const usedVars = getUsedCssVars(el, { isDistinct: true });

  return (
    <>
      <section className={pageStyles.smallText}>
        <h3>
          HTML{" "}
          <small className={styles.headerDetails}>
            (using <b>$options</b> instead of attributes is preferable)
          </small>
        </h3>
        {renderHTMLCode(props.tag, props.customHTML)}
      </section>
      <section className={pageStyles.smallText}>
        <h3>CSS variables</h3>
        <code className={styles.cssVars}>
          <ul>
            {(props.excludeCssVars ? usedVars.filter((v) => !props.excludeCssVars!.includes(v.name)) : usedVars).map(
              (v) => (
                <li key={v.name + v.value}>
                  <span>{v.name}</span>: <span>{renderCssValue(v.value, props.cssVarAlt?.get(v.name))}</span>;
                </li>
              )
            )}
          </ul>
        </code>
      </section>
    </>
  );
}
