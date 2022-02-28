import Page from "src/elements/page";
import Example1 from "./example1";
import Example2 from "./example2";
import Example3 from "./example3";
import Example4 from "./example4";

export default function PopupView() {
  return (
    <Page header="PopupElement" link="#features">
      <Example1 />
      <Example2 />
      <Example3 />
      <Example4 />
    </Page>
  );
}
