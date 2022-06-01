import Page from "src/elements/page";
import { WUPSelectControl, WUPTextControl } from "web-ui-pack";
import styles from "./controlsView.scss";

const sideEffect = WUPTextControl && WUPSelectControl;
!sideEffect && console.error("Missed"); // It's required otherwise import is ignored by webpack

export default function ControlsView() {
  return (
    <Page header="Controls" link="#textControl">
      <form autoComplete="off">
        <wup-form
          class={styles.test}
          ref={(el) => {
            if (el) {
              el.$initModel = { in1: "val1", in2: "val2" };
            }
          }}
        >
          <button type="submit">Submit</button>

          <wup-text
            ref={(el) => {
              if (el) {
                // todo if label is empty we must prettify it ???
                // todo initValue can't override initmodel upper
                el.$options.name = "email";
                // el.$options.autoComplete = true;
              }
            }}
          />
          <wup-text
            ref={(el) => {
              if (el) {
                el.$options.name = "password";
                // el.$options.autoComplete = false;
              }
            }}
          />
          <wup-text
            ref={(el) => {
              if (el) {
                el.$options.label =
                  "TextControl TextControl TextControlTextControl TextControl TextControl TextControl TextControl";
                el.$options.validations = {
                  required: true,
                  max: 10,
                  min: (v) => v.length < 2 && "This is custom error",
                };
              }
            }}
          />
          <wup-text
            ref={(el) => {
              if (el) {
                el.$options.label = "TextControl - readonly";
                el.$options.readOnly = true;
                el.$initValue = "init value here";
                el.$options.hasButtonClear = false;
                el.$options.name = "in2";
              }
            }}
          />
          <wup-text
            ref={(el) => {
              if (el) {
                el.$options.label = "TextControl - disabled";
                el.$options.disabled = true;
                el.$value = "some value";
              }
            }}
          />

          <wup-select
            ref={(el) => {
              if (el) {
                let ir = 10;
                el.$options.label = "Select Control / Combobox";
                el.$options.items = [
                  { text: "Item N 1", value: ++ir },
                  { text: "Item N 2", value: ++ir },
                  { text: "Item N 3", value: ++ir },
                  { text: "Item N 4", value: ++ir },
                  { text: "Item N 5", value: ++ir },
                  { text: "Donny 1", value: ++ir },
                  { text: "Item N 7", value: ++ir },
                  { text: "Donny 2", value: ++ir },
                  { text: "Item N 9", value: ++ir },
                  { text: "Item N 10", value: ++ir },
                  // { text: (v, li, i) => li.append(v.toString()), value: 124 },
                ];
                el.$options.validations = {
                  required: true,
                };

                // el.$value = ir - 1;
                // el.$options.readOnlyInput = true;
                // el.$options.readOnly = true;
                // el.$options.disabled = true;
                el.$options.selectOnFocus = true;
                el.$initValue = ir - 5;
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

          <div className={`${styles.common} ${styles.slidebox}`}>
            <label onMouseDown={(e) => e.preventDefault()}>
              <input type="checkbox" defaultChecked autoFocus />
              <strong>SlideControl</strong>
              <span />
            </label>
          </div>

          <div className={`${styles.common} ${styles.slidebox}`} disabled>
            <label onMouseDown={(e) => e.preventDefault()}>
              <input type="checkbox" defaultChecked disabled />
              <strong>SlideControl - disabled</strong>
              <span />
            </label>
          </div>

          <div className={`${styles.common} ${styles.slidebox} ${styles.slideboxReverse}`}>
            <label onMouseDown={(e) => e.preventDefault()}>
              <input type="checkbox" />
              <strong>SlideControl-reverse</strong>
              <span />
            </label>
          </div>

          <div className={`${styles.common} ${styles.slidebox} ${styles.checkbox}`}>
            <label onMouseDown={(e) => e.preventDefault()}>
              <input type="checkbox" defaultChecked />
              <strong>CheckControl</strong>
              <span />
            </label>
          </div>

          <div className={`${styles.common} ${styles.slidebox} ${styles.checkbox}  ${styles.checkboxReverse}`}>
            <label onMouseDown={(e) => e.preventDefault()}>
              <input type="checkbox" defaultChecked />
              <strong>CheckControl - reverse</strong>
              <span />
            </label>
          </div>

          <div className={`${styles.common} ${styles.slidebox} ${styles.checkbox}`} disabled>
            <label onMouseDown={(e) => e.preventDefault()}>
              <input type="checkbox" defaultChecked disabled />
              <strong>CheckControl - disabled</strong>
              <span />
            </label>
          </div>

          <div className={`${styles.common} ${styles.radioGroup}`} onMouseDown={(e) => e.preventDefault()}>
            <fieldset>
              <legend>RadioGroup</legend>
              <label>
                <input type="radio" name="w1" />
                <span>Value 1</span>
              </label>
              <label>
                <input type="radio" name="w1" />
                <span>Value 2</span>
              </label>
              <label>
                <input type="radio" name="w1" />
                <span>Value 3</span>
              </label>
              <label>
                <input type="radio" name="w1" />
                <span>g4</span>
              </label>
              <label>
                <input type="radio" name="w1" />
                <span>Value 5</span>
              </label>
              <label>
                <input type="radio" name="w1" />
                <span>Value 6</span>
              </label>
              <label>
                <input type="radio" name="w1" />
                <span>Va 7</span>
              </label>
            </fieldset>
          </div>

          <div className={`${styles.common} ${styles.radioGroup}`} onMouseDown={(e) => e.preventDefault()}>
            <fieldset aria-required>
              <legend>RadioGroup</legend>
              <label>
                <input type="radio" name="w2" />
                <span>Value 1</span>
              </label>
              <label>
                <input type="radio" name="w2" />
                <span>Value 2</span>
              </label>
            </fieldset>
          </div>
          <button type="submit">Submit</button>
        </wup-form>
      </form>
    </Page>
  );
}
