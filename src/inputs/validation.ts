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

export const MessageRequired = "This field is required";
