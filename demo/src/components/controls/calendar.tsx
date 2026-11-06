import Page from "src/elements/page";
import { WUPCalendarControl } from "web-ui-pack";
import stylesCom from "./controls.scss";
import styles from "./calendar.scss";

WUPCalendarControl.$use();

(window as any).myCalendarValidations = { required: true } as WUP.Calendar.Options["validations"];
(window as any).myCalendarExcludeDays = [
  new Date("2022-02-28"),
  new Date("2022-03-16"),
  new Date("2022-03-18"),
  new Date("2022-04-01"),
];

export default function CalendarControlView() {
  return (
    <Page
      header="CalendarControl"
      link="src/controls/calendar.ts"
      details={{
        tag: "wup-calendar",
        linkDemo: "demo/src/components/controls/calendar.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
        excludeCssVars: ["--ctrl-clr-cell-day-w", "--ctrl-clr-cell-h", "--ctrl-clr-cell-w", "--ctrl-clr-h"],
      }}
      features={[
        "Inheritted features from TextControl",
        "Powerful accessibility support (keyboard, announcement)",
        "Scrollable & well animated pickers (with swipe for touchscreens)",
        "Wide ability to disable particular dates (options min/max/exclude)",
        "No dependency for working with dates (usage momentJS doesn't make sense)",
        "Static parser > WUPCalendarControl.$parse('2022-10-25', false) returns Date",
        "Saves hours. So $value='2022-11-06 23:50' & click on '20 Dec' => '2022-12-20 23:50'",
        "Select only month or year (see $options.endWith)",
        "Select several dates or range of dates (see $options.multiple)",
      ]}
    >
      <wup-form
        class={styles.form}
        ref={(el) => {
          if (el) {
            el.$initModel = { readonly: new Date("1990-02-10") };
            el.$onSubmit = (e) => console.warn("submitted model", e.detail.model);
          }
        }}
        w-autoFocus
      >
        <div className={`${stylesCom.group} ${styles.row}`}>
          <wup-calendar
            w-name="calendar"
            w-initValue="2022-03-01 23:50"
            w-min="2016-01-02"
            w-max="2034-05-01"
            w-exclude="window.myCalendarExcludeDays"
            w-startWith="day"
            w-utc
            w-validations="window.myCalendarValidations"
            w-multiple="false"
          />
          <wup-calendar w-name="month" w-label="Select only month" w-endWith="month" w-utc />
        </div>
        <section>
          <h3>Multiple selection</h3>
          <small>
            See $options.multiple: <b>true</b> - several dates, <b>&quot;range&quot;</b> - range of dates [from, to]
          </small>
          <div className={`${stylesCom.group} ${styles.row}`}>
            <wup-calendar
              w-name="multiple"
              w-label="Several dates"
              w-multiple="true"
              w-initValue="2022-03-01, 2022-03-05"
              w-utc
            />
            <wup-calendar
              w-name="range"
              w-label="Range of dates"
              w-multiple="range"
              w-initValue="2022-03-14, 2022-03-20"
              w-exclude="window.myCalendarExcludeDays"
              w-utc
            />
          </div>
        </section>
        <div className={`${stylesCom.group} ${styles.row}`}>
          <wup-calendar w-name="readonly" w-label="Readonly" readonly w-utc />
          <wup-calendar w-name="disabled" w-label="Disabled" disabled w-utc w-startWith="1990-01-01" />
        </div>
        <section>
          <h3>Saving to URL</h3>
          <small>See $options.storageKey & storage: value is saved to URL & restored on page reload</small>
          <div className={`${stylesCom.group} ${styles.row}`}>
            <wup-calendar //
              w-name="saveUrlClnd"
              w-label="Saved to URL"
              w-storageKey="true"
              w-storage="url"
            />
          </div>
        </section>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
