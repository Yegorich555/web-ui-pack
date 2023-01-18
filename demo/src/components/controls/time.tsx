import Page from "src/elements/page";
import { WUPTimeControl, WUPTimeObject } from "web-ui-pack";

const sideEffect = WUPTimeControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack
(window as any).myTimeValidations = {
  required: true,
  min: new WUPTimeObject(2, 30),
  max: new WUPTimeObject(22, 50),
} as WUP.Time.Options["validations"];

export default function TimeControlView() {
  return (
    <Page
      header="TimeControl"
      link="src/controls/time.ts"
      details={{
        tag: "wup-time",
        cssVarAlt: new Map([
          ["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."],
          ["--ctrl-time-icon-img-lg", "Use this svg for icon > 16px"],
        ]),
      }}
      features={[
        "Inheritted features from TextControl",
        "Powerful accessibility support (keyboard, announcenement)",
        "Display format depends on user-locale (see web-ui-pack/objects/localeInfo). Use $options.format or localeInfo (globally)",
      ]}
    >
      <wup-form
        ref={(el) => {
          if (el) {
            el.$initModel = { readonly: new WUPTimeObject("08:30") };
            el.$onSubmit = (e) => console.warn("submitted model", e.$model);
          }
        }}
      >
        <wup-time
          name="time"
          initValue="23:50"
          step={1}
          validations="window.myTimeValidations"
          autoFocus={false}
          autoComplete="off"
          // ref={(el) => {
          //   if (el) {
          //     el.$options.autoFocus = true;
          //     setTimeout(() => {
          //       el.$showMenu();
          //     }, 100);
          //   }
          // }}
        />
        <wup-time name="empty" />
        <wup-time name="another" label="Another format: h-m" format="h-m" />
        <wup-time name="disabled" disabled />
        <wup-time name="readonly" readOnly />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
