import Page from "src/elements/page";
import { WUPCalendarControl } from "web-ui-pack";

const sideEffect = WUPCalendarControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack
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
        "Powerful accessibility support (keyboard, announcenement)",
        "Scrollable & well animated pickers (with swipe for touchscreens)",
        "Wide ability to disable particular dates (options min/max/exclude)",
        "No dependancy for working with dates (usage momentjs doesn't make sense)",
        "Static parser > WUPCalendarControl.$parse('2022-10-25', false) returns Date",
        "Saves hours. So $value='2022-11-06 23:50' & click on '20 Dec' => '2022-12-20 23:50'",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { readonly: new Date("1990-02-10") };
            el.$onSubmit = (e) => console.warn("submitted model", e.$model);
          }
        }}
        w-autoFocus
      >
        <wup-calendar
          w-name="calendar"
          w-initValue="2022-03-01 23:50"
          w-min="2016-01-02"
          w-max="2034-05-01"
          w-exclude="window.myCalendarExcludeDays"
          w-startWith="day"
          w-utc
          w-validations="window.myCalendarValidations"
        />
        <wup-calendar w-name="disabled" w-label="Disabled" disabled w-utc w-startWith="1990-01-01" />
        <wup-calendar w-name="readonly" w-label="Readonly" readonly w-utc />
        <wup-calendar //
          w-name="saveUrlClnd"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey
          w-storage="url"
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
