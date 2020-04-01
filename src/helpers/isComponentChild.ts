import Core from "../core";

/**
 * Check if component placed inside the node;
 * @param node Node or Component inside that search for component
 * @param component Component that expected to be placed inside the Node
 * @returns true if Component is placed inside the Node
 */
export default function isComponentChild(
  node: Core.Node | Core.Node[] | undefined,
  component: Core.Component<{}, {}>
): boolean {
  if (!node) {
    return false;
  }
  if (Array.isArray(node)) {
    return node.some(nodeChild => isComponentChild(nodeChild, component));
  }
  const el = node as Core.Element;
  if (!el.props) {
    return false;
  }
  if (el.props === component.props) {
    return true;
  }
  if (el.props.children) {
    return isComponentChild(el.props.children, component);
  }
  return false;
}
