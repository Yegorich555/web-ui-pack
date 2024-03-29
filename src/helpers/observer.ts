/* eslint-disable prefer-rest-params */
// discussions here https://stackoverflow.com/questions/5100376/how-to-watch-for-array-changes
import isEqual from "./isEqual";

// #region Helpers
const arrRemove = <T>(arr: Array<T>, item: T): void => {
  const i = arr.indexOf(item);
  arr.splice(i, 1);
};

const some = <K, V>(m: Map<K, V>, predicate: (key: K, val: V) => boolean): boolean => {
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of m.entries()) {
    if (predicate(key, value)) {
      return true;
    }
  }
  return false;
};

const pathThrough = <R>(fn: () => R): Promise<R> =>
  new Promise((resolve) => {
    resolve(fn());
  });

/** Returns true if object is valid Record<string, any> and need to iterate props */
const isRecord = (obj: any): boolean =>
  obj !== null && typeof obj === "object" && !(obj instanceof HTMLElement) && !(obj instanceof Promise);
const isDate = (obj: any): boolean => Object.prototype.toString.call(obj) === "[object Date]";

// #endregion

// #region Types
export namespace Observer {
  export interface IObserver {
    /** Returns @true if object is observed (converted via observer.make()) */
    isObserved(obj: any): boolean;
    /** Make observable object to detect changes;
     * @see {@link Proxy} */
    make<T extends object>(obj: T, opts?: Options<T>): Observer.Observed<T>;
    /** Listen for any props changing on the observed; callback is called per each prop-changing
     * @returns callback to removeListener */
    onPropChanged<T extends Observer.Observed<object>>(
      target: T,
      callback: Observer.PropCallback<T> // options: { once?: boolean }
    ): () => void;
    /** Listen for any changing on the observed; callback is called single time per bunch of props-changing
     * @returns callback to removeListener */
    onChanged<T extends Observer.Observed<object>>(
      target: T,
      callback: Observer.Callback<T>
      // options: { once?: boolean }
    ): () => void;
  }
  export interface Options<T> {
    /** Point array of nested prop-names to exclude from observer or true to exclude every nested property of object
     * @tutorial Troubleshooting
     * * point ['items'] to exclude any nested props of property with name `items` from obsserved of obj.items
     * * obj.nested.items - will be also fit the rule
     * * point `true` to exclude all nested */
    excludeNested?: Array<keyof T> | boolean;
  }
  export type Observed<T extends object = object> = {
    [K in keyof T]: T[K] extends Record<string, unknown> ? Observed<T[K]> : T[K];
  };

  export type BasicPropEvent<T, K extends keyof T> = {
    /** Previous value */
    prev: T[K] extends Func ? ReturnType<T[K]> : T[K] | undefined;
    /** Current/next value */
    next: T[K] extends Func ? ReturnType<T[K]> : T[K] | undefined;
    /** Prop that is changed; For arrays it can be `length`, for Set,MapSet - `size` */
    prop: K;
    /** Object to that prop related */
    target: T;
  };

  export type DateEvent<T extends Date> = BasicPropEvent<T, "valueOf">;
  export type MapSetEvent<T extends Set<any> | Map<any, any>> = BasicPropEvent<T, "size">;

  // prettier-ignore
  export type PropEvent<T, K extends keyof T> =
      T extends Date ? DateEvent<T>
    : T extends Set<any> | Map<any, any> ? MapSetEvent<T>
    : BasicPropEvent<T, K>;

  export type PropCallback<T> = <K extends keyof T>(event: PropEvent<T, K>) => void;

  export type ObjectEvent<T> = {
    // prettier-ignore
    props:
      T extends Date ? Array<"valueOf">
    : T extends Set<any> | Map<any, any> ? Array<"size">
    : Array<keyof T>;
    target: T;
  };

  export type Callback<T> = (event: ObjectEvent<T>) => void;
}

interface Ref<T extends Observer.Observed<object>> {
  propListeners: Array<Observer.PropCallback<T>>;
  listeners: Array<Observer.Callback<T>>;
  parentRefs: Map<Ref<any>, string>;
  hasListeners: () => boolean;
  hasObjListeners: () => boolean;
  onPropChanged: (e: Observer.PropEvent<T, keyof T>) => void;
  onChanged: (ev: Observer.ObjectEvent<T>) => void;
}

type WatchItem<T> = {
  is: (obj: unknown) => boolean;
  keys: Set<keyof T>;
  getVal: (obj: T) => any;
  propKey: keyof T;
};

