const nestedProperty = {
  /** Parse "obj.nestedValue.items[0].id" into array of keys [obj, nestedValues, items, 0, id] */
  parsePath(path: string): [string[], boolean[]] {
    const keys: string[] = [];
    const isArray: boolean[] = [];
    let start = 0;

    for (let i = 0; i < path.length; i++) {
      const c = path[i];
      const isNextArr = c === "[";

      if (isNextArr || c === ".") {
        if (i > start) {
          keys.push(path.substring(start, i));
          isArray.push(isNextArr); // Mark the property as array if followed by `[`
        }

        if (isNextArr) {
          const close = path.indexOf("]", i);
          keys.push(path.substring(i + 1, close));
          isArray.push(false); // the index itself is not an array
          i = close;
        }
        start = i + 1;
      }
    }

    if (start < path.length) {
      keys.push(path.substring(start));
      isArray.push(false);
    }

    return [keys, isArray];
  },
  /**
   * Sets the value at path of object. If a portion of path doesn’t exist it’s created.
   * nestedProperty.set(obj, "value.nestedValue", 1) as obj.value.nestedValue = 1;
   * @param object The object to modify.
   * @param path The path of the property to set; point `obj.items[0].id` for example
   * @param value The value to set.
   * @returns pointed same object
   */
  set<T extends Record<string, any>>(obj: T, path: string, value: any): T {
    if (!path) {
      return obj;
    }

    const result = obj;
    const [propKeys, isArray] = nestedProperty.parsePath(path);

    let key = propKeys[0] as keyof T;
    for (let i = 0; i < propKeys.length - 1; key = propKeys[++i] as keyof T) {
      if (!obj[key]) {
        obj[key] = (isArray[i] ? [] : {}) as T[keyof T];
      }
      obj = obj[key];
    }
    obj[key] = value;

    return result;
  },
  /**
   * Gets the property value at path of object.
   * nestedProperty.get(obj, "nestedValue1.nestVal2") returns value from obj.nestedValue1.nestVal2
   * @param object The object to query.
   * @param path The path of the property to get; point `obj.items[0].id` for example
   * @param out output object. Point empty {} if you want to get extrachecking hasProp (to define if prop undefined and exists)
   * @return Returns the resolved value.
   */
  get<TObj extends Record<string, any>, TVal>(obj: TObj, path: string, out?: { hasProp?: boolean }): TVal | undefined {
    if (!path) {
      return undefined;
    }

    const [propKeys] = nestedProperty.parsePath(path);
    let next = obj;

    for (let i = 0; i < propKeys.length; ++i) {
      if (next == null) {
        break;
      }
      const key = propKeys[i];

      if (out != null) {
        out.hasProp = key in next;
      }
      next = next[key];
    }

    return next as unknown as TVal;
  },
};

export default nestedProperty;
