/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/prefer-namespace-keyword */
/* eslint-disable react/prefer-stateless-function */
import React from "react";

declare module Core {
  export class Component<Props, State> extends React.PureComponent<Props, State> {}
  export type Element = React.ReactElement; // ReactChild
  export type Node = React.ReactNode;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  export function renderElement(type: any, props?: object | null, ...children: any[]): any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  export type FormEvent = React.FormEvent<HTMLFormElement>;
  export function forEachChildren<C>(children: C | C[], fn: (child: C, index: number) => void): void;
}
Core.forEachChildren = React.Children.forEach;
Core.renderElement = React.createElement;
Core.Component = React.Component;

export default Core;
