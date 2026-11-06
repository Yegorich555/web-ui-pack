import Example from "src/elements/example";
import { useBuiltinStyle, WUPcssButton } from "web-ui-pack/styles";
import styles from "./dropdownView.scss";

useBuiltinStyle(WUPcssButton(`.${styles.primary} > button`)); // toggle button is styled as primary

const items = ["Home", "Products", "Profile", "Very", "or", "not", "very", "long", "list"];

export default function Example1() {
  return (
    <Example header="Default (animation: drawer)" link="demo/src/components/dropdown/example1.tsx">
      <wup-dropdown>
        <button type="button">Click me</button>
        <wup-popup>
          <ul>
            {items.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </wup-popup>
      </wup-dropdown>
      <wup-dropdown class={styles.primary}>
        <button type="button">Dropdown with ButtonPrimaryStyle</button>
        <wup-popup>
          <ul>
            {items.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </wup-popup>
      </wup-dropdown>
    </Example>
  );
}
