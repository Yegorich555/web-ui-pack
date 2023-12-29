import Page from "src/elements/page";
import { WUPDateControl, WUPTimeControl } from "web-ui-pack";
import { dateCompareWithoutTime } from "web-ui-pack/indexHelpers";
import stylesCom from "./controls.scss";

WUPDateControl.$use();
WUPTimeControl.$use();

(window as any).myDateTimeValidations = { required: true } as WUP.Date.Options["validations"];
(window as any).myDateSyncExclude = [
  new Date("2022-02-28T00:00:00.000Z"), //
  new Date("2022-04-01T00:00:00.000Z"),
];
(window as any).timeExcludeFunc = {
  // eslint-disable-next-line arrow-body-style
  test: (v, c) => {
    // find related date control
    const ctrlDate = c.$form?.$controls.find((ci) => (ci.$options as any).sync === c) as WUPDateControl;
    const syncDate = ctrlDate?.$value; // get current date-value
    if (syncDate) {
      const isUTC = true; // hardcoded for demo; in dev use ctrlDate.$options.utc;
      const isEq = dateCompareWithoutTime(syncDate, new Date("2022-03-01T00:00:00.000Z"), isUTC) === 0;
      if (isEq) {
        return v.hours === 12 && v.minutes === 48; // disable 12:48 only for 2022-03-01
      }
    }
    return false;
  },
} as WUP.Time.ValidityMap["exclude"];

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
            w-exclude="window.myDateSyncExclude"
            w-utc
            w-validations="window.myDateTimeValidations"
          />
          <wup-time id="time" w-name="" w-label="Tied time" w-exclude="window.myTimeExcludeFunc" />
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
  ></wup-date>
  <wup-time
    id="time"
    w-label="Tied time"
    w-exclude="window.timeExcludeFunc"
  ></wup-time>
</div>`,
];
