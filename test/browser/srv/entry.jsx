import React from "react";
import ReactDom from "react-dom";

const div = document.body.appendChild(document.createElement("div"));
div.id = "app";
window.renderIt = function renderIt(el) {
  ReactDom.render(el, div);
};

window.React = React;
