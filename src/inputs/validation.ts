export type Validation<T, setVType> = {
  test: (v: T, setV?: setVType) => boolean;
  msg: string | ((setV: number | string) => string);
};

export interface Validations<T, setVType> {
  [key: string]: Validation<T, setVType>;
}

export interface ValidationProps {
  [key: string]: boolean;
}
