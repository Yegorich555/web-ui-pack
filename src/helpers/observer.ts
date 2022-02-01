/* eslint-disable prefer-rest-params */
// discussions here https://stackoverflow.com/questions/5100376/how-to-watch-for-array-changes

/** const a = NaN; a !== a; // true */
// eslint-disable-next-line no-self-compare
const isBothNaN = (a: unknown, b: unknown) => a !== a && b !== b;
const arrRemove = <T>(arr: Array<T>, item: T) => {
  const i = arr.indexOf(item);
  if (i > -1) {
    arr.splice(i, 1);
  }
};

type Func = (...args: any[]) => any;

export namespace Observer {
  export interface IObserver {
    /** Returns @true if object is observed (is applied observer.make()) */
    isObserved<T extends object>(obj: T): boolean;
    /** Make observable object to detect changes; @see Proxy */
    make<T extends object>(obj: T): Observer.Observed<T>;
    /** Listen for any props changing on the object; callback is called per each prop-changing
     * @returns callback to removeListener */
    onPropChanged<T extends Observer.Observed<object>>(
      target: T,
      callback: Observer.PropCallback<T> // options: { once?: boolean }
    ): () => void;
    /** Listen for any changing on the object; callback is called single time per bunch of props-changing
     * @returns callback to removeListener */
    onChanged<T extends Observer.Observed<object>>(
      target: T,
      callback: Observer.Callback<T>
      // options: { once?: boolean }
    ): () => void;
  }
  export type Observed<T extends object = object> = {
    // todo recursive
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
  parentRefs: Array<{ key: any; ref: Ref<any> }>;
  hasListeners: () => boolean;
  hasObjListeners: () => boolean;
  onPropChanged: (e: Observer.PropEvent<T, keyof T>) => void;
  onChanged: (ev: Observer.ObjectEvent<T>) => void;
}

const symObserved = Symbol("__observed");
type PrivateObserved<T extends object = object> = Observer.Observed<T> & {
  readonly [symObserved]: Ref<Observer.Observed<T>>;
};

function isObserved<T extends object>(obj: T): boolean {
  return obj && !!(obj as PrivateObserved<T>)[symObserved];
}
// type Ref<T extends object> = PrivateObserved<T>[typeof symObserved];

type WatchItem<T> = {
  is: (obj: unknown) => boolean;
  keys: Set<keyof T>;
  getVal: (obj: T) => any;
  propKey: keyof T;
};

const watchSet: Array<WatchItem<any>> = [
  <WatchItem<Date>>{
    is: (obj) => obj instanceof Date,
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
    is: (obj) => obj instanceof Set,
    keys: new Set(["add", "delete", "clear"]),
    getVal: (obj) => obj.size,
    propKey: "size",
  },
  <WatchItem<Map<unknown, unknown>>>{
    is: (obj) => obj instanceof Map,
    keys: new Set(["set", "delete", "clear"]),
    getVal: (obj) => obj.size,
    propKey: "size",
  },
];

function appenCallback<T extends Observer.Observed<object>, K extends "listeners" | "propListeners">(
  target: T,
  callback: K extends "propListeners" ? Observer.PropCallback<T> : Observer.Callback<T>,
  setKey: K
) {
  const o = (target as PrivateObserved<object>)[symObserved];
  if (!o) {
    throw new Error("Observer. Only observed objects expected. Use make() before");
  }
  if (!callback) {
    throw new Error("Observer. Callback is missed");
  }
  const arr = o[setKey];
  arr.push(callback as unknown as any);

  return () => arrRemove(arr, callback as unknown as any);
}

function make<T extends object>(
  obj: T,
  parentRef: { key: any; ref: Ref<Observer.Observed<any>> } | undefined
): Observer.Observed<T> {
  const isAssigned = (obj as PrivateObserved<T>)[symObserved];
  if (isAssigned) {
    // todo change parentRefs to Map
    if (parentRef && !isAssigned.parentRefs.some((p) => p === parentRef)) {
      isAssigned.parentRefs.push(parentRef);
    }
    return obj;
  }
  const isDate = obj instanceof Date;
  const ref: Ref<Observer.Observed<T>> = {
    propListeners: [],
    listeners: [],
    parentRefs: parentRef ? [parentRef] : [],
    hasListeners: () =>
      !!ref.listeners.length || !!ref.propListeners.length || ref.parentRefs.some((p) => p.ref.hasListeners()),
    hasObjListeners: () => !!ref.listeners.length || ref.parentRefs.some((p) => p.ref.hasObjListeners()),
    onPropChanged: (e) => {
      // eslint-disable-next-line no-use-before-define
      const target = proxy as Observer.Observed<any>;
      if (e.target === null) {
        e.prev = target[e.prop];
        e.next = target[e.prop];
      }
      e.target = target; // required to reassign and propagate event through parents

      ref.propListeners.forEach((f) => f(e));
      ref.parentRefs.forEach((p) => {
        // console.warn("test", { prev: target[p.key], next: target[p.key], prop: p.key, target });
        p.ref.onPropChanged({ ...e, prop: p.key, target: null });
      });
    },
    onChanged: (e) => {
      // eslint-disable-next-line no-use-before-define
      e.target = proxy; // required to reassign and propagate event through parents
      ref.listeners.forEach((f) => f(e));
      ref.parentRefs.forEach((p) => p.ref.onChanged({ ...e, props: [p.key] }));
    },
  };

  let changedProps: Array<keyof T> = [];
  let timeoutId: ReturnType<typeof setTimeout> | undefined | number;

  const propChanged = <K extends keyof T>(e: Omit<Observer.BasicPropEvent<any, any>, "target">) => {
    // eslint-disable-next-line no-use-before-define
    (e as Observer.PropEvent<T, K>).target = proxy;
    // todo wrap in tryCatch
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
          // eslint-disable-next-line no-use-before-define
          target: proxy,
        };
        ref.onChanged(ev);

        changedProps = [];
      });
    }
  };
  let isReady = false;
  const proxyHandler: ProxyHandler<typeof obj> = {
    set(t, prop, next) {
      const prev = t[prop as keyof T] as any;
      // @ts-ignore
      const isOk = Reflect.set(...arguments);
      if (!isReady) {
        return isOk;
      }
      if (isOk && ref.hasListeners()) {
        let isChanged = false;
        if (prev == null || next == null) {
          isChanged = prev !== next;
        } else {
          isChanged = prev.valueOf() !== (next as any).valueOf() && !isBothNaN(prev, next);
        }
        isChanged && propChanged({ prev, next, prop });
      }

      if (isOk && prev !== next) {
        // todo implement unassign
        // if (isObserved(prev)) {
        //   const pRef = (prev as PrivateObserved)[symObserved].parentRefs;
        //   arrRemove(
        //     pRef,
        //     pRef.find((p) => p.key === prop)
        //   );
        // }
        if (next instanceof Object && typeof next !== "function") {
          next = make(next, { key: prop, ref });
          Reflect.set(t, prop, next);
        }
      }

      return isOk;
    },
    deleteProperty(t, prop) {
      // todo implement delete property
      if (!isDate && ref.hasListeners()) {
        const prev = t[prop as keyof T];
        propChanged({ prev, next: undefined, prop });
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
            if (prev !== next && !isBothNaN(prev, next)) {
              propChanged({ prev, next, prop: watchObj.propKey as string });
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
  Object.defineProperty(proxy, symObserved, { get: () => ref });

  // scan recursive
  if (!isDate) {
    Object.keys(obj).forEach((k) => {
      const v = obj[k] as any;
      if (v instanceof Object && typeof v !== "function") {
        proxy[k] = make(v, { ref, key: k }) as never;
      }
    });
  }
  isReady = true; // required to avoid double make on same proxy
  return proxy;
}

/** Helper to detect object changes;
 * @example
 * const raw = { date: new Date(), period: 3 };
 * const obj = observer.make(raw);
 * const removeListener = observer.onPropChanged(obj, (e) => console.warn(e));
 * const removeListener2 = observer.onChanged(obj, (e) => console.warn(e));
 * obj.period = 5;
 * removeListener();
 * removeListener2();
 */
const observer: Observer.IObserver = {
  isObserved,
  make<T extends object>(obj: T): Observer.Observed<T> {
    return make(obj, undefined);
  },
  onPropChanged<T extends Observer.Observed<object>>(
    target: T,
    callback: Observer.PropCallback<T>
    // options: { once?: boolean }
  ) {
    return appenCallback(target, callback, "propListeners");
  },

  onChanged<T extends Observer.Observed<object>>(
    target: T,
    callback: Observer.Callback<T>
    // options: { once?: boolean }
  ) {
    return appenCallback(target, callback, "listeners");
  },
};

// const obj = observer.make({ ref: { val: 1 } });
// const { ref } = obj;
// // debugger;
// const obj2 = observer.make({ ref });
// // observer.onPropChanged(obj, (e) => console.warn("prop: 1st", e));
// observer.onChanged(obj, (e) => console.warn("obj: 1st", e));

// observer.onPropChanged(obj2, (e) => console.warn("prop: 2nd", e));
// observer.onChanged(obj2, (e) => console.warn("obj: 2nd", e));
// ref.val = 2;
// console.warn(ref[symObserved]);

// const obj = observer.make({ val: 1, inObj: { val: 123 } });
// observer.onChanged(obj, (e) => console.warn(e));
// obj.inObj.val = 999;

Object.seal(observer);
export default observer;
