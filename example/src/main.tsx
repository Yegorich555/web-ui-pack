/* eslint-disable jsx-a11y/label-has-associated-control */
import "./styles/main.scss";
import React, { Component } from "react";
import ReactDom from "react-dom";
import focusFirst from "web-ui-pack/helpers/focusFirst";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props {}

class AppContainer extends Component<Props> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  render() {
    return <h1 ref={(el) => el && focusFirst(el)}>WebUIPack Examples</h1>;
  }
}

ReactDom.render(<AppContainer />, document.getElementById("app"));
