export default function Login() {
  return (
    <wup-form>
      <h2>Login</h2>
      <wup-text
        w-name="loginName"
        w-label="Email"
        ref={(el) => {
          if (el) {
            el.$options.validations = { email: true };
          }
        }}
      />
      <wup-pwd
        w-name="password"
        ref={(el) => {
          if (el) {
            //
          }
        }}
      />
      <button type="submit">Submit</button>
    </wup-form>
  );
}
