/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/prefer-namespace-keyword */
/* eslint-disable react/prefer-stateless-function */
import React from "react";

// this is just ts-types
// @ts-ignore
declare module Core {
  export class Component<Props, State> extends React.PureComponent<Props, State> {}
  export type Element = React.ReactElement; // ReactChild
  export type Node = React.ReactNode;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  export function renderElement(type: any, props?: object | null, ...children: any[]): {};
  /* eslint-enable @typescript-eslint/no-explicit-any */
  export type FormEvent = React.FormEvent<HTMLFormElement>;
}

// this is just js-functionality
// @ts-ignore
// eslint-disable-next-line no-redeclare
const Core = {};
Core.renderElement = React.createElement;
Core.Component = React.Component;

export default Core;
