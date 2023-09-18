import Page from "src/elements/page";
import { WUPTimeControl, WUPTimeObject } from "web-ui-pack";

const sideEffect = WUPTimeControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack
(window as any).myTimeValidations = { required: true } as WUP.Time.Options["validations"];
(window as any).myTimeExclude = { test: (v: WUPTimeObject) => v.hours === 12 && v.minutes === 48 };

export default function TimeControlView() {
  return (
    <Page
      header="TimeControl"
      link="src/controls/time.ts"
      details={{
        tag: "wup-time",
        linkDemo: "demo/src/components/controls/time.tsx",
        cssVarAlt: new Map([
          ["--ctrl-icon-img", "Used several times for btn-clear, error-list etc."],
          ["--ctrl-time-icon-img-lg", "Use this svg for icon > 16px"],
        ]),
      }}
      features={[
        "Inheritted features from TextControl",
        "Powerful accessibility support (keyboard, announcenement)",
        "Scrollable & well animated pickers (with swipe for touchscreens)",
        "Wide ability to disable particular values (options min/max/exclude)",
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
          w-name="time"
          w-initValue="23:50"
          w-min="02:30"
          w-max="23:50"
          w-exclude="window.myTimeExclude"
          w-validations="window.myTimeValidations"
        />
        <wup-time
          w-label="Without buttons (see $options.menuButtonsOff)"
          w-name="customized"
          w-min="02:30"
          w-max="22:50"
          w-exclude="window.myTimeExclude"
          ref={(el) => {
            if (el) {
              el.$options.menuButtonsOff = true;
            }
          }}
        />
        <wup-time
          w-label="Menu in 3 rows (see demo source code)"
          w-name="customized2"
          w-initValue="23:50"
          w-min="02:30"
          w-max="22:50"
          w-exclude="window.myTimeExclude"
          ref={(el) => {
            if (el) {
              // @ts-expect-error - because protected
              const orig = el.renderMenu;
              // @ts-expect-error - because protected
              el.renderMenu = function renderMenu2(popup, menuId, rows) {
                rows = 3;
                orig.call(el, popup, menuId, rows);
              };
            }
          }}
        />
        <wup-time w-name="another" w-label="Another format: h-m (options format)" w-format="h-m" />
        <wup-time w-name="disabled" disabled />
        <wup-time w-name="readonly" readonly />
        <wup-time //
          w-name="saveUrlTime"
          w-label="With saving to URL (see $options.storageKey & storage)"
          w-storageKey
          w-storage="url"
        />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
