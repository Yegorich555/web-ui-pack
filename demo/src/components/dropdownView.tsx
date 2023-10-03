/* eslint-disable react/no-unescaped-entities */
import Page from "src/elements/page";
import { WUPDropdownElement } from "web-ui-pack";
import MyLink from "src/elements/myLink";
import styles from "./dropdownView.scss";

const sideEffect = WUPDropdownElement;
!sideEffect && console.error("Missed"); // It's required otherwise import is ignored by webpack

export default function DropdownView() {
  return (
    <Page //
      header="WUPDropdownElement"
      link="src/dropdownElement.ts"
      features={[
        "Built-in animations: opacity, drawer, stack",
        "Easy to customize behavior via options of <wup-dropdown> & <wup-popup>",
        "Accessibility support",
      ]}
      details={{
        tag: "wup-dropdown",
        linkDemo: "demo/src/components/dropdownView.tsx",
        customHTML: [
          `html
<wup-dropdown>
  <button type="button">Click me</button>
  <wup-popup w-placement="left-start" w-animation="drawer">
      <ul>
        <li>Home</li>
        <li>Products</li>
        <li>Profile</li>
      </ul>
   </wup-popup>
</wup-dropdown>`,
        ],
      }}
    >
      <section>
        <h3>Default (animation: drawer)</h3>
        {/* <small>some details here</small> */}
        <wup-dropdown>
          <button type="button">Click me</button>
          <wup-popup>
            <ul>
              <li>Home</li>
              <li>Products</li>
              <li>Profile</li>
              <li>Very</li>
              <li>or</li>
              <li>not</li>
              <li>very</li>
              <li>long</li>
              <li>list</li>
            </ul>
          </wup-popup>
        </wup-dropdown>
      </section>
      <section>
        <h3>
          Customized (animation: stack)
          <MyLink href="demo/src/components/dropdownView.tsx" gitIcon />
        </h3>
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
      </section>
    </Page>
  );
}
