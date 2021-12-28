export interface IWUPBaseElement {
  options: Record<string, any>;
  // abstract resources: Record<string, any>;
}

export default abstract class WUPBaseElement extends HTMLElement implements IWUPBaseElement {
  abstract options: Record<string, any>;
  // abstract resources: Record<string, any>;
}

export type JSXCustomProps<T> = React.DetailedHTMLProps<
  // todo write babel-transform className > class
  Omit<React.HTMLAttributes<T>, "className"> & { class?: string | undefined },
  T
>;
