/* eslint-disable no-promise-executor-return */
import Page from "src/elements/page";
import {
  WUPSelectControl,
  WUPTextControl,
  WUPSpinElement,
  WUPSwitchControl,
  WUPCheckControl,
  WUPRadioControl,
} from "web-ui-pack";
import styles from "./controlsView.scss";

const sideEffect =
  WUPTextControl && WUPSelectControl && WUPSpinElement && WUPSwitchControl && WUPCheckControl && WUPRadioControl;
!sideEffect && console.error("!"); // It's required otherwise import is ignored by webpack

let ir = 10;
const items = [
  { text: "Item N 1", value: ++ir },
  { text: "Item N 2", value: ++ir },
  { text: "Wizard", value: ++ir },
  { text: "Item N 4", value: ++ir },
  { text: "Item N 5", value: ++ir },
  { text: "Don", value: ++ir },
  { text: "Item N 7", value: ++ir },
  { text: "Angel", value: ++ir },
  { text: "Item N 9", value: ++ir },
  { text: "Item N 10", value: ++ir },
  // { text: (v, li, i) => li.append(v.toString()), value: 124 },
];

export default function ControlsView() {
  return (
    <Page header="Controls" link="#textControl">
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { text: "test-me@google.com" };
            el.$isPending = false;
            el.$options.disabled = false;
            el.$options.readOnly = false;
            el.$onSubmit = (e) => {
              console.warn("sumbitted model", e.$model);
              // eslint-disable-next-line no-promise-executor-return
              return new Promise((resolve) => setTimeout(resolve, 1000));
              // todo rollback disabled doesn't work after promise
            };
          }
        }}
      >
        <wup-text name="text" />
        <wup-select
          ref={(el) => {
            if (el) {
              el.$options.label = "Select (combobox/dropdown)";
              el.$options.items = () => new Promise((resolve) => setTimeout(() => resolve(items), 3000));
              el.$options.validations = {
                required: true,
              };
              el.$options.name = "select";
            }
          }}
        />

        <wup-switch name="switch" />
        <wup-check name="checkbox" />
        <wup-radio
          ref={(el) => {
            if (el) {
              el.$options.name = "radioGroup";
              el.$options.items = items;
            }
          }}
        />

        <div className={`${styles.common} ${styles.textControl} ${styles.combobox} ${styles.multiselect}`}>
          <label onMouseDown={(e) => !(e.target instanceof HTMLInputElement) && e.preventDefault()}>
            <span>
              <span aria-hidden>Item 1</span>
              <span aria-hidden>Some long value</span>
              <span aria-hidden>Va 2</span>
              <span aria-hidden>Value 3</span>
              <span aria-hidden>ControlValue</span>
              <span aria-hidden>ControlVal2</span>
              <input
                role="combobox"
                aria-expanded={false}
                aria-haspopup="listbox"
                aria-owns="menuId2"
                aria-controls="menuId2"
                aria-autocomplete="list"
                aria-activedescendant="itemId2"
                placeholder=" "
                defaultValue="Selected 6 of 10"
              />
              {/* todo how to suppress reading 'blank' - we need to leave extra value 'Selected 1 of 3' and made it transparent via input { opacity:0 } */}
              <strong>
                MultiSelectControl
                {/* <span className={styles["wup-hide"]}>Selected 1 of 3</span> */}
              </strong>
            </span>
          </label>
          {/* <ul id="menuId2" role="listbox">
            <li role="option" aria-selected={false} id="itemId2">
              Puns
            </li>
          </ul> */}
        </div>
        <div className={`${styles.common} ${styles.textControl} ${styles.combobox} ${styles.multiselect}`}>
          <label onMouseDown={(e) => !(e.target instanceof HTMLInputElement) && e.preventDefault()}>
            <span>
              <span aria-hidden>Item 1</span>
              <span aria-hidden>Some long value</span>
              <span aria-hidden>Vag 2</span>
              <input
                role="combobox"
                aria-expanded={false}
                aria-haspopup="listbox"
                aria-owns="menuId2"
                aria-controls="menuId2"
                aria-autocomplete="list"
                aria-activedescendant="itemId2"
                placeholder=" "
                defaultValue="Selected 3 of 5"
              />
              {/* todo how to suppress reading 'blank' - we need to leave extra value 'Selected 1 of 3' and made it transparent via input { opacity:0 } */}
              <strong>
                MultiSelectControl
                {/* <span className={styles["wup-hide"]}>Selected 1 of 3</span> */}
              </strong>
            </span>
          </label>
          {/* <ul id="menuId2" role="listbox">
            <li role="option" aria-selected={false} id="itemId2">
              Puns
            </li>
          </ul> */}
        </div>
        <div className={`${styles.common} ${styles.textControl} ${styles.combobox} ${styles.multiselect}`}>
          {/* todo onMouseDown > prevent only when input is already focused */}
          <label onMouseDown={(e) => !(e.target instanceof HTMLInputElement) && e.preventDefault()}>
            <span>
              <input
                role="combobox"
                aria-expanded={false}
                aria-haspopup="listbox"
                aria-owns="menuId2"
                aria-controls="menuId2"
                aria-autocomplete="list"
                aria-activedescendant="itemId2"
                placeholder=" "
              />
              {/* todo how to suppress reading 'blank' - we need to leave extra value 'Selected 1 of 3' and made it transparent via input { opacity:0 } */}
              <strong>
                MultiSelectControl
                {/* <span className={styles["wup-hide"]}>Selected 1 of 3</span> */}
              </strong>
            </span>
          </label>
          {/* <ul id="menuId2" role="listbox">
            <li role="option" aria-selected={false} id="itemId2">
              Puns
            </li>
          </ul> */}
        </div>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
