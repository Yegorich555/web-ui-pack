import Page from "src/elements/page";
import WUPNotifyElement from "web-ui-pack/notifyElement";
import Example1 from "./example1";
import Example2 from "./example2";

WUPNotifyElement.$use();

export default function NotifyView() {
  return (
    <Page //
      header="NotifyElement"
      link="src/notifyElement.ts"
      details={{
        tag: "wup-notify",
        linkDemo: "demo/src/components/notify/notifyView.tsx",
        customHTML: [
          `html
<wup-notify
  w-placement="bottom-left"
  w-autoclose="5000"
  w-pauseonhover="true"
  w-selfremove="true"
  w-closeonclick="true"
  w-pauseonwinblur="true"
>
 Some message here
</wup-notify>

<!--EQUAL TO-->
<wup-notify>Some message here</wup-notify>`,
        ],
      }}
      features={[
        "WARNING: this EXPERIMENTAL element that means hasn't been covered 100% tests yet",
        "Built-in styles & animation",
        "Notifications placed in stack",
        "Easy to use. Add to HTML or just call WUPNotifyElement.$show({textContent: 'Some text'}, ...)",
        "JS Native. Possible to use with any UI framerworks",
        "Low resource consumption: most popular alternatives (like react-toastify) use width, height, top, and left properties along with animations, which negatively impact resource usage since any change or animation step triggers a full layout recalculation. WUPNotify, however, is positioned and animated solely using the style.transform property, which does not re-trigger the browser's layout recalculation.",
      ]}
    >
      <Example1 />
      <Example2 />
    </Page>
  );
}
