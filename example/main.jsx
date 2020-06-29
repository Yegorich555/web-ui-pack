/* eslint-disable jsx-a11y/label-has-associated-control */
import "./styles/main.scss";
import { Component } from "react";
import ReactDom from "react-dom";
import { Form, TextControl, ComboboxControl } from "web-ui-pack";
import "web-ui-pack/styles/form.css";
// import "web-ui-pack/styles/baseControl.css";
import "../src/styles/baseControl.scss";

ComboboxControl.textNoItems = "";
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
            label="TextInput 3"
            name="second"
            validations={{ required: false }}
          />
          <ComboboxControl //
            className="uiBaseControl"
            label="Combo"
            name="comb"
            initValue={3}
            options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(v => ({ text: `Value ${v}`, value: v }))}
          />
        </Form>
      </>
    );
  }
}

ReactDom.render(<AppContainer />, document.getElementById("app"));
