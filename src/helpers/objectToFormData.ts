interface FormDataOptions {
  /** Props with `null` OR `undefined` will be written as empty-string; otherwise it's skipped */
  includeNulls?: boolean;
}

/** Converts pointed object with nested properties to plain FormData
 * @returns Pointed formData or new FormData */
export default function objectToFormData(
  fromObj: Record<string, any> | Array<any>,
  toForm?: FormData | null,
  opts?: FormDataOptions | null
): FormData {
  toForm ||= new FormData();
  const canNulls = opts?.includeNulls ?? false;

  function map(v: any, prop: string): void {
    if (Array.isArray(v)) {
      v.forEach((val, index) => {
        map(val, `${prop}[${index}]`);
      });
    } else if (v == null) {
      if (canNulls) {
        toForm!.append(prop, ""); // nulls must be written as empty string
      }
    } else if (typeof v === "object") {
      if (v instanceof Date) {
        toForm!.append(prop, v.toJSON());
      } else if (v instanceof File) {
        toForm!.append(prop, v, v.name);
      } else {
        Object.keys(v).forEach((key) => {
          const s = `${prop ? `${prop}.` : ""}${key as string}`;
          map((v as Record<string, any>)[key as string], s);
        });
      }
    } else {
      toForm!.append(prop, v); // Add primitive values (strings, numbers, etc.)
    }
  }

  map(fromObj, "");
  return toForm;
}
