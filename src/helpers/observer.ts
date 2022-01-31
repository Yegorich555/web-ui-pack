/* eslint-disable prefer-rest-params */
// discussions here https://stackoverflow.com/questions/5100376/how-to-watch-for-array-changes

/** const a = NaN; a !== a; // true */
// eslint-disable-next-line no-self-compare
const isBothNaN = (a: any, b: any) => a !== a && b !== b;

export namespace Observer {
  export type Observed<T extends object = object> = {
    // todo recursive
    [K in keyof T]: T[K] extends object ? Observed<T[K]> : T[K];
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

  export type ObjectEvent<T> = {
    props: Array<keyof T | "valueOf">;
    target: T;
  };

  export type Callback<T> = (event: ObjectEvent<T>) => void;
}

interface IStored {
  propListeners: Array<Observer.PropCallback<any>>;
  listeners: Array<Observer.Callback<any>>;
}

type PartialDateEvent = Omit<Observer.PropEvent<Date, "valueOf">, "target">;
type PartialPropEvent<T extends object> = Omit<Observer.BasicPropEvent<T, keyof T>, "target" | "prop"> & {
  prop: string | symbol;
};

const symObserved = Symbol("__observed");
type PrivateObserved<T extends object> = Observer.Observed<T> & {
  readonly [symObserved]: PrivateObserved<T>;
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

/** Helper to detect object changes;
 * @example
 * const raw = { date: new Date(), period: 3 };
 * const obj = observer.make(raw);
 * observer.onPropChanged(obj, (e) => console.warn(e));
 * observer.onChanged(obj, (e) => console.warn(e));
 * obj.period = 5;
 */
const observer = {
  /** Returns @true if object is observed (is applied observer.make()) */
  isObserved<T extends object>(obj: T): boolean {
    return !!(obj as PrivateObserved<T>)[symObserved];
  },
  /** Make observable object to detect changes; @see Proxy */
  make<T extends object>(obj: T): Observer.Observed<T> {
    const prevProxy = (obj as PrivateObserved<T>)[symObserved];
    if (prevProxy) {
      return prevProxy as PrivateObserved<T>;
    }

    const isDate = obj instanceof Date;

    const listeners: IStored["listeners"] = [];
    const propListeners: IStored["propListeners"] = [];
    const hasListeners = () => listeners.length || propListeners.length;
    let changedProps: Array<keyof T> = [];
    let timeoutId: ReturnType<typeof setTimeout> | undefined | number;

    const propChanged = <K extends keyof T>(e: PartialDateEvent | PartialPropEvent<T>) => {
      // eslint-disable-next-line no-use-before-define
      (e as Observer.PropEvent<T, K>).target = proxy;
      // todo wrap in tryCatch
      propListeners.forEach((f) => f(e as Observer.PropEvent<T, K>));
      if (listeners.length) {
        changedProps.push(e.prop as keyof T);
        if (timeoutId) {
          return;
        }
        // empty timeout filters bunch of changes to single event
        timeoutId = setTimeout(() => {
          timeoutId = undefined;
          const ev: Observer.ObjectEvent<Observer.Observed<T>> = {
            props: changedProps,
            // eslint-disable-next-line no-use-before-define
            target: proxy,
          };
          listeners.forEach((f) => f(ev));
          changedProps = [];
        });
      }
    };

    const proxyHandler: ProxyHandler<typeof obj> = {
      set(_t, prop, next) {
        const prev = obj[prop as keyof T];
        // @ts-ignore
        const r = Reflect.set(...arguments);
        if (hasListeners()) {
          let isChanged = false;
          if (prev == null || next == null) {
            isChanged = prev !== next;
          } else {
            // todo check when value NaN: in this case
            // var a = NaN;
            // a !== a; // true
            isChanged = (prev as any).valueOf() !== (next as any).valueOf();
          }
          isChanged && propChanged({ prev, next, prop });
        }
        return r;
      },
      deleteProperty(t, prop) {
        if (hasListeners() && !isDate) {
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
        // wrap if listeners exists
        if (hasListeners() && typeof v === "function") {
          if (dateWatchKeys.has(prop as string)) {
            return (...args: any[]) => {
              const prev = (obj as Date).valueOf();
              const r = v.apply(obj as Date, args);
              const next = (obj as Date).valueOf();
              // Date possible to be NaN;
              if (prev !== next && !isBothNaN(prev, next)) {
                propChanged({ prev, next, prop: "valueOf" });
              }
              return r;
            };
          }
          // return default with correct context
          return v.bind(t);
        }
        return v;
      };
    }
    const proxy = new Proxy(obj, proxyHandler) as PrivateObserved<T>;
    Object.defineProperty(proxy, symObserved, { get: () => proxy });

    observeSet.set(proxy, { propListeners, listeners });
    return proxy;
  },

  /** Listen for any props changing on the object; callback is called per each prop-changing */
  onPropChanged<T extends Observer.Observed<object>>(
    target: T,
    callback: Observer.PropCallback<T>
    // options: { once?: boolean }
  ) {
    const o = observeSet.get(target);
    if (!o) {
      throw new Error("Only Observed objects expected. Use make() before");
    }
    callback && o.propListeners.push(callback);
  },

  /** Listen for any changing on the object; callback is called single time per bunch of props-changing */
  onChanged<T extends Observer.Observed<object>>(
    target: T,
    callback: Observer.Callback<T>
    // options: { once?: boolean }
  ) {
    const o = observeSet.get(target);
    if (!o) {
      throw new Error("Only Observed objects expected. Use make() before");
    }
    callback && o.listeners.push(callback);
  },
};

// const raw = { date: new Date(), period: 3, internal: { val: "str" } };
// const obj = observer.make(raw);
// observer.onPropChanged(obj, (e) => console.warn(e));
// observer.onChanged(obj, (e) => console.warn(e));
// obj.period = 5;

// const test = obj.internal;
// console.warn(test);

Object.seal(observer);
export default observer;
