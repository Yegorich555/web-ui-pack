// import React from "react";
// import { render, unmountComponentAtNode } from "react-dom";
// import { act } from "react-dom/test-utils";
function sum(a, b) {
  return a + b;
}
test("adds 1 + 2 to equal 3", () => {
  expect(sum(1, 2)).toBe(3);
});
