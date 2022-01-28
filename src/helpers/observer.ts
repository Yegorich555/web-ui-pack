/* eslint-disable prefer-rest-params */
// discussions here https://stackoverflow.com/questions/5100376/how-to-watch-for-array-changes

// todo recursive for arrays, nested objects
// todo single call listener for many changes in time: how to provide listener in this case ?

const symObserved = Symbol("__observed");
export type IObserved<T extends object = object> = T & {
  readonly [symObserved]: IObserved;
};
type IPropCallback<T> = <K extends keyof T>(event: { prev: T[K]; next: T[K]; prop: K; target: T }) => void;
interface IStored {
  propListeners: Array<IPropCallback<any>>;
}

const observeSet = new WeakMap<IObserved, IStored>();

const observer = {
  /** Make observable object; @see Proxy */
  make<T extends object>(obj: T): IObserved<T> {
    const prevProxy = (obj as IObserved)[symObserved];
    if (prevProxy) {
      return prevProxy as IObserved<T>;
    }

    const propListeners: IStored["propListeners"] = [];
    // const isArray = Array.isArray(obj);
    const proxy = new Proxy(obj, {
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
          if (isChanged) {
            propListeners.forEach((f) => f({ prev, next, prop: prop as keyof T, target: proxy }));
          }
        }
        // console.warn("test", arguments);
        return r;
      },
      deleteProperty(t, prop) {
        const prev = t[prop as keyof T];
        propListeners.forEach((f) => f({ prev, next: undefined, prop: prop as keyof T, target: proxy }));
        return true;
      },
      // it's fix for proxy-wrapped
      // check with this
      // https://learn.javascript.ru/proxy#zaschischyonnye-svoystva-s-lovushkoy-deleteproperty-i-drugimi
      // get() {
      //   // @ts-ignore
      //   const v = Reflect.get(...arguments);
      //   return typeof v === "function" ? v.bind(obj) : v;
      // },
    }) as IObserved<T>;

    Object.defineProperty(proxy, symObserved, { get: () => proxy });

    const stored: IStored = { propListeners };
    observeSet.set(proxy, stored);
    return proxy;
  },

  onPropChanged<T extends object>(
    target: IObserved<T>,
    callback: IPropCallback<T>
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
