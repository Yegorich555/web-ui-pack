import Page from "src/elements/page";
import { WUPDateControl } from "web-ui-pack";
// import stylesCom from "./controls.scss";

WUPDateControl.$use();

(window as any).myDateTimeValidations = { required: true } as WUP.Date.Options["validations"];
(window as any).myDateTimeExclude = [
  new Date("2022-02-28T00:05:00.000Z"), //
  new Date("2022-04-01T00:13:21.000Z"),
];

export default function DateTimeView() {
  return (
    <Page
      header="DateTimeControl"
      link="src/controls/date.ts" // todo update it
      details={{
        tag: "wup-date", // todo update it
        linkDemo: "demo/src/components/controls/dateTime.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
        excludeCssVars: ["--ctrl-clr-cell-day-w", "--ctrl-clr-cell-h", "--ctrl-clr-cell-w", "--ctrl-clr-h"],
      }}
      features={[
        "Inheritted features from DateControl & TimeControl",
        "Powerful accessibility support (keyboard, announcement)",
        "Scrollable & well animated pickers (with swipe for touchscreens)",
        "Wide ability to disable particular dates (options min/max/exclude)",
        "No dependency for working with dates (usage momentJS doesn't make sense)",
        "Display format depends on user-locale (see web-ui-pack/objects/localeInfo). Use $options.format or localeInfo (globally)",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { readonly: new Date("1990-02-10 14:23") };
            el.$onSubmit = (e) => console.warn("submitted model", e.detail.model);
          }
        }}
        w-autoFocus
      >
        {/*  todo update to dateTime */}
        <wup-date
          w-name="dateTime"
          w-initValue="2022-03-01 23:50"
          w-min="2016-01-02 12:40"
          w-max="2034-05-01 23:55"
          w-exclude="window.myDateTimeExclude"
          w-startWith="day"
          w-utc
          w-validations="window.myDateTimeValidations"
        />
        {/* <div className={stylesCom.group}>
          <wup-date w-name="readonly" readonly w-initValue="2022-03-01 23:50" />
          <wup-date w-name="disabled" disabled w-initValue="2022-03-01" />
          <wup-date w-name="required" w-validations="window.myDateValidations" />
        </div>
        <wup-date w-name="another" w-label="Another format: yyyy-m-d" w-format="yyyy-m-d" />
        <wup-date //
          w-name="saveUrl"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey
          w-storage="url"
        /> */}
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
