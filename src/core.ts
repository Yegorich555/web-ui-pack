/* eslint-disable @typescript-eslint/no-namespace */
import React from "react";

// this is just ts-types
// @ts-ignore
declare module Core {
  // eslint-disable-next-line react/prefer-stateless-function
  export class Component<Props, State> extends React.Component<Props, State> {}
  export type Element = React.ReactElement; // ReactChild
  export type HTMLAttributes<T> = React.HTMLAttributes<T>;
  export type Node = React.ReactNode;
  export function renderElement(type: any, props?: object | null, ...children: any[]): {};
  export type FormEvent = React.FormEvent<HTMLFormElement>;
  export type DomFocusEvent = React.FocusEvent<HTMLInputElement>;
  export type DomChangeEvent = React.ChangeEvent<HTMLInputElement>;
  export type DomKeyboardEvent = React.KeyboardEvent<HTMLElement>;
  export type DomMouseEvent = React.MouseEvent<HTMLElement>;
  export type Ref = React.Ref<HTMLInputElement>;
  export type HTMLLabelProps = React.DetailedHTMLProps<React.LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>;
  export type HTMLDivProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
  export type HTMLLiProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLLIElement>, HTMLLIElement>;
  export type HTMLFieldsetProps = React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLFieldSetElement>,
    HTMLFieldSetElement
  >;
}

// this is just js-functionality
// @ts-ignore
// eslint-disable-next-line no-redeclare
const Core = {};
Core.renderElement = React.createElement;
Core.Component = React.Component;

export default Core;
