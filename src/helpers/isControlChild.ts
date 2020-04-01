import Core from "../core";
import { BaseControl } from "../controls/baseControl";

/**
 * Check if control placed inside the node;
 * Control must contain props.name;
 * @param node Node inside that search for control
 * @param control Control that has props.name and inherited from BaseControl
 * @returns true if control has props.name and placed inside the node
 */
export default function isControlChild(
  node: Core.Node | Core.Node[] | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: BaseControl<any, { name?: string }, any>
): boolean {
  if (control.props?.name == null) {
    return false;
  }
  if (!node) {
    return false;
  }
  if (Array.isArray(node)) {
    return node.some(nodeChild => isControlChild(nodeChild, control));
  }

  const type = (node as Core.Element).type as undefined | { prototype: unknown };
  if (!type) {
    return false;
  }
  if (!(type.prototype instanceof BaseControl)) {
    return false;
  }
  if (type !== control.constructor) {
    return false;
  }

  if ((node as Core.Element)?.props?.name === control.props.name) {
    return true;
  }

  return false;
}
