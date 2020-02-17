/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/prefer-namespace-keyword */
/* eslint-disable react/prefer-stateless-function */
import React from "react";

declare module Core {
  // eslint-disable-next-line no-inner-declarations
  export class Component<P> extends React.Component<P> {}
  export type Element = React.ReactElement;

  export type Validation<T, setVType> = {
    test: (v: T, setV?: setVType) => boolean;
    msg: string | ((setV: number | string) => string);
  };

  export type Validations<T, setVType> = {
    [key: string]: Validation<T, setVType>;
  };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  export function renderElement(type: any, props?: object | null, ...children: any[]): any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
Core.renderElement = React.createElement;

export default Core;
// module.exports.default.WebUIPackRenderElement = createElement;
