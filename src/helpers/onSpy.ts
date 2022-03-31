/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable prefer-rest-params */
type FuncProps<T> = { [P in keyof T]: T[P] extends CallableFunction ? P : never }[keyof T];

/**
 * Spy on method-call of object
 * @returns reset function; call it to rollback spy
 */
export default function onSpy<T extends object, K extends FuncProps<T>>(
  obj: T,
  method: K,
  // @ts-ignore
  callback: (...args: Parameters<T[K]>) => void
): () => void {
  const orig = obj[method] as T[K] & Function;
  const n = {
    [method]() {
      const r = orig.apply(obj, arguments);
      callback.apply(obj, arguments as any);
      return r;
    },
  };
  obj[method] = n[method as string] as unknown as T[K];

  return () => (obj[method] = orig);
}
