import "./styles/main.scss";
import { Component } from "react";
import ReactDom from "react-dom";
import { Form, TextInput } from "web-ui-pack";
import "web-ui-pack/styles/form.css";

class AppContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <>
        <h1>WebUIPack Examples</h1>
        <Form title="Form1" className="uiform">
          <TextInput label="TextInput" initValue="init_value" name="first" validations={{ required: true }} />
        </Form>
      </>
    );
  }
}

ReactDom.render(<AppContainer />, document.getElementById("app"));
