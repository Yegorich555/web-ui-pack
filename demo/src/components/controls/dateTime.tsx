import Page from "src/elements/page";
import { WUPDateControl } from "web-ui-pack";
import stylesCom from "./controls.scss";

WUPDateControl.$use();

(window as any).myDateTimeValidations = { required: true } as WUP.Date.Options["validations"];
(window as any).myDateTimeExclude = [
  new Date("2022-02-28T00:05:00.000Z"), //
  new Date("2022-04-01T00:13:21.000Z"),
];

export default function DateTimeView() {
  return (
    <Page
      header="Date & Time"
      link="src/controls/date.ts"
      details={{
        tag: "wup-date",
        linkDemo: "demo/src/components/controls/dateTime.tsx",
        cssVarAlt: new Map([["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."]]),
        excludeCssVars: ["--ctrl-clr-cell-day-w", "--ctrl-clr-cell-h", "--ctrl-clr-cell-w", "--ctrl-clr-h"],
        customHTML,
      }}
      features={[
        "Inheritted features from DateControl & TimeControl",
        "Date is master and controls related time control (validations, values, etc.)",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { scheduled: new Date("1990-02-10 14:23") };
            el.$onSubmit = (e) => console.warn("submitted model", e.detail.model);
          }
        }}
        w-autoFocus
      >
        <div className={stylesCom.group}>
          <wup-date
            w-sync="#time"
            w-name="scheduled"
            w-initValue="2022-03-01 23:50"
            w-min="2016-01-02 12:40"
            w-max="2034-05-01 23:55"
            w-exclude="window.myDateTimeExclude"
            w-utc
            w-validations="window.myDateTimeValidations"
          />
          <wup-time id="time" w-name="" w-label="Tied time" />
        </div>
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}

const customHTML = [
  `html
<div class="inline">
  <wup-date
    w-sync="#time"
    ...
    w-name="scheduled"
    w-initValue="2022-03-01 23:50"
    w-min="2016-01-02 12:40"
    w-max="2034-05-01 23:55"
    w-exclude="window.myDateTimeExclude"
    w-validations="window.myDateTimeValidations"
    w-utc
  />
  <wup-time id="time" w-label="Tied time" />
</div>`,
];
