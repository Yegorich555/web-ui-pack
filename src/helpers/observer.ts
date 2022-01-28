/* eslint-disable prefer-rest-params */
// discussions here https://stackoverflow.com/questions/5100376/how-to-watch-for-array-changes

// todo recursive for arrays, nested objects
// todo single call listener for many changes in time: how to provide listener in this case ?

const symObserved = Symbol("__observed");
export namespace Observer {
  export type Observed<T extends object = object> = T & {
    readonly [symObserved]: Observed;
  };

  export type DateEvent<T extends Date = Date> = {
    prev: number;
    next: number;
    prop: "valueOf";
    target: T;
  };

  export type BasicPropEvent<T, K extends keyof T> = {
    prev: T[K] | undefined;
    next: T[K] | undefined;
    prop: K;
    target: T;
  };

  export type PropEvent<T, K extends keyof T> = T extends Date ? DateEvent<T> : BasicPropEvent<T, K>;
  export type PropCallback<T> = <K extends keyof T>(event: PropEvent<T, K>) => void;
}

interface IStored {
  propListeners: Array<Observer.PropCallback<any>>;
}

type PartialDateEvent = Omit<Observer.PropEvent<Date, "valueOf">, "target">;
type PartialPropEvent<T extends object> = Omit<Observer.BasicPropEvent<T, keyof T>, "target" | "prop"> & {
  prop: string | symbol;
};

// required to avoid prototypeExtending
const dateWatchKeys = new Set([
  "setDate",
  "setFullYear",
  "setHours",
  "setMilliseconds",
  "setMinutes",
  "setMonth",
  "setSeconds",
  "setTime",
  "setUTCDate",
  "setUTCFullYear",
  "setUTCHours",
  "setUTCMilliseconds",
  "setUTCMinutes",
  "setUTCMonth",
  "setUTCSeconds",
  "setYear",
]);
const observeSet = new WeakMap<Observer.Observed, IStored>();
const observer = {
  /** Make observable object; @see Proxy */
  make<T extends object>(obj: T): Observer.Observed<T> {
    const prevProxy = (obj as Observer.Observed)[symObserved];
    if (prevProxy) {
      return prevProxy as Observer.Observed<T>;
    }

    const isDate = obj instanceof Date;

    const propListeners: IStored["propListeners"] = [];
    const propChanged = <K extends keyof T>(e: PartialDateEvent | PartialPropEvent<T>) => {
      // eslint-disable-next-line no-use-before-define
      (e as Observer.PropEvent<T, K>).target = proxy;
      propListeners.forEach((f) => f(e as Observer.PropEvent<T, K>));
    };
    // const isArray = Array.isArray(obj);
    const proxyHandler: ProxyHandler<typeof obj> = {
      set(_t, prop, next) {
        const prev = obj[prop as keyof T];
        // @ts-ignore
        const r = Reflect.set(...arguments);
        if (propListeners.length) {
          let isChanged = false;
          if (prev == null || next == null) {
            isChanged = prev !== next;
          } else {
            isChanged = (prev as any).valueOf() !== (next as any).valueOf();
          }
          isChanged && propChanged({ prev, next, prop });
        }
        // console.warn("test", arguments);
        return r;
      },
      deleteProperty(t, prop) {
        if (!isDate) {
          const prev = t[prop as keyof T];
          propChanged({ prev, next: undefined, prop });
        }
        return true;
      },
    };
    if (isDate) {
      proxyHandler.get = function get(t, prop) {
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/ban-types
        const v = Reflect.get(...arguments) as Function;
        if (typeof v === "function") {
          if (dateWatchKeys.has(prop as string)) {
            return (...args: any[]) => {
              const prev = (obj as Date).valueOf();
              const r = v.apply(obj as Date, args);
              const next = (obj as Date).valueOf();
              if (prev !== next) {
                propChanged({ prev, next, prop: "valueOf" });
              }
              return r;
            };
          }
          return v.bind(t);
        }
        return v;
      };
    }
    const proxy = new Proxy(obj, proxyHandler) as Observer.Observed<T>;

    Object.defineProperty(proxy, symObserved, { get: () => proxy });

    const stored: IStored = { propListeners };
    observeSet.set(proxy, stored);
    return proxy;
  },

  onPropChanged<T extends object>(
    target: Observer.Observed<T>,
    callback: Observer.PropCallback<T>
    // options: { once?: boolean }
  ) {
    const o = observeSet.get(target);
    if (!o) {
      throw new Error("Only observer objects expected. Use make() before");
    }
    o.propListeners.push(callback);
  },
};

export default observer;

/** Old logic without Proxy */
// const arrFn: Array<keyof Array<unknown>> = ["pop", "push", "reverse", "shift", "unshift", "splice", "sort"];
// // impossible to detect options that wasn't assigned previously
// export function onObjectChanged<T extends Record<any, unknown>>(
//   target: T,
//   listener: <K extends keyof T>(event: { prev: T[K]; next: T[K]; propKey: K; target: T }) => void
//   // options: { once?: boolean; include?: Array<keyof T>; exclude?: Array<keyof T> }
// ): void {
//   Object.keys(target).forEach((k: keyof T) => {
//     let orig = target[k];

//     Object.defineProperty(target, k, {
//       get: () => orig,
//       set: <K extends keyof T>(v: T[K]) => {
//         const prev = orig as T[K];
//         orig = v;

//         let isChanged = false;
//         if (prev == null || v == null) {
//           isChanged = prev !== v;
//         } else {
//           isChanged = (prev as Record<string, unknown>).valueOf() !== (v as Record<string, unknown>).valueOf();
//         }
//         isChanged && listener({ prev, next: v, propKey: k, target });
//       },
//     });
//   });
// }
