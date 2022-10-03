import Page from "src/elements/page";
import { WUPCalendarControl } from "web-ui-pack";
import styles from "./calendar.scss";

const sideEffect = WUPCalendarControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack
(window as any).myCalendarValidations = { required: true } as WUPCalendar.Options["validations"];
(window as any).myCalendarExclude = [
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
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
        excludeCssVars: ["--ctrl-clr-cell-day-w", "--ctrl-clr-cell-h", "--ctrl-clr-cell-w", "--ctrl-clr-h"],
      }}
      features={[
        "Inheritted features from TextControl",
        "Powerful accessibility support (keyboard, announcenement)",
        "Scrollable & well animated pickers (with swipe for touchscreens)",
        "Wide ability to disable particular dates (options min/max/exclude)",
        "No dependancy for working with dates (usage momentjs doesn't make sense)",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { readonly: new Date("1990-02-10") };
            el.$onSubmit = (e) => console.warn("sumbitted model", e.$model);
          }
        }}
      >
        <div className={styles.flex}>
          <wup-calendar
            name="calendar"
            initValue="2022-03-06 10:05"
            min="2022-02-28"
            max="2022-04-01"
            exclude="window.myCalendarExclude"
            // startWith="month"
            validations="window.myCalendarValidations"
            autoFocus={false}
            autoComplete="off"
            class={styles.cln}
          />
        </div>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
