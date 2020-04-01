import React from "react";
import ReactDom from "react-dom";
import * as webUIpack from "web-ui-pack";
import detectFocusLeft from "web-ui-pack/helpers/detectFocusLeft";

const div = document.body.appendChild(document.createElement("div"));
div.id = "app";

window.renderIt = function renderIt(el) {
  ReactDom.render(el, div);
};
window.React = React;
Object.assign(window, webUIpack);
window.detectFocusLeft = detectFocusLeft;