// #endregion
// #region Functions
const watchSet: Array<WatchItem<any>> = [
  <WatchItem<Date>>{
    is: isDate,
    keys: new Set([
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
    ]),
    getVal: (obj) => obj.valueOf(),
    propKey: "valueOf",
  },
  <WatchItem<Set<unknown>>>{
    is: (obj) => Object.prototype.toString.call(obj) === "[object Set]",
    keys: new Set(["add", "delete", "clear"]),
    getVal: (obj) => obj.size,
    propKey: "size",
  },
  <WatchItem<Map<unknown, unknown>>>{
    is: (obj) => Object.prototype.toString.call(obj) === "[object Map]",
    keys: new Set(["set", "delete", "clear"]),
    getVal: (obj) => obj.size,
    propKey: "size",
  },
];

/** list with pair <Proxy, Ref>; Ref is bunch of arrays, callbacks etc. */
const lstObserved = new WeakMap<Observer.Observed, Ref<Observer.Observed<object>>>();
/** list with pair <RawObject, Proxy>; */
const lstObjProxy = new WeakMap<object, Observer.Observed>();

function isObserved(obj: any): boolean {
  return obj && lstObserved.has(obj);
}

function appendCallback<T extends Observer.Observed<object>, K extends "listeners" | "propListeners">(
  proxy: T,
  callback: K extends "propListeners" ? Observer.PropCallback<T> : Observer.Callback<T>,
  setKey: K
): () => void {
  const o = lstObserved.get(proxy);
  if (!o) {
    throw new Error("Observer. Only observed objects expected. Use make() before");
  }
  if (!callback) {
    throw new Error("Observer. Callback is missed");
  }
  const listeners = o[setKey];
  listeners.push(callback as unknown as any);

  return () => arrRemove(listeners, callback as unknown as any);
}

