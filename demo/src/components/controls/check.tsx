import Page from "src/elements/page";
import { WUPCheckControl } from "web-ui-pack";

const sideEffect = WUPCheckControl;
!sideEffect && console.error("!"); // required otherwise import is ignored by webpack

export default function CheckControlView() {
  return (
    <Page header="Check Control" link="#checkcontrol">
      <wup-form
        ref={(el) => {
          if (el) {
            el.$onSubmit = (e) => console.warn("sumbitted model", e.$model);
          }
        }}
      >
        <wup-check label="Check" />
        <wup-check
          ref={(el) => {
            if (el) {
              el.$options.name = "required";
              el.$options.validations = { required: true };
            }
          }}
        />
        <wup-check label="Very very very incredible long label to check if it has ellipsis rule and it works as expected" />
        <wup-check name="reversed" reverse="" />
        <wup-check
          name="reversed2"
          reverse=""
          label="Very very very incredible long label to check if it has ellipsis rule and it works as expected"
        />
        {/* otherwise in React inline [defaultChecked] doesn't work */}
        <wup-check name="checked" ref={(el) => el?.setAttribute("defaultChecked", "")} />
        <wup-check name="disabled" disabled initValue />
        <wup-check name="readonly" readOnly initValue />
        <button type="submit">Submit</button>
      </wup-form>
    </Page>
  );
}
