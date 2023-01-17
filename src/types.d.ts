type ObjectKeys<T> =
  // prettier-ignore
  T extends object ? (keyof T)[] :
  T extends number ? [] :
  T extends Array<any> | string ? string[] :
  never;

interface ObjectConstructor {
  keys<T>(o: T): ObjectKeys<T>;
  getOwnPropertyNames<T>(o: T): (keyof T | "constructor")[];
}

type Func = (...args: any[]) => any;

interface Element {
  setAttribute(qualifiedName: string, value: boolean | string | number): void;
}

type LowerKeys<T> = keyof {
  [P in keyof T as Lowercase<string & P>]: P;
};

interface Window {
  /** Reference to HTMLStyleElement with WUP-styles */
  WUPrefStyle?: HTMLStyleElement;
}