function make<T extends object>(
  obj: T,
  parentRef: { key: string; ref: Ref<Observer.Observed<any>> } | undefined,
  opts: Observer.Options<T> | undefined | null
): Observer.Observed<T> {
  // checking if object is already observed
  const prevProxy = lstObjProxy.get(obj);
  const isAssigned = lstObserved.get(prevProxy || obj);
  if (isAssigned) {
    if (parentRef) {
      // if (isAssigned.parentRefs.has(parentRef.ref)) {
      //   throw new Error("Observer. Wrong assignment: parentRef must be unique");
      // }
      isAssigned.parentRefs.set(parentRef.ref, parentRef.key);
    }
    return (prevProxy as Observer.Observed<T>) || obj;
  }

  const isDateObj = isDate(obj);
  const ref: Ref<Observer.Observed<T>> = {
    propListeners: [],
    listeners: [],
    parentRefs: parentRef ? new Map([[parentRef.ref, parentRef.key]]) : new Map(),
    hasListeners: () =>
      !!ref.listeners.length || //
      !!ref.propListeners.length || //
      some(ref.parentRefs, (r) => r.hasListeners()),
    hasObjListeners: () => !!ref.listeners.length || some(ref.parentRefs, (r) => r.hasObjListeners()),
    onPropChanged: (e) => {
      const target = proxy as Observer.Observed<any>;
      if (e.target === null) {
        e.prev = target[e.prop];
        e.next = target[e.prop];
      }
      e.target = target; // required to reassign and propagate event through parents

      ref.propListeners.forEach((f) => pathThrough(() => f(e)));
      ref.parentRefs.forEach((key, r) => r.onPropChanged({ ...e, prop: key, target: null }));
    },
    onChanged: (e) => {
      e.target = proxy; // required to reassign and propagate event through parents
      ref.listeners.forEach((f) => pathThrough(() => f(e)));
      ref.parentRefs.forEach((key, r) => r.onChanged({ ...e, props: [key] }));
    },
  };

  let changedProps: Array<keyof T> = [];
  let timeoutId: ReturnType<typeof setTimeout> | undefined | number;

  const propChanged = <K extends keyof T>(e: Omit<Observer.BasicPropEvent<any, any>, "target">): void => {
    (e as Observer.PropEvent<T, K>).target = proxy;
    ref.onPropChanged(e as Observer.PropEvent<T, K>);
    if (ref.hasObjListeners()) {
      changedProps.push(e.prop as keyof T);
      if (timeoutId) {
        return;
      }
      // empty timeout filters bunch of changes to single event
      timeoutId = setTimeout(() => {
        timeoutId = undefined;

        const ev: Observer.ObjectEvent<Observer.Observed<T>> = {
          props: changedProps as any,
          target: proxy,
        };

        changedProps = [];
        ref.onChanged(ev);
      });
    }
  };
  let isReady = false;
  const proxyHandler: ProxyHandler<typeof obj> = {
    set(t, prop, next, receiver) {
      if (!isReady) {
        return Reflect.set(t, prop, next, receiver);
      }

      const prev = t[prop as keyof T] as any;
      if (prev !== next) {
        // prev can be Proxy or Raw
        // next can be Proxy or Raw
        lstObserved.get(prev)?.parentRefs.delete(ref);
        if (opts?.excludeNested !== true && isRecord(next)) {
          const exclude = opts?.excludeNested;
          const optsDeep =
            Array.isArray(exclude) && exclude.includes(prop as any) ? { ...opts, excludeNested: true } : opts;
          next = make(next, { key: prop as string, ref }, optsDeep);
        }
      }

      const isOk = Reflect.set(t, prop, next, receiver);
      if (isOk && ref.hasListeners()) {
        !isEqual(prev, next) && propChanged({ prev, next, prop });
      }

      return isOk;
    },
    deleteProperty(t, prop) {
      const prev = t[prop as keyof T];
      if (!isDateObj && ref.hasListeners()) {
        propChanged({ prev, next: undefined, prop });
      }

      // remove parent from this object
      if (opts?.excludeNested !== true && isRecord(prev)) {
        const v = proxy[prop as keyof T] as unknown as Observer.Observed;
        (lstObserved.get(v) as Ref<object>).parentRefs.delete(ref);
      }
      return true;
    },
  };

  const watchObj = watchSet.find((v) => v.is(obj));
  if (watchObj) {
    proxyHandler.get = function get(t, prop, receiver) {
      const v = Reflect.get(t, prop, receiver) as Func;
      // wrap if listeners exists
      if (typeof v === "function") {
        if (watchObj.keys.has(prop) && ref.hasListeners()) {
          return (...args: any[]) => {
            const prev = watchObj.getVal(t);
            const r = v.apply(t, args);
            const next = watchObj.getVal(t);
            // Date possible to be NaN;
            !isEqual(prev, next) && propChanged({ prev, next, prop: watchObj.propKey as string });
            return r;
          };
        }
        // return default with correct context
        return v.bind(t);
      }
      return v;
    };
  }
  const proxy = new Proxy(obj, proxyHandler);
  lstObserved.set(proxy, ref as Ref<object>);
  lstObjProxy.set(obj, proxy);
  if (isRecord(obj) && obj.valueOf() === obj) {
    // warn: possible error if object isn't extensible
    Object.defineProperty(proxy, "valueOf", { value: () => obj.valueOf, enumerable: false });
  }

  // scan recursive
  const exclude = opts?.excludeNested;
  if (exclude !== true) {
    // not required because object keys is null: if (!isDate && !(obj instanceof Map || obj instanceof Set)) {
    Object.keys(obj).forEach((k) => {
      const v = obj[k] as any;
      if (isRecord(v)) {
        const optsDeep = exclude && exclude.includes(k) ? { ...opts, excludeNested: true } : opts;
        proxy[k] = make(v, { ref, key: k }, optsDeep) as never;
      }
    });
  }
  // }
  isReady = true; // required to avoid double make() on same proxy
  return proxy;
}
// #endregion

/** Helper to detect object changes;
 * @example
 * const raw = { date: new Date(), period: 3, nestedObj: { val: 1} };
 * const obj = observer.make(raw);
 * const removeListener = observer.onPropChanged(obj, (e) => console.warn(e));
 * const removeListener2 = observer.onChanged(obj, (e) => console.warn(e));
 * obj.period = 5; // events are fired after 1ms
 * removeListener();
 * removeListener2(); */
const observer: Observer.IObserver = {
  isObserved,
  make<T extends object>(obj: T, opts: Observer.Options<T>): Observer.Observed<T> {
    return make(obj, undefined, opts);
  },
  onPropChanged<T extends Observer.Observed<object>>(
    target: T,
    callback: Observer.PropCallback<T>
    // options: { once?: boolean }
  ) {
    return appendCallback(target, callback, "propListeners");
  },

  onChanged<T extends Observer.Observed<object>>(
    target: T,
    callback: Observer.Callback<T>
    // options: { once?: boolean }
  ) {
    return appendCallback(target, callback, "listeners");
  },
};

Object.seal(observer);
export default observer;

/*
  troubleshooting:
  const obj = observer.make({v: 1})
  obj.v = 2; // propsChanged
  obj.v = 1 // props not changed but event is called (because we use async)
*/
