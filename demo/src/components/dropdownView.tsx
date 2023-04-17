/* eslint-disable react/no-unescaped-entities */
import Page from "src/elements/page";
import { WUPDropdownElement } from "web-ui-pack";
import styles from "./dropdownView.scss";

const sideEffect = WUPDropdownElement;
!sideEffect && console.error("Missed"); // It's required otherwise import is ignored by webpack

export default function DropdownView() {
  return (
    <Page //
      header="WUPDropdownElement"
      link="src/dropdownElement.ts"
      details={{
        tag: "wup-dropdown",
      }}
      features={["Todo "]}
    >
      <section>
        <h3>Default</h3>
        {/* <small>some details here</small> */}
        <wup-dropdown>
          <button type="button">Default</button>
          <wup-popup>
            <ul>
              <li>Home</li>
              <li>Products</li>
              <li>Profile</li>
            </ul>
          </wup-popup>
        </wup-dropdown>
      </section>
      <section>
        <h3>Customized</h3>
        <wup-dropdown class={styles.custom}>
          <button type="button">{">"}</button>
          <wup-popup placement="right-middle">
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
