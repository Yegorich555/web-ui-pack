/* eslint-disable @typescript-eslint/no-namespace */
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
  export type DomFocusEvent = React.FocusEvent<HTMLInputElement>;
  export type DomChangeEvent = React.ChangeEvent<HTMLInputElement>;
  export type Ref = React.Ref<HTMLInputElement>;
}

// this is just js-functionality
// @ts-ignore
// eslint-disable-next-line no-redeclare
const Core = {};
Core.renderElement = React.createElement;
Core.Component = React.Component;

export default Core;
