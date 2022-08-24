/**
 * Changes camelCase 'somePropValue' to 'Some Prop Value'
 *
 * Changes snakeCase 'some_prop_value' to 'Some prop value'
 *
 * Changes kebabCase 'some-prop-value' to 'Some prop value'; `false` by default
 *
 * To capitalize use css [text-transform: capitalize]
 * @param text The string to change
 * @param changeKebabCase Set true to apply kebabCase rule; `false` by default
 * @returns Prettified string
 */
export default function stringPrettify(text: string, changeKebabCase = false): string {
  const r = text
    .replace(/([A-ZА-Я])/g, " $1")
    .trimStart()
    .replace(new RegExp(`[_${(changeKebabCase && "-") || ""}]`, "g"), " ")
    .replace(/[ ]{2,}/, " ");
  return r.charAt(0).toUpperCase() + r.slice(1);
}
