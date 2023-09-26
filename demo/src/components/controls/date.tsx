import Page from "src/elements/page";
import { WUPDateControl } from "web-ui-pack";

const sideEffect = WUPDateControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack
(window as any).myDateValidations = { required: true } as WUP.Calendar.Options["validations"];
(window as any).myDateExcludeDays = [
  new Date("2022-02-28T00:00:00.000Z"),
  new Date("2022-03-16T00:00:00.000Z"),
  new Date("2022-03-18T00:00:00.000Z"),
  new Date("2022-04-01T00:00:00.000Z"),
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
        w-autoFocus
      >
        <wup-date
          w-name="date"
          w-initValue="2022-03-01 23:50"
          w-min="2016-01-02"
          w-max="2034-05-01"
          w-exclude="window.myDateExcludeDays"
          w-startWith="day"
          w-utc
          w-validations="window.myDateValidations"
        />
        <wup-date w-name="empty" />
        <wup-date w-name="another" w-label="Another format: yyyy-m-d" w-format="yyyy-m-d" />
        <wup-date w-name="disabled" disabled />
        <wup-date w-name="readonly" readonly />
        <wup-date //
          w-name="saveUrl"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey
          w-storage="url"
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
