import Page from "src/elements/page";
import { WUPDateControl } from "web-ui-pack";

const sideEffect = WUPDateControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack
(window as any).myDateValidations = { required: true } as WUP.Calendar.Options["validations"];
(window as any).myDateExcludeDays = [
  new Date("2022-02-28"),
  new Date("2022-03-16"),
  new Date("2022-03-18"),
  new Date("2022-04-01"),
];

export default function DateControlView() {
  return (
    <Page
      header="DateControl"
      link="src/controls/date.ts"
      details={{
        tag: "wup-date",
        linkDemo: "demo/src/components/controls/date.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
        excludeCssVars: ["--ctrl-clr-cell-day-w", "--ctrl-clr-cell-h", "--ctrl-clr-cell-w", "--ctrl-clr-h"],
      }}
      features={[
        "Inheritted features from TextControl & CalendarControl",
        "Powerful accessibility support (keyboard, announcenement)",
        "Scrollable & well animated pickers (with swipe for touchscreens)",
        "Wide ability to disable particular dates (options min/max/exclude)",
        "No dependancy for working with dates (usage momentjs doesn't make sense)",
        "Saves hours. So $value='2022-11-06 23:50' & click on '20 Dec' => '2022-12-20 23:50'",
        "Display format depends on user-locale (see web-ui-pack/objects/localeInfo). Use $options.format or localeInfo (globally)",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { readonly: new Date("1990-02-10") };
            el.$onSubmit = (e) => console.warn("submitted model", e.$model);
          }
        }}
      >
        <wup-date
          name="date"
          initValue="2022-03-01 23:50"
          min="2016-01-02"
          max="2034-05-01"
          exclude="window.myDateExcludeDays"
          startWith="day"
          utc
          validations="window.myDateValidations"
        />
        <wup-date name="empty" />
        <wup-date name="another" label="Another format: yyyy-m-d" format="yyyy-m-d" />
        <wup-date name="disabled" disabled />
        <wup-date name="readonly" readOnly />
        <wup-date //
          name="saveUrl"
          label="With saving to URL (see $options.storageKey & storage)"
          storageKey
          storage="url"
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
