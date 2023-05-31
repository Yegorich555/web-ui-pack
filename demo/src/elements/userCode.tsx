/* eslint-disable react/require-default-props */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable react/destructuring-assignment */
import React, { useEffect, useState } from "react";
import getUsedCssVars from "src/helpers/parseCssVars";
import WUPBaseElement from "web-ui-pack/baseElement";
import WUPBaseControl from "web-ui-pack/controls/baseControl";
import { WUPFormElement, WUPPasswordControl, WUPRadioControl, WUPSwitchControl } from "web-ui-pack";
import linkGit from "src/helpers/linkGit";
import styles from "./userCode.scss";
import Code from "./code";
import Tabs from "./tabs";

export interface UserCodeProps {
  tag?: `wup-${string}`;
  customHTML?: string[];
  /** Set of alternative values for css-vars. Possible whe css-var used several times and need to skip the real-value */
  // eslint-disable-next-line react/no-unused-prop-types
  cssVarAlt?: Map<string, string>;
  // eslint-disable-next-line react/no-unused-prop-types
  excludeCssVars?: string[];
}

function renderCssValue(v: string, alt: string | undefined): string | JSX.Element {
  if (alt) {
    return <small>{alt}</small>;
  }
  let isColor = v[0] === "#" || v.startsWith("rgb");
  if (v) {
    // set style as color-value and check if color is changed
    const el = document.createElement("span");
    const def = "rgb(1, 1, 1)";
    el.style.color = def;
    el.style.color = v;
    el.style.position = "absolute";
    document.body.appendChild(el);
    const gotColor = window.getComputedStyle(el).color;
    if (def !== gotColor && gotColor !== "rgb(0, 0, 0)") {
      isColor = true;
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
  const parsedCode = `html
<${tag}
  ${parsedAttrs.map((a) => a.name + (!a.value ? "" : `="${a.value}"`)).join("\n  ")}
></${tag}>`;

  return <Code code={parsedCode} />;
}

function renderCssVars(props: UserCodeProps) {
  const el = document.createElement(props.tag!);
  if (!(el instanceof WUPBaseElement)) {
    throw new Error("Only WUPBaseElement expected");
  }

  const usedVars = getUsedCssVars(el, { isDistinct: true });
  return (
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
  );
}

export default function UserCode(props: React.PropsWithChildren<UserCodeProps>) {
  if (!props.tag) {
    return null;
  }
  return (
    <Tabs
      items={[
        {
          label: "HTML",
          render: renderHTMLCode(props.tag!, props.customHTML),
        },
        {
          label: "CSS vars",
          render: renderCssVars(props),
        },
        {
          label: "JS/TS",
          render: (
            <div style={{ padding: "1em" }}>
              See common example{" "}
              <a href={linkGit("CODESTYLE.md")} target="blank">
                here
              </a>
            </div>
          ),
        },
      ]}
    />
  );
}
