import Page from "src/elements/page";
import styles from "./controlsView.scss";

export default function ControlsView() {
  return (
    <Page header="Controls" link="#textControl">
      <form autoComplete="off">
        <wup-text-ctrl
          // disabled
          class={`${styles.common} ${styles.textControl}`}
          ref={(el) => {
            if (el) {
              el.$options.label =
                "TextControl TextControl TextControlTextControl TextControl TextControl TextControl TextControl";
              // el.$refs.input.required = true;
              el.$options.validations = {
                required: true,
                // max: 10,
                min: (v, ctrl) => v.length < 2 && "This is custom error",
              };
              // el.$showError("Very huge big message Very huge big message Very huge big message Very huge big message");
            }
          }}
        />
        <wup-text-ctrl
          class={`${styles.common} ${styles.textControl}`}
          ref={(el) => {
            if (el) {
              el.$options.label = "TextControl - disabled";
              el.$options.readOnly = true;
            }
          }}
        />
        <wup-text-ctrl
          class={`${styles.common} ${styles.textControl}`}
          ref={(el) => {
            if (el) {
              el.$options.label = "TextControl - disabled";
              el.$options.disabled = true;
              el.$value = "some value";
            }
          }}
        />

        <div className={`${styles.common} ${styles.textControl}`} invalid="true">
          <label onMouseDown={(e) => !(e.target instanceof HTMLInputElement) && e.preventDefault()}>
            <span>
              <input
                type="text"
                placeholder=" "
                // defaultValue="very long long very long long long long long value dsdsadasdsdas"
                ref={(el) => {
                  if (el) {
                    el.setCustomValidity("Invalid value");
                    el.required = true;
                  }
                }}
              />
              <strong>TextControl</strong>
            </span>
            {/* extra-span requires to properly use with after before */}
          </label>
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

        <wup-select
          class={`${styles.common} ${styles.textControl} ${styles.combobox}`}
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
                { text: "Item N 6", value: ++ir },
                { text: "Item N 7", value: ++ir },
                { text: "Item N 8", value: ++ir },
                { text: "Item N 9", value: ++ir },
                { text: "Item N 10", value: ++ir },
                // { text: (v, li, i) => li.append(v.toString()), value: 124 },
              ];
              el.$options.validations = {
                required: true,
              };
            }
          }}
        />

        <div className={`${styles.common} ${styles.textControl} ${styles.combobox}`} opened="true">
          <label onMouseDown={(e) => !(e.target instanceof HTMLInputElement) && e.preventDefault()}>
            <span>
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
            </span>
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
      </form>
    </Page>
  );
}