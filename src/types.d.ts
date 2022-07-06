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
  setAttribute(qualifiedName: string, value: boolean | string): void;
}
