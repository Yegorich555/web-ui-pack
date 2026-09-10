import Example from "src/elements/example";
import MyLink from "src/elements/myLink";
import CircleComplex from "./circleComplex";

export default function Example4() {
  return (
    <Example header="Complex view with labels" link="demo/src/components/circle/example4.tsx">
      <small>
        See details in <MyLink href="/demo/src/components/circle/circleComplex.scss">demo/src...</MyLink>
      </small>
      <CircleComplex />
      <CircleComplex isSmall />
    </Example>
  );
}
