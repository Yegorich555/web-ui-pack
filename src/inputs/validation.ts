export type Validation<T, setVType> = {
  test: (v: T, setV: setVType) => boolean;
  msg: string | ((setV: boolean) => string) | ((setV: number) => string);
};

export interface Validations<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: Validation<T, any>;
}

export interface ValidationProps {
  // todo string for overriding default message can be setV
  [key: string]: boolean | number | string | undefined | null;
}

export const ValidationMessages = {
  required: "This field is required",
  minText: (setV: number): string => `Min length is ${setV} characters`,
  maxText: (setV: number): string => `Max length is ${setV} characters`
};
