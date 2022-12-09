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
    label?: string;
    name?: string;
    autoComplete?: string | boolean;
    readOnly?: boolean;
    disabled?: boolean;
  };

  gotFormChanges: (propsChanged: Array<string> | null) => void;
  validateBySubmit: () => string | false;
}
