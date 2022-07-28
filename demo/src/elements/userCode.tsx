/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react/destructuring-assignment */
import React, { useEffect, useState } from "react";
import getUsedCssVars from "src/helpers/parseCssVars";
import WUPBaseElement from "web-ui-pack/baseElement";
import WUPBaseControl from "web-ui-pack/controls/baseControl";
import styles from "./userCode.scss";

export interface UserCodeProps {
  tag?: `wup-${string}`;
  /** Set of alternative values for css-vars. Possible whe css-var used several times and need to skip the real-value */
  cssVarAlt?: Map<string, string>;
}

function renderCssValue(v: string, alt: string | undefined): string | JSX.Element {
  if (alt) {
    return <small>{alt}</small>;
  }
  return v;
}

function renderHTMLCode(tag: string): string | JSX.Element {
  const [, updateState] = useState<number>();
  useEffect(() => {
    setTimeout(() => updateState(1));
  }, []);

  const el = document.querySelector(tag);
  if (!el) {
    return "";
  }

  const content: string = el.outerHTML.replace(el.innerHTML, "");
  const parsed = /<([^/ ]+) ([^>]+)*><\/([^>]+)>/g.exec(content);
  if (!parsed) {
    return <code className={styles.htmlCode}>{content}</code>;
  }

  const parsedAttrs: Array<{ name: string; value: string | null }> = [];
  const attrs = el.attributes;
  for (let i = 0; i < attrs.length; ++i) {
    const name = attrs[i].nodeName;
    if (name !== "style" && !name.startsWith("aria")) {
      parsedAttrs.push({ name, value: attrs[i].nodeValue });
    }
  }

  if (el instanceof WUPBaseControl) {
    parsedAttrs.push({ name: "disabled", value: "false" });
    parsedAttrs.push({ name: "readonly", value: "false" });
    parsedAttrs.push({ name: "autofocus", value: "false" });
  }

  return (
    <code className={styles.htmlCode}>
      {"<"}
      <span className={styles.htmlTag}>{parsed[1]}</span>
      <span className={styles.htmlAttr}>
        {parsedAttrs.map((a) => (
          <React.Fragment key={a.name}>
            <span>{a.name}</span>="{a.value}"<br />
          </React.Fragment>
        ))}
      </span>
      {">"}
      {"</"}
      <span className={styles.htmlTag}>{parsed[3]}</span>
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
      <section>
        <h3>
          HTML{" "}
          <small className={styles.headerDetails}>
            (using <b>$options</b> is preferable)
          </small>
        </h3>
        {renderHTMLCode(props.tag)}
      </section>
      <section>
        <h3>CSS variables</h3>
        <code className={styles.cssVars}>
          <ul>
            {usedVars.map((v) => (
              <li key={v.name + v.value}>
                <span>{v.name}</span>: <span>{renderCssValue(v.value, props.cssVarAlt?.get(v.name))}</span>;
              </li>
            ))}
          </ul>
        </code>
      </section>
    </>
  );
}
