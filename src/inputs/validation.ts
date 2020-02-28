export type Validation<T, setVType> = {
  test: (v: T, setV?: setVType) => boolean;
  msg: string | ((setV: number | string) => string);
};

export interface Validations<T> {
  [key: string]: Validation<T, unknown>;
}

export interface ValidationProps {
  [key: string]: boolean;
}

export const ValidationMessages = {
  required: "This field is required",
  minText: (setV: number): string => `Min length is ${setV} characters`,
  maxText: (setV: number): string => `Max length is ${setV} characters`
};
