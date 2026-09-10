import Example from "src/elements/example";

export default function Example2() {
  return (
    <Example header="Built-in form support" link="demo/src/components/modal/example2.tsx">
      <small>Just place {"<wup-form/>"} with controls inside</small>
      <br />
      <button className="btn" type="button">
        Sign Up
      </button>
      <wup-modal w-target="prev" w-placement="center">
        <h2>Ordinary form</h2>
        <wup-form
          ref={(el) => {
            if (el) {
              el.$onSubmit = ({ detail }) => {
                console.warn("submit detail:", detail);
                // return Promise.reject();
                // eslint-disable-next-line no-promise-executor-return
                return new Promise((res) => setTimeout(() => res(true), 1500));
              };
            }
          }}
        >
          <wup-text w-name="email" w-initValue="yegor.golubchik@mail.com" />
          <wup-pwd w-name="password" w-initValue="123456" />
          <wup-date w-name="dob" w-label="Date of birthday" />
          <footer>
            <button type="button" data-close="modal">
              Close
            </button>
            <button type="submit">Submit</button>
          </footer>
        </wup-form>
      </wup-modal>
    </Example>
  );
}
