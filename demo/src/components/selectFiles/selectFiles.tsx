import { useState } from "react";
import Code from "src/elements/code";
import Example from "src/elements/example";
import Page from "src/elements/page";
import selectFiles, { ISelectFilesOptions } from "web-ui-pack/helpers/files/selectFiles";
import styles from "./selectFiles.scss";

interface IFormState {
  /** Comma-separated rules */
  accept?: string;
  multiple: boolean;
  /** Bytes */
  maxSize?: number;
}

const emptyForm: IFormState = { multiple: false };

interface IPreset {
  label: string;
  details: string;
  form: Partial<IFormState>;
}

const presets: IPreset[] = [
  { label: "Any file", details: "{}", form: {} },
  {
    label: "Image up to 1Mb",
    details: '{ accept: ["image/*"], maxSize: 1048576 }',
    form: { accept: "image/*", maxSize: 1048576 },
  },
  {
    label: "Documents",
    details: '{ accept: [".pdf", ".docx", ".xlsx"], multiple: true }',
    form: { accept: ".pdf, .docx, .xlsx", multiple: true },
  },
  {
    label: "Archives",
    details: '{ accept: ["application/zip", ".7z", ".rar"] } - zip is matched by its extension as well',
    form: { accept: "application/zip, .7z, .rar" },
  },
];

/** Returns options of selectFiles based on the form */
function toOptions(f: IFormState): ISelectFilesOptions {
  const opts: ISelectFilesOptions = {};
  const accept = (f.accept ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s);
  if (accept.length) opts.accept = accept;
  if (f.multiple) opts.multiple = true;
  if (f.maxSize != null) opts.maxSize = f.maxSize;
  return opts;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}b`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}Kb`;
  return `${(bytes / 1024 / 1024).toFixed(1)}Mb`;
}

interface IFileInfo {
  name: string;
  type: string;
  size: number;
}

type Status = { kind: "idle" | "cancelled" | "done" } | { kind: "error"; message: string };

export default function SelectFilesView() {
  const [form, setForm] = useState<IFormState>(emptyForm);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [files, setFiles] = useState<IFileInfo[]>([]);

  const setField = <K extends keyof IFormState>(key: K, v: IFormState[K]): void => setForm((p) => ({ ...p, [key]: v }));

  const onSelectClick = async (): Promise<void> => {
    try {
      // onSelect is called only when the selected files are valid: so it's the place to upload/read them
      const res = await selectFiles(
        (list) => list.map<IFileInfo>((f) => ({ name: f.name, type: f.type, size: f.size })),
        toOptions(form)
      );
      if (res === null) {
        setStatus({ kind: "cancelled" });
        return;
      }
      setFiles(res);
      setStatus({ kind: "done" });
    } catch (err) {
      console.error(err);
      setStatus({ kind: "error", message: (err as Error).message });
    }
  };

  const optsJSON = JSON.stringify(toOptions(form));

  const statusText: Record<Status["kind"], string> = {
    idle: "",
    cancelled: "Cancelled: the dialog is closed without selecting (result is null)",
    done: `Selected ${files.length} file(s)`,
    error: status.kind === "error" ? `Error: ${status.message}` : "",
  };

  return (
    <Page //
      header="selectFiles"
      link="src/helpers/files/selectFiles.ts"
      features={[
        "Opens the browser-dialog without any <input type='file'> in your markup",
        "Validates the selected files by accept & maxSize: the user is able to pick 'All files' in the dialog",
        "Matches files by mime-type, mime-group or extension (even when the browser reports an OS-specific type)",
        "Returns the result of onSelect (upload/read) or null when the dialog is cancelled",
        "Ignores double-click & handles the replaced/cancelled dialogs",
      ]}
    >
      <Example header="Usage" link="demo/src/components/selectFiles/selectFiles.tsx">
        <Code code={codeJS} />
      </Example>

      <Example header="Try it" link="demo/src/components/selectFiles/selectFiles.tsx">
        <div className={styles.presets}>
          {presets.map((p) => (
            <button
              key={p.label}
              className="btn"
              type="button"
              title={p.details}
              onClick={() => setForm({ ...emptyForm, ...p.form })}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className={styles.form}>
          <wup-text
            class={styles.wide}
            w-label="accept (comma-separated: image/*, .pdf, application/zip)"
            ref={(el) => {
              if (el) {
                el.$value = form.accept;
                el.$onChange = () => setField("accept", el.$value);
              }
            }}
          />
          <wup-num
            w-label="maxSize (bytes)"
            ref={(el) => {
              if (el) {
                el.$value = form.maxSize;
                el.$onChange = () => setField("maxSize", el.$value);
              }
            }}
          />
          <wup-check
            w-label="multiple"
            ref={(el) => {
              if (el) {
                el.$value = form.multiple;
                el.$onChange = () => setField("multiple", !!el.$value);
              }
            }}
          />
        </div>

        <code className={styles.opts}>selectFiles(onSelect, {optsJSON});</code>

        <div className={styles.toolbar}>
          <button className="btn" type="button" onClick={onSelectClick}>
            Select files...
          </button>
          <small>tip: pick &apos;All files&apos; in the dialog to check the validation</small>
        </div>

        <div className={styles.status} data-error={status.kind === "error" ? "" : undefined}>
          {statusText[status.kind]}
        </div>

        {files.length ? (
          <table className={styles.files}>
            <thead>
              <tr>
                <th>name</th>
                <th>type</th>
                <th>size</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}>
                  <td>{f.name}</td>
                  <td>{f.type || <small>empty</small>}</td>
                  <td>{formatSize(f.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Example>
    </Page>
  );
}

const codeJS = `js
import selectFiles from "web-ui-pack/helpers/files/selectFiles";

// WARN: call it from a user-action (click, keydown etc.): otherwise the browser doesn't open the dialog
btn.onclick = async () => {
  try {
    const url = await selectFiles((files) => api.upload(files[0]), {
      accept: ["image/*", ".pdf"], // mime-types, mime-groups &/or extensions
      maxSize: 10_000_000, // bytes
    });
    if (url === null) {
      return; // the dialog is closed without selecting
    }
    // ...use the result of onSelect
  } catch (err) {
    // invalid file (format/size) or failed onSelect (api.upload)
    alert(err.message);
  }
};

// several files at once + read them instead of uploading
const texts = await selectFiles((files) => Promise.all(files.map((f) => f.text())), {
  accept: [".txt", ".csv", ".json"],
  multiple: true,
});`;
