import BasicInput from "./basicInput";

export default class TextInput extends BasicInput<string> {
  isEmpty = (v: string): boolean => v == null || v.trim() === "";

  get initValue(): string {
    return "";
  }
}
