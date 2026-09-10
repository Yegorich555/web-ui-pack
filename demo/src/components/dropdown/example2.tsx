import Example from "src/elements/example";
import styles from "./dropdownView.scss";

export default function Example2() {
  return (
    <Example
      header="Customized (animation: stack)"
      link="demo/src/components/dropdown/example2.tsx"
      // WARN: bottom: 120px required to show stack-bottom on smaller screens; otherwise it shows at the top
      style={{ marginBottom: "120px" }}
    >
      <small>use popup $options.placement to change direction</small>
      <wup-dropdown class={styles.custom}>
        <button type="button">{"<"}</button>
        <wup-popup w-placement="left-middle" w-animation="stack">
          <ul>
            <li>
              <button type="button">A</button>
            </li>
            <li>
              <button type="button">B</button>
            </li>
            <li>
              <button type="button">C</button>
            </li>
            <li>
              <button type="button">C2</button>
            </li>
          </ul>
        </wup-popup>
      </wup-dropdown>
      <wup-dropdown class={`${styles.custom} ${styles.vertical}`}>
        <button type="button" style={{ transform: "rotate(90deg)" }}>
          {">"}
        </button>
        <wup-popup w-placement="bottom-middle" w-animation="stack">
          <ul>
            <li>
              <button type="button">A</button>
            </li>
            <li>
              <button type="button">B</button>
            </li>
            <li>
              <button type="button">C</button>
            </li>
          </ul>
        </wup-popup>
      </wup-dropdown>
      <wup-dropdown class={`${styles.custom} ${styles.vertical}`}>
        <button type="button" style={{ transform: "rotate(-90deg)" }}>
          {">"}
        </button>
        <wup-popup w-placement="top-middle" w-animation="stack">
          <ul>
            <li>
              <button type="button">A</button>
            </li>
            <li>
              <button type="button">B</button>
            </li>
            <li>
              <button type="button">C</button>
            </li>
          </ul>
        </wup-popup>
      </wup-dropdown>
      <wup-dropdown class={styles.custom}>
        <button type="button">{">"}</button>
        <wup-popup w-placement="right-middle" w-animation="stack">
          <ul>
            <li>
              <button type="button">A</button>
            </li>
            <li>
              <button type="button">B</button>
            </li>
            <li>
              <button type="button">C</button>
            </li>
          </ul>
        </wup-popup>
      </wup-dropdown>
    </Example>
  );
}
