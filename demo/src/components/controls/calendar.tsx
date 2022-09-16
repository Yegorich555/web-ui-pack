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
        <wup-calendar
          name="calendar"
          label="Calendar control"
          initValue="1970-10-15"
          autoComplete="off"
          autoFocus={false}
          validations="window._someObject"
          class={styles.cln}
        />
        {/* <wup-calendar name="required" validations="globalkey.pointHere" />
        <wup-calendar
          ref={(el) => {
            if (el) {
              el.$options.name = "longName";
              el.$options.label =
                "With long label and custom validations (very very very incredible long label to check if it has ellipsis rule)";
              el.$options.validations = {
                required: true,
              };
            }
          }}
        />
        <wup-calendar name="readonly" initValue="1990-02-10" readOnly />
        <wup-calendar name="disabled" disabled /> */}
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}

// todo details about icons before/after
// todo details about ariaAttributes to change messages
