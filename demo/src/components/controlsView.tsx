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
        <svg
        // aria-hidden="true"
        // style="position: absolute; width: 0; height: 0; overflow: hidden;"
        >
          <clipPath
            id="checkmark"
            clipPathUnits="objectBoundingBox"
            transform="scale(0.021739130434782608, 0.021739130434782608)"
          >
            <path d="M20.687,38.332c-2.072,2.072-5.434,2.072-7.505,0L1.554,26.704c-2.072-2.071-2.072-5.433,0-7.504 c2.071-2.072,5.433-2.072,7.505,0l6.928,6.927c0.523,0.522,1.372,0.522,1.896,0L36.642,7.368c2.071-2.072,5.433-2.072,7.505,0 c0.995,0.995,1.554,2.345,1.554,3.752c0,1.407-0.559,2.757-1.554,3.752L20.687,38.332z" />
            {/* <path d="M4.43,63.63c-2.869-2.755-4.352-6.42-4.427-10.11c-0.074-3.689,1.261-7.412,4.015-10.281 c2.752-2.867,6.417-4.351,10.106-4.425c3.691-0.076,7.412,1.255,10.283,4.012l24.787,23.851L98.543,3.989l1.768,1.349l-1.77-1.355 c0.141-0.183,0.301-0.339,0.479-0.466c2.936-2.543,6.621-3.691,10.223-3.495V0.018l0.176,0.016c3.623,0.24,7.162,1.85,9.775,4.766 c2.658,2.965,3.863,6.731,3.662,10.412h0.004l-0.016,0.176c-0.236,3.558-1.791,7.035-4.609,9.632l-59.224,72.09l0.004,0.004 c-0.111,0.141-0.236,0.262-0.372,0.368c-2.773,2.435-6.275,3.629-9.757,3.569c-3.511-0.061-7.015-1.396-9.741-4.016L4.43,63.63 L4.43,63.63z" /> */}
          </clipPath>
        </svg>

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
