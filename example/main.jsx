/* eslint-disable jsx-a11y/label-has-associated-control */
import "./styles/main.scss";
import { Component } from "react";
import ReactDom from "react-dom";

class AppContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return <h1>WebUIPack Examples</h1>;
  }
}

ReactDom.render(<AppContainer />, document.getElementById("app"));
