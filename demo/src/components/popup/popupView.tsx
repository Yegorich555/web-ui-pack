/* eslint-disable jsx-a11y/label-has-associated-control */
import InputRadio from "src/elements/inputRadio";
import Page from "src/elements/page";
import { WUPPopup } from "web-ui-pack/popupElement.types";
import Example1 from "./example1";
import Example2 from "./example2";
import Example3 from "./example3";
import Example4 from "./example4";

const opts: Partial<WUPPopup.Options> = {
  arrowEnable: true,
};

export default function PopupView() {
  function setOpts(o: Partial<WUPPopup.Options>) {
    Object.assign(opts, o);
    document.querySelectorAll("wup-popup").forEach((t) => {
      Object.assign(t.$options, opts);
      t.$show(); // required because some options are not watched
    });
  }

  setTimeout(() => {
    setOpts(opts);
  });

  return (
    <Page header="PopupElement" link="#features">
      <h3>Options</h3>
      {/* todo replace with wup-ctrl-radio after implementation */}
      <InputRadio
        items={[
          { value: true, label: "Show Arrow" },
          { value: false, label: "Hide Arrow" },
        ]}
        defaultValue={opts.arrowEnable}
        onChange={(v) => setOpts({ arrowEnable: v })}
      />
      <br />
      <Example1 />
      <Example2 />
      <br />
      {/* <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br />
      <br /> */}
      <Example3 />
      <Example4 />
    </Page>
  );
}
