/**
 * Validation that must be predefined in control;
 * if .test(value, setValue) is false then .msg will be shown
 */
export type Validation<T, setVType> = {
  test: (v: T, setV: setVType) => boolean;
  msg: string | ((setV: boolean) => string) | ((setV: number) => string);
};

/** Collection of validations */
export interface Validations<T> {
  [key: string]: Validation<T, any>;
}

/** Default error messages for control-validations */
export const ValidationMessages = {
  required: "This field is required",
  minText: (setV: number): string => `Min length is ${setV} characters`,
  maxText: (setV: number): string => `Max length is ${setV} characters`
};
