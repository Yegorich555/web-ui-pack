import Page from "src/elements/page";
import styles from "./controlsView.scss";

export default function ControlsView() {
  return (
    <Page header="Controls" link="#textControl">
      <form>
        <wup-text-ctrl
          class={styles.textControl}
          ref={(el) => {
            if (el) {
              el.$options.label = "TextControl";
            }
          }}
        />
        <wup-text-ctrl
          class={`${styles.textControl} ${styles.textControl2}`}
          ref={(el) => {
            if (el) {
              el.$options.label = "TextControl - disabled";
              el.$options.disabled = true; // todo implement disabled
            }
          }}
        />

        <div className={`${styles.slidebox}`}>
          <label onMouseDown={(e) => e.preventDefault()}>
            <input type="checkbox" defaultChecked autoFocus />
            <strong>SlideControl</strong>
            <span />
          </label>
        </div>

        <div className={`${styles.slidebox} ${styles.slideboxReverse}`}>
          <label onMouseDown={(e) => e.preventDefault()}>
            <input type="checkbox" />
            <strong>SlideControl-reverse</strong>
            <span />
          </label>
        </div>

        <div className={`${styles.slidebox} ${styles.checkbox}`}>
          <label onMouseDown={(e) => e.preventDefault()}>
            <input type="checkbox" defaultChecked />
            <strong>CheckControl</strong>
            <span />
          </label>
        </div>

        <div className={`${styles.textControl} ${styles.combobox}`}>
          <label>
            <input
              role="combobox"
              aria-expanded={false}
              aria-haspopup="listbox"
              aria-owns="menuId"
              aria-controls="menuId"
              aria-autocomplete="list"
              aria-activedescendant="itemId"
              placeholder=" "
              aria-invalid="true"
              aria-errormessage="err1"
            />
            <strong>ComboControl</strong>
            {/* <button type="button" tabIndex={-1} aria-hidden="true" /> */}
          </label>
          {/* <ul id="menuId" role="listbox">
            <li role="option" aria-selected={false} id="itemId">
              Puns
            </li>
          </ul> */}
          <div id="err1">This field is required</div>
        </div>

        <div className={`${styles.textControl} ${styles.combobox} ${styles.multiselect}`}>
          <label>
            <span aria-hidden>Item 1</span>
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
            {/* todo how to suppress reading 'blank' */}
            {/* todo remove placeholder when no items selected */}
            <strong>
              MultiSelectControl <span className={styles["wup-hide"]}>Selected 1 of 3</span>
            </strong>
            {/* <button type="button" tabIndex={-1} aria-hidden="true" /> */}
          </label>
          {/* <ul id="menuId2" role="listbox">
            <li role="option" aria-selected={false} id="itemId2">
              Puns
            </li>
          </ul> */}
        </div>

        <div className={`${styles.textControl} ${styles.radio}`}>
          <fieldset>
            <legend>RadioGroup</legend>
            <label>
              <span>Value 1</span>
              <input type="radio" name="w1" />
            </label>
            <label>
              <input type="radio" name="w1" />
              <span>Value 2</span>
            </label>
            <label>
              <input type="radio" name="w1" />
              <span>Value 3</span>
            </label>
          </fieldset>
        </div>
      </form>
    </Page>
  );
}
