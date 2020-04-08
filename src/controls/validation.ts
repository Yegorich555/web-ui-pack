export type Validation<T, setVType> = {
  test: (v: T, setV: setVType) => boolean;
  msg: string | ((setV: boolean) => string) | ((setV: number) => string);
};

export interface Validations<T> {
  [key: string]: Validation<T, any>;
}

export const ValidationMessages = {
  required: "This field is required",
  minText: (setV: number): string => `Min length is ${setV} characters`,
  maxText: (setV: number): string => `Max length is ${setV} characters`
};
