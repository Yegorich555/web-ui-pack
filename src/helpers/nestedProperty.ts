const nestedProperty = {
  /**
   * Sets the value at path of object. If a portion of path doesn’t exist it’s created.
   * nestedProperty.set(obj, "value.nestedValue", 1) as obj.value.nestedValue = 1;
   * @param object The object to modify.
   * @param path The path of the property to set.
   * @param value The value to set.
   */
  set<T extends Record<string, any>>(obj: T, path: string, value: any): void {
    const propKeys = path.split(".");
    let key = propKeys[0] as keyof T;
    for (let i = 0; i < propKeys.length - 1; key = propKeys[++i] as keyof T) {
      if (!obj[key]) {
        obj[key] = {} as T[keyof T];
      }
      obj = obj[key];
    }
    obj[key] = value;
  },
  /**
   * Gets the property value at path of object.
   * nestedProperty.get(obj, "nestedValue1.nestVal2") returns value from obj.nestedValue1.nestVal2
   * @param object The object to query.
   * @param path The path of the property to get.
   * @param out output object. Point empty {} if you want to get extrachecking hasProp (to define if prop undefined and exists)
   * @return Returns the resolved value.
   */
  get<TObj extends Record<string, any>, TVal>(obj: TObj, path: string, out?: { hasProp?: boolean }): TVal | undefined {
    const deepKeys = path.split(".");
    let next = obj;
    for (let i = 0; i < deepKeys.length; ++i) {
      if (next == null) {
        break;
      }
      if (out != null) {
        out.hasProp = deepKeys[i] in next;
      }
      next = next[deepKeys[i]];
    }

    return next as unknown as TVal;
  },
};

export default nestedProperty;
