import Page from "src/elements/page";
import { WUPCalendarControl } from "web-ui-pack";
import styles from "./calendar.scss";

const sideEffect = WUPCalendarControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack
(window as any).globalkey = {
  pointHere: { required: true } as WUPCalendar.Options["validations"],
};

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
        "Scrollable & well animated pickers (with mobile-swipe support)",
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
            min="2022-02-27"
            max="2022-04-01"
            autoComplete="off" // todo remove support for autoComplete
            autoFocus={false}
            validations="window._someObject"
            class={styles.cln}
            // startWith="year"
          />
          {/* <wup-calendar name="calendar2" label="" class={styles.cln} /> */}
        </div>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
