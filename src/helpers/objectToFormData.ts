interface FormDataOptions {
  /** Props with `null` OR `undefined` will be written as empty-string; otherwise it's skipped
   * @defaultValue false */
  includeNulls?: boolean;
  /** Point TRUE for bracket-notation, otherwise dot-notation by default
   * * For NodeJS use bracket-notation `options[slots][0][isEnabled]: "true"`
   * * For .NET use dot-notation `"options.slots[0].isEnabled": "true"
   * @defaultValue false */
  bracketNotation?: boolean;
  /** Point true for array-notation for plain types (inside arrays): primitives | Date | File
   * * If TRUE -  optionIds[0]: "1", optionIds[1]: "2" but items[0].Id = "15" or items[0]Id = "1"
   * * If FALSE - optionIds: "1",    optionIds:    "2"  but items[0].Id = "15" or items[0]Id = "1"
   * * For NodeJS it depends on handling library
   * * For .NET use FALSE
   * @defaultValue false */
  arrayNotationForPlainTypes?: boolean;
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
  const isBracketNotation = opts?.bracketNotation ?? false;
  const useArrayNotation = opts?.arrayNotationForPlainTypes ?? false;

  function map(v: any, prop: string): void {
    if (Array.isArray(v)) {
      v.forEach((val, index) => {
        const skipArrNotation =
          !useArrayNotation && (val == null || typeof val !== "object" || val instanceof Date || val instanceof File);
        const propWithIndex = skipArrNotation ? prop : `${prop}[${index}]`;
        map(val, propWithIndex);
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
      } else if (isBracketNotation) {
        Object.keys(v).forEach((key) => {
          const s = prop ? `${prop}[${key as string}]` : (key as string);
          map((v as Record<string, any>)[key as string], s);
        });
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
