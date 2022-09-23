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
      }}
      features={[
        "Smart clear (reset/revert) by Esc key and button-clear (use $defaults.clearActions)",
        "Powerful accessibility support (keyboard, announcenement)",
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
            // label="Calendar control"
            label=""
            // label="With long label and custom validations (very very very incredible long label to check if it has ellipsis rule)"
            initValue="2022-09-20 10:05"
            autoComplete="off"
            autoFocus={false}
            validations="window._someObject"
            class={styles.cln}
            startWith="year"
          />
          {/* <wup-calendar name="calendar2" label="" class={styles.cln} /> */}
        </div>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}

// todo details about icons before/after
// todo details about ariaAttributes to change messages
