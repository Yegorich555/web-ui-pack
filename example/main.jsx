// import "./styles/main.scss";
import React, { Component } from "react";
import ReactDom from "react-dom";
import Form from "../lib/forms/form";

class AppContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <>
        <h1>WebUIPack Examples</h1>
        <Form title="Form1">
          <div>Inputs will be here</div>
        </Form>
      </>
    );
  }
}

ReactDom.render(<AppContainer />, document.getElementById("app"));
