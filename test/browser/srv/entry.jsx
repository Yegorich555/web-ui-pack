import React from "react";
import ReactDom from "react-dom";
import * as webUIpack from "web-ui-pack";

const div = document.body.appendChild(document.createElement("div"));
div.id = "app";

window.renderIt = function renderIt(el) {
  ReactDom.render(el, div);
};
window.React = React;
Object.assign(window, webUIpack);
Object.assign(window, webUIpack.WUPHelpers);
