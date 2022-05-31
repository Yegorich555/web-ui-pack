export default interface IBaseControl<ValueType = any> extends HTMLElement {
  $value: ValueType | undefined;
  $initValue: ValueType | undefined;
  $isDirty: boolean;
  readonly $isChanged: boolean;
  readonly $isValid: boolean;
  readonly $isFocused: boolean;
  $validate: () => string | false;

  $options: {
    label?: string;
    name?: string;
    autoFillName?: string;
    readOnly?: boolean;
    disabled?: boolean;
  };
}
