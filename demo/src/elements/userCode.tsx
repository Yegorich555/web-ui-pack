/* eslint-disable react/destructuring-assignment */
import getUsedCssVars from "src/helpers/parseCssVars";
import WUPBaseElement from "web-ui-pack/baseElement";
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
  );
}
