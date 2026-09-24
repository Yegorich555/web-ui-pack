/** Options of {@link selectFiles} */
export interface ISelectFilesOptions {
  /** Allowed files: mime-types (`image/png`), mime-groups (`image/*`) &/or extensions (`.pdf`);
   * the selected files are checked as well since the browser-dialog lets the user pick `All files`
   * @defaultValue `[]` - every file is allowed (the same for `*` & `*`/`*`) */
  accept?: string[];
  /** Allow to select several files at once
   * @defaultValue false */
  multiple?: boolean;
  /** Max size of every file in bytes
   * @defaultValue `0` - no limit */
  maxSize?: number;
}

/** Mime-types of the files that the browser can report with empty `type` (it depends on the OS) */
const extMime = new Map([
  ["heic", "image/heic"],
  ["heif", "image/heif"],
  ["avif", "image/avif"],
  ["jxl", "image/jxl"],
]);

/** Returns normalized `accept`-rules or `null` when every file is allowed */
function parseAccept(accept: string[] | undefined): string[] | null {
  const rules = (accept ?? []).map((r) => r.trim().toLowerCase()).filter((r) => r);
  return !rules.length || rules.some((r) => r === "*" || r === "*/*") ? null : rules;
}

/** Returns whether the file matches the pointed normalized `accept`-rule: mime-type, mime-group or extension */
function isAccepted(f: File, r: string): boolean {
  const name = f.name.toLowerCase();
  if (r.startsWith(".")) {
    return name.endsWith(r); // WARN: `type` is empty for an unknown extension, so a name is checked
  }
  const t = f.type.toLowerCase() || extMime.get(/\.([^.]+)$/.exec(name)?.[1] ?? "") || "";
  return r.endsWith("/*") ? t.startsWith(r.slice(0, -1)) : t === r;
}

/** Throws an Error when a file doesn't match the options */
function validate(files: File[], rules: string[] | null, maxSize: number | undefined): void {
  files.forEach((f) => {
    if (rules && !rules.some((r) => isAccepted(f, r))) {
      throw new Error(`File '${f.name}' has invalid format. Expected: ${rules.join(", ")}`);
    }
    if (maxSize && f.size > maxSize) {
      throw new Error(`File '${f.name}' is bigger than ${maxSize} bytes`);
    }
  });
}

/** The call with the opened dialog: the browser opens a single dialog at once & ignores the next `click()` */
let opened: { at: number; cancel: () => void } | null = null;
/** Time (ms) after `click()` when the next call is ignored instead of replacing the opened dialog */
const openingMs = 1000;

/** Opens the browser-dialog to select file(s) via a temporary hidden `<input type="file">`, validates the selected
 * files & calls `onSelect` with them (to upload/read them); returns the result of `onSelect`
 * @param onSelect must not return `null` since it's reserved for the cancel
 * @returns `null` when the dialog is closed without selecting;
 * it's rejected when options are invalid, a file doesn't match the options or `onSelect` is failed
 * @tutorial Troubleshooting
 * * it must be called from a user-action (`click`, `keydown`...): otherwise the browser doesn't open the dialog,
 * so it's rejected at once when the browser reports it via `navigator.userActivation`
 * * only one dialog is opened at once: the next call during 1s (double-click) is ignored & returns `null`;
 * the next call after that cancels the previous one (returns `null`) as a stale one
 * * the promise stays pending when the dialog is closed without selecting in a browser without event `cancel`
 * on `<input type="file">` (Chrome <113, Safari <16.4): it's resolved with `null` by the next call only
 * @example
 * btn.onclick = async () => {
 *   const url = await selectFiles((files) => api.upload(files[0]), { accept: ["image/*"], maxSize: 10_000_000 });
 *   if (url === null) return; // cancelled by the user
 * } */
export default function selectFiles<T extends {} | undefined | void>(
  onSelect: (files: File[]) => T | Promise<T>,
  options: ISelectFilesOptions = {}
): Promise<T | null> {
  // everything is inside the executor: so any failure (even missed `document` in NodeJS) rejects the promise
  return new Promise<T | null>((res, rej) => {
    const { maxSize } = options;
    if (maxSize != null && !(maxSize >= 0)) {
      throw new Error(`selectFiles. Invalid option maxSize: ${maxSize}`);
    }
    const ua = navigator.userActivation as UserActivation | undefined; // it's missed in old browsers & in jsdom
    if (ua && !ua.isActive) {
      throw new Error("selectFiles must be called from a user-action (click, keydown etc.)");
    }
    if (opened) {
      if (Date.now() - opened.at < openingMs) {
        res(null); // double-click: the dialog is opening already
        return;
      }
      opened.cancel(); // it's stale: the dialog is closed without any event or isn't opened at all
    }

    const rules = parseAccept(options.accept);
    const inp = document.createElement("input");
    inp.type = "file";
    inp.tabIndex = -1;
    inp.setAttribute("aria-hidden", "true");
    // WARN: not `hidden`: some mobile browsers don't open the dialog for an input with `display: none`
    inp.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
    inp.multiple = !!options.multiple;
    if (rules) {
      inp.accept = rules.join(","); // it only filters the dialog: the user is still able to pick `All files`
    }

    const call = {
      at: Date.now(),
      cancel: (): void => {
        done() && res(null);
      },
    };
    /** Removes the input & frees the dialog; returns false when it's done already (settled or replaced by the next call) */
    const done = (): boolean => {
      if (opened !== call) {
        return false;
      }
      opened = null;
      inp.remove();
      return true;
    };

    inp.addEventListener("cancel", call.cancel);
    inp.addEventListener("change", () => {
      if (!done()) {
        return; // it's settled already or replaced by the next call
      }
      const files = Array.from(inp.files ?? []);
      if (!files.length) {
        res(null); // some browsers fire `change` with empty files instead of `cancel`
        return;
      }
      try {
        validate(files, rules, maxSize);
        res(onSelect(files)); // a returned promise is adopted: its rejection rejects the result
      } catch (err) {
        rej(err);
      }
    });

    try {
      opened = call; // before appending: so `done()` in `catch` cleans up
      // a new input per call: otherwise selecting the same file again doesn't fire `change`
      document.body.appendChild(inp); // required by Safari: it doesn't fire `change` on a detached input
      inp.click();
    } catch (err) {
      done();
      rej(err);
    }
  });
}
