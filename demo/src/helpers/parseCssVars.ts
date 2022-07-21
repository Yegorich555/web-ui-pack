import WUPBaseElement from "web-ui-pack/baseElement";

interface CssVar {
  name: string;
  value: string;
  isDuplicate?: boolean;
}

/** Returns all css-vars definitions */
export function parseCssVars(str: string): CssVar[] {
  const reg = /(--[\w-]+): *([^;]+);/g;
  const vars: CssVar[] = [];
  const uniqueList = new Set<string>();
  while (1) {
    const exec = reg.exec(str);
    if (exec === null) {
      break;
    }
    const name = exec[1];
    const duplicate = uniqueList.has(name);
    vars.push({ name, value: exec[2], isDuplicate: duplicate });
    !duplicate && uniqueList.add(name);
  }
  return vars;
}

/** Returns all css-vars that used by pointed tag */
export function parseUsedCssVars(str: string, tagName: string): Set<string> {
  const regTag = new RegExp(`${tagName} *[^{]+{([^}]+)}`, "g");
  const reg = /var\((--[\w-]+)/g;
  const vars = new Set<string>();
  while (1) {
    let exec = regTag.exec(str);
    if (exec === null) {
      break;
    }
    const s = exec[1];
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

/** Returns set of css-vars that reused inside pointed usedVars `--ctrl-icon: var(--ctrl-label);` */
export function parseReusedVars(usedVars: CssVar[]): Set<string> {
  const reg = /var\((--[\w-]+)/g;
  const reusedVars = new Set<string>();
  for (let i = 0; i < usedVars.length; ++i) {
    while (1) {
      const exec = reg.exec(usedVars[i].value);
      if (exec === null) {
        break;
      }
      const name = exec[1];
      !reusedVars.has(name) && reusedVars.add(name);
    }
  }
  return reusedVars;
}

interface Options {
  /** Skip duplicates kind of --ctrl-icon: var(--ctrl-label); --ctrl-icon: var(--ctrl-err-text); */
  isDistinct?: boolean;
}

/** Returns all css-vars thar used by pointed element */
export default function getUsedCssVars(scanEl: WUPBaseElement<any>, opts?: Options): CssVar[] {
  const str = (scanEl.constructor as typeof WUPBaseElement).$refStyle!.textContent!;
  const usedSet = parseUsedCssVars(str, scanEl.tagName);
  const allVars = parseCssVars(str);

  const usedVars = allVars.filter((v) => usedSet.has(v.name));
  const reusedVars = parseReusedVars(usedVars);

  let allUsedVars = allVars.filter((v) => usedSet.has(v.name) || reusedVars.has(v.name));
  if (opts?.isDistinct) {
    allUsedVars = allUsedVars.filter((v) => !v.isDuplicate);
  }

  allUsedVars.sort((a, b) => a.name.localeCompare(b.name));
  return allUsedVars;
}
