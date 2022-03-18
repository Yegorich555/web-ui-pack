/* eslint-disable jsx-a11y/label-has-associated-control */
interface Props {
  items: Array<{ label: string; value: any }>;
  defaultValue: any;
  onChange: (v: any) => void;
  label: string;
}
export default function InputRadio({ items, defaultValue, onChange, label }: Props) {
  return (
    <fieldset
      onChange={(e) => {
        const v = (e.target as HTMLInputElement).value;
        onChange(items[+v].value);
      }}
    >
      <legend>{label}</legend>
      {items.map((x, i) => (
        <label key={x.value}>
          {x.label}
          <input name={items[0].label} type="radio" value={i.toString()} defaultChecked={x.value === defaultValue} />
        </label>
      ))}
    </fieldset>
  );
}
