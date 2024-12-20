import React from "react";
import ReactDOM from "react-dom/client";
import * as webUIpack from "web-ui-pack";

const div = document.body.appendChild(document.createElement("div"));
div.id = "app";

const root = ReactDOM.createRoot(div);

window.renderIt = function renderIt(jsonEl) {
  // babel transpiles jsx into legacy react18 object >>> that doesn't work on React19, so need to convert it
  function jsonToReactElement(json, defaultKey) {
    const { type, props = {}, key } = json;
    const { children, ...otherProps } = props; // Extract children from props if available
    const elementKey = key ?? defaultKey; // Ensure a unique key for each child if not present
    // Prepare children for React.createElement (recursively transform if array)
    const transformedChildren = Array.isArray(children)
      ? children.map(
          (child, index) => jsonToReactElement(child, `${elementKey || "keyless"}-${index}`) // Add unique key if missing
        )
      : children;

    // Return React.createElement with type, props, and transformed children
    return React.createElement(type, elementKey ? { ...otherProps, key: elementKey } : otherProps, transformedChildren);
  }

  root.render(jsonToReactElement(jsonEl));

  return new Promise((res) => setTimeout(res, 6)); // 1ms required for react-render v19 + 5ms // timeout required because of debounceFilters
};

window.renderHtml = function renderHtml(str) {
  div.innerHTML = str;
};
window.React = React;
Object.assign(window, webUIpack);
Object.assign(window, webUIpack.WUPHelpers);
