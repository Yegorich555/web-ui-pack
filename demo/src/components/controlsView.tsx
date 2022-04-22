import Page from "src/elements/page";
import styles from "./controlsView.scss";

export default function ControlsView() {
  return (
    <Page header="Controls" link="#textControl">
      <form>
        <wup-text-ctrl
          class={`${styles.common} ${styles.textControl}`}
          invalid
          ref={(el) => {
            if (el) {
              el.$options.label =
                "TextControl TextControl TextControlTextControl TextControl TextControl TextControl TextControl";
              el.$refs.input.setCustomValidity("Invalid value");
              el.$refs.input.required = true;
            }
          }}
        />
        <wup-text-ctrl
          class={`${styles.common} ${styles.textControl}`}
          disabled
          ref={(el) => {
            if (el) {
              el.$options.label = "TextControl - disabled";
              el.$options.disabled = true; // todo implement disabled
            }
          }}
        />
        <wup-text-ctrl
          class={`${styles.common} ${styles.textControl}`}
          disabled
          ref={(el) => {
            if (el) {
              el.$options.label = "TextControl - disabled";
              el.$options.disabled = true; // todo implement disabled
              el.$value = "some value";
            }
          }}
        />

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

        <div className={`${styles.common} ${styles.textControl} ${styles.combobox}`} opened="true">
          <label onMouseDown={(e) => !(e.target instanceof HTMLInputElement) && e.preventDefault()}>
            <input
              role="combobox"
              aria-expanded={false}
              aria-haspopup="listbox"
              aria-owns="menuId"
              aria-controls="menuId"
              aria-autocomplete="list"
              aria-activedescendant="itemId"
              placeholder=" "
              // aria-invalid="true"
              aria-errormessage="err1"
            />
            <strong>
              ComboControl ComboControl ComboControl ComboControl ComboControl ComboControl ComboControl ComboControl
              ComboControl
            </strong>
          </label>
          {/* <ul id="menuId" role="listbox">
            <li role="option" aria-selected={false} id="itemId">
              Puns
            </li>
          </ul> */}
          {/* <div id="err1">This field is required</div> */}
        </div>

        <div className={`${styles.common} ${styles.textControl} ${styles.combobox} ${styles.multiselect}`}>
          <label onMouseDown={(e) => !(e.target instanceof HTMLInputElement) && e.preventDefault()}>
            <span aria-hidden>Item 1</span>
            <span aria-hidden>Some long value</span>
            <span aria-hidden>Va 2</span>
            <span aria-hidden>Value 3</span>
            <span aria-hidden>ControlValue</span>
            <span aria-hidden>ControlValue2</span>
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
          </label>
          {/* <ul id="menuId2" role="listbox">
            <li role="option" aria-selected={false} id="itemId2">
              Puns
            </li>
          </ul> */}
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
              <span>V4</span>
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
      </form>
    </Page>
  );
}
