import "./styles/main.scss";
import { Component } from "react";
import ReactDom from "react-dom";
import { Form, TextControl } from "web-ui-pack";
import "web-ui-pack/styles/form.css";
import "web-ui-pack/styles/baseControl.css";

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
          <TextControl //
            className="uiBaseControl"
            label="TextInput"
            initValue="init_value"
            name="first"
            validations={{ required: true }}
            disabled
          />
          <TextControl //
            className="uiBaseControl"
            label="TextInput 2"
            name="second"
            validations={{ required: true }}
          />
          <TextControl //
            className="uiBaseControl"
            label="TextInput 2"
            name="second"
            validations={{ required: true }}
          />
        </Form>
      </>
    );
  }
}

ReactDom.render(<AppContainer />, document.getElementById("app"));
