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
        <h3>Customized</h3>
        <wup-dropdown class={`${styles.custom} ${styles.left}`}>
          <button type="button">{"<"}</button>
          <wup-popup
            // todo if left don't have space - select oposite
            placement="left-middle"
            ref={(el) => {
              if (el) {
                el.$options.offset = (r) => {
                  const m = [Math.round(-r.height / 2), Math.round(-r.width / 2)] as [number, number];
                  (el.firstElementChild as HTMLElement).style.margin = `${-m[0]}px ${-m[1]}px`;
                  return m;
                };
              }
            }}
          >
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
          <button type="button">
            <span style={{ transform: "rotate(90deg)" }}>{">"}</span>
          </button>
          <wup-popup placement="bottom-middle">
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
          <button type="button">
            <span style={{ transform: "rotate(-90deg)" }}>{">"}</span>
          </button>
          <wup-popup placement="top-middle">
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
        <wup-dropdown class={`${styles.custom} ${styles.right}`}>
          <button type="button">{">"}</button>
          <wup-popup
            placement="right-middle"
            ref={(el) => {
              if (el) {
                // setTimeout(() => {
                el.$show();
              }
            }}
          >
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
