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
   * @return Returns the resolved value.
   */
  get<TObj extends Record<string, any>, TVal>(obj: TObj, path: string): TVal | undefined {
    const propKeys = path.split(".");
    let prop = obj[propKeys[0]];
    for (let i = 1; i < propKeys.length; ++i) {
      if (prop == null || !propKeys[i]) {
        return undefined;
      }
      prop = prop[propKeys[i]];
    }
    return prop;
  },
};

export default nestedProperty;
