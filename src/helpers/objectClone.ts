interface CloneOptions {
  skipUndefined?: boolean;
  skipEmptyObjects?: boolean;
}

/** Recursive clone object */
export default function objectClone<T>(obj: T, opts?: CloneOptions): T {
  const skipUndefined = opts?.skipUndefined;
  const skipEmptyObjects = opts?.skipEmptyObjects;

  function map(vobj: any): any {
    if (!vobj) {
      return vobj;
    }
    if (Array.isArray(vobj)) {
      const arr = [];
      for (let k = 0; k < vobj.length; ++k) {
        const v = map(vobj[k]);
        /* istanbul ignore else */
        if (!skipUndefined || v !== undefined) {
          arr.push(v);
        }
      }
      return arr;
    }
    const type = typeof vobj;
    if (type === "function" || vobj instanceof HTMLElement) {
      return vobj;
    }
    if (Object.prototype.toString.call(vobj) === "[object Date]") {
      return new Date(vobj.valueOf());
    }
    if (type === "object") {
      const keys = Object.keys(vobj);
      const r: any = {};
      let hasKey = false;
      for (let i = 0; i < keys.length; ++i) {
        const k = keys[i];
        const v = map(vobj[k]);
        if (!skipUndefined || v !== undefined) {
          r[k] = v;
          hasKey = true;
        }
      }
      return hasKey || !skipEmptyObjects ? r : undefined;
    }

    return vobj;
  }

  return map(obj) as T;
}

// check instanceOf vs typeof: https://stackoverflow.com/questions/899574/what-is-the-difference-between-typeof-and-instanceof-and-when-should-one-be-used#:~:text=typeof%3A%20Per%20the%20MDN%20docmentation,type%20of%20the%20unevaluated%20operand.&text=instanceof%3A%20is%20a%20binary%20operator,constructor%20in%20its%20prototype%20chain.
