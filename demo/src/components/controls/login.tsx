export default function Login() {
  return (
    <wup-form
      ref={(el) => {
        if (el) {
          el.$initModel = { email: "some@email.com", password: "some pwd" };
          el.$onSubmit = (e) => {
            console.warn("submit details:", e.detail);
            return new Promise((res) =>
              setTimeout(() => {
                res(true);
              }, 1000)
            );
          };
          // el.$onSubmitEnd = (e) => console.warn("submit end", e.detail);
          el.addEventListener("$submitEnd", (e) => console.warn("submit end", e.detail));
          // el.$isPending = true;
        }
      }}
    >
      <h2>Login</h2>
      <wup-text
        w-name="email"
        w-label="Email"
        ref={(el) => {
          if (el) {
            el.$options.validations = { email: true, required: true };
          }
        }}
      />
      <wup-pwd
        w-name="password"
        ref={(el) => {
          if (el) {
            el.$options.validations = { required: true };
          }
        }}
      />
      <button type="submit">Submit</button>
    </wup-form>
  );
}
