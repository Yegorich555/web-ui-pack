// WARN: don't change the file to d.ts otherwise TS skip this in build result: https://stackoverflow.com/questions/56018167/typescript-does-not-copy-d-ts-files-to-build

export default interface IBaseControl<ValueType = any> extends HTMLElement {
  $value: ValueType | undefined;
  $initValue: ValueType | undefined;
  $isDirty: boolean;
  readonly $isChanged: boolean;
  readonly $isValid: boolean;
  readonly $isFocused: boolean;
  readonly $isDisabled: boolean;
  readonly $isReadOnly: boolean;
  readonly $autoComplete: string | false;

  $validate: () => string | false;

  $options: {
    label?: string | null;
    name?: string | null;
    autoComplete?: string | boolean | null;
    readOnly?: boolean | null;
    disabled?: boolean | null;
  };

  gotFormChanges: (propsChanged: Array<string> | null) => void;
  validateBySubmit: () => string | false;
  readonly canShowError: boolean;
  parse(text: string): ValueType | undefined;
}
