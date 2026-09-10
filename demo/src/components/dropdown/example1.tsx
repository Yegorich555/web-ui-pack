import Example from "src/elements/example";

export default function Example1() {
  return (
    <Example header="Default (animation: drawer)" link="demo/src/components/dropdown/example1.tsx">
      <wup-dropdown>
        <button type="button">Click me</button>
        <wup-popup>
          <ul>
            <li>Home</li>
            <li>Products</li>
            <li>Profile</li>
            <li>Very</li>
            <li>or</li>
            <li>not</li>
            <li>very</li>
            <li>long</li>
            <li>list</li>
          </ul>
        </wup-popup>
      </wup-dropdown>
    </Example>
  );
}
