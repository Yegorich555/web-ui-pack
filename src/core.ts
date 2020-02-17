/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/prefer-namespace-keyword */
/* eslint-disable react/prefer-stateless-function */
import React from "react";

declare module Core {
  export class Component<P> extends React.Component<P> {}
  export type Element = React.ReactElement;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  export function renderElement(type: any, props?: object | null, ...children: any[]): any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
Core.renderElement = React.createElement;
Core.Component = React.Component;

export default Core;
