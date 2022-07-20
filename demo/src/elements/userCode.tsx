/* eslint-disable react/destructuring-assignment */
import WUPBaseElement from "web-ui-pack/baseElement";
import styles from "./userCode.scss";

interface Props {
  scanEl?: HTMLElement;
}

function extractCssVars(str: string) {
  const reg = /(--[\w-]+): *([^;]+);/g;
  const vars: Array<{ name: string; value: string }> = [];
  const uniqueList = new Set<string>();
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const exec = reg.exec(str);
    if (exec === null) {
      break;
    }
    const name = exec[1];
    if (!uniqueList.has(name)) {
      vars.push({ name, value: exec[2] });
      uniqueList.add(name);
    }
  }
  return vars;
}

function extractUsedCssVars(str: string, tagName: string) {
  const regTag = new RegExp(`${tagName} *[^{]+{([^}]+)}`, "g");
  const reg = /(--[\w-]+)/g;
  const vars = new Set<string>();
  // eslint-disable-next-line no-constant-condition
  while (1) {
    let exec = regTag.exec(str);
    if (exec === null) {
      break;
    }
    const s = exec[1];
    // eslint-disable-next-line no-constant-condition
    while (1) {
      exec = reg.exec(s);
      if (exec === null) {
        break;
      }
      const name = exec[1];
      !vars.has(name) && vars.add(name);
    }
  }
  return vars;
}

function getUsedCssVars(scanEl: WUPBaseElement<any>) {
  const str = (scanEl.constructor as typeof WUPBaseElement).$refStyle!.textContent!;
  const usedSet = extractUsedCssVars(str, scanEl.tagName);
  const allVars = extractCssVars(str);

  const usedVars = allVars.filter((v) => usedSet.has(v.name));
  return usedVars;
}

function renderCssValue(v: string): string | JSX.Element {
  // todo show image in popup by click
  if (v.startsWith("url")) {
    return <a href="commingsoon">url(...)</a>;
  }
  return v;
}

export default function UserCode(props: React.PropsWithChildren<Props>) {
  if (!props.scanEl) {
    return null;
  }
  if (!(props.scanEl instanceof WUPBaseElement)) {
    throw new Error("Only WUPBaseElement expected");
  }

  // todo come reused vars is missed but some exists (textControl: --base-back; vs --ctrl-icon-img: var(--wup-icon-dot);) - check it
  const usedVars = getUsedCssVars(props.scanEl);

  return (
    <section>
      <h3>CSS variables</h3>
      <code className={styles.cssVars}>
        <ul>
          {usedVars.map((v) => (
            <li key={v.name}>
              <span>{v.name}</span>: <span>{renderCssValue(v.value)}</span>;
            </li>
          ))}
        </ul>
      </code>
    </section>
  );
}
