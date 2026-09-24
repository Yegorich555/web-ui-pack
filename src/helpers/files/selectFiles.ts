/** Options of {@link selectFiles} */
export interface ISelectFilesOptions {
  /** Allowed files: mime-types (`image/png`), mime-groups (`image/*`) &/or extensions (`.pdf`);
   * the selected files are checked as well since the browser-dialog lets the user pick `All files`.
   * A file matches a mime-rule by its reported `type` or by its extension (the browser reports an OS-specific
   * or empty `type` for some files: `application/x-zip-compressed` for `.zip` on Windows)
   * @defaultValue `[]` - every file is allowed (the same for `*` & `*`/`*`) */
  accept?: SelectFilesAccept[];
  /** Allow to select several files at once
   * @defaultValue false */
  multiple?: boolean;
  /** Max size of every file in bytes
   * @defaultValue `0` - no limit */
  maxSize?: number;
}

const ox = "application/vnd.openxmlformats-officedocument.";
const od = "application/vnd.oasis.opendocument.";
/** Mime-types by extensions: to match the files with an OS-specific or empty `type` (it depends on the OS)
 * & for {@link SelectFilesAccept}.
 * WARN: `Map` instead of an object: otherwise `a.constructor` gets a type from `Object.prototype` */
export const mimeByExt = new Map([
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["jfif", "image/jpeg"],
  ["gif", "image/gif"],
  ["webp", "image/webp"],
  ["svg", "image/svg+xml"],
  ["bmp", "image/bmp"],
  ["ico", "image/x-icon"],
  ["tif", "image/tiff"],
  ["tiff", "image/tiff"],
  ["heic", "image/heic"],
  ["heif", "image/heif"],
  ["avif", "image/avif"],
  ["jxl", "image/jxl"],
  ["mp3", "audio/mpeg"],
  ["wav", "audio/wav"],
  ["ogg", "audio/ogg"],
  ["m4a", "audio/mp4"],
  ["aac", "audio/aac"],
  ["flac", "audio/flac"],
  ["opus", "audio/opus"],
  ["mp4", "video/mp4"],
  ["webm", "video/webm"],
  ["mov", "video/quicktime"],
  ["avi", "video/x-msvideo"],
  ["mkv", "video/x-matroska"],
  ["mpeg", "video/mpeg"],
  ["mpg", "video/mpeg"],
  ["txt", "text/plain"],
  ["csv", "text/csv"],
  ["tsv", "text/tab-separated-values"],
  ["md", "text/markdown"],
  ["html", "text/html"],
  ["htm", "text/html"],
  ["css", "text/css"],
  ["js", "text/javascript"],
  ["ics", "text/calendar"],
  ["json", "application/json"],
  ["xml", "application/xml"],
  ["pdf", "application/pdf"],
  ["rtf", "application/rtf"],
  ["doc", "application/msword"],
  ["xls", "application/vnd.ms-excel"],
  ["ppt", "application/vnd.ms-powerpoint"],
  ["docx", `${ox}wordprocessingml.document`],
  ["xlsx", `${ox}spreadsheetml.sheet`],
  ["pptx", `${ox}presentationml.presentation`],
  ["odt", `${od}text`],
  ["ods", `${od}spreadsheet`],
  ["odp", `${od}presentation`],
  ["epub", "application/epub+zip"],
  ["zip", "application/zip"],
  ["7z", "application/x-7z-compressed"],
  ["rar", "application/vnd.rar"],
  ["gz", "application/gzip"],
  ["tar", "application/x-tar"],
  ["woff", "font/woff"],
  ["woff2", "font/woff2"],
  ["ttf", "font/ttf"],
  ["otf", "font/otf"],
] as const);

type KnownExt = typeof mimeByExt extends Map<infer K, string> ? K : never;
type KnownMime = typeof mimeByExt extends Map<string, infer V> ? V : never;
/** Mime-group of the mime-type: `image/*` for `image/png` */
type MimeGroup<T extends string> = T extends `${infer G}/${string}` ? `${G}/*` : never;

/** Rule of {@link ISelectFilesOptions.accept}: mime-type (`image/png`), mime-group (`image/*`), extension (`.pdf`)
 * or a wildcard (`*`, `*`/`*`); the known ones are listed for autocompletion, any other string is allowed as well */
export type SelectFilesAccept = KnownMime | MimeGroup<KnownMime> | `.${KnownExt}` | "*" | "*/*" | (string & {});

interface IAccept {
  /** Normalized rules as they're pointed: for the attribute & messages */
  list: string[];
  /** Rules to match: extension `.pdf`, mime-group `image/` or mime-type `image/png` */
  rules: string[];
}

/** The call with the opened dialog.
 * WARN: a plain object instead of closures: so it retains only the fields it needs (not `options` etc.) */
interface IOpenedCall {
  /** Time of `click()` by `performance.now()`: it's monotonic unlike `Date.now()` */
  at: number;
  /** Input of the call: it's reused by the next call that replaces this one */
  inp: HTMLInputElement;
  res: (v: unknown) => void;
  rej: (err: unknown) => void;
  onSelect: (files: File[]) => unknown;
  accept: IAccept | null;
  maxSize: number | undefined;
}

/** The call with the opened dialog: the browser opens a single dialog at once & ignores the next `click()` */
let opened: IOpenedCall | null = null;
/** Time (ms) after `click()` when the next call is ignored instead of replacing the opened dialog */
const openingMs = 1000;

/** Validates the selected files & settles the call by them;
 * `null` - the dialog is closed without selecting or the call is replaced */
function validate(call: IOpenedCall, files: File[] | null): void {
  if (!files?.length) {
    call.res(null); // some browsers fire `change` with empty files instead of `cancel`
    return;
  }
  const { accept, maxSize } = call;
  try {
    files.forEach((f) => {
      if (accept) {
        const name = f.name.toLowerCase();
        const type = f.type.toLowerCase();
        const extType = mimeByExt.get((/\.([^.]+)$/.exec(name)?.[1] ?? "") as KnownExt) ?? "";
        const isAccepted = accept.rules.some((r) => {
          if (r.startsWith(".")) {
            return name.endsWith(r); // WARN: `type` is empty for an unknown extension, so a name is checked
          }
          return r.endsWith("/") ? type.startsWith(r) || extType.startsWith(r) : type === r || extType === r;
        });
        if (!isAccepted) {
          throw new Error(`File '${f.name}' has invalid format. Expected: ${accept.list.join(", ")}`);
        }
      }
      if (maxSize && f.size > maxSize) {
        throw new Error(`File '${f.name}' is bigger than ${maxSize} bytes`);
      }
    });
    call.res(call.onSelect(files)); // a returned promise is adopted: its rejection rejects the result
  } catch (err) {
    call.rej(err);
  }
}

/** Removes the input & frees the dialog */
function disposeDialog(): void {
  opened?.inp.remove();
  opened = null;
}

/** Handles `change` & `cancel` of the input of the opened call.
 * WARN: it's declared outside `selectFiles`: the input is reused by the next call, so a closure would retain
 * the scope of the call that created the input (`onSelect`, `options` etc.) */
function onDialogEvent(this: HTMLInputElement, e: Event): void {
  const call = opened;
  if (call?.inp === this) {
    disposeDialog();
    validate(call, e.type === "change" ? Array.from(this.files ?? []) : null);
  }
}

/** Opens the browser-dialog to select file(s) via a temporary hidden `<input type="file">`, validates the selected
 * files & calls `onSelect` with them (to upload/read them); returns the result of `onSelect`
 * @param onSelect must not return `null` since it's reserved for the cancel
 * @returns `null` when the dialog is closed without selecting;
 * it's rejected when options are invalid, a file doesn't match the options or `onSelect` is failed
 * @tutorial Troubleshooting
 * * it must be called from a user-action (`click`, `keydown`...): otherwise the browser doesn't open the dialog,
 * so it's rejected at once when the browser reports it via `navigator.userActivation`
 * * only one dialog is opened at once: the next call during 1s (double-click) is ignored & returns `null`;
 * the next call after that replaces the previous one (it returns `null`) & the files selected in the opened dialog
 * go to the next call
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
    if (options.accept != null && !Array.isArray(options.accept)) {
      throw new Error(`selectFiles. Invalid option accept: ${options.accept}. Expected an array`);
    }
    const list = (options.accept ?? []).map((r) => r.trim().toLowerCase()).filter((r) => r);
    let accept: IAccept | null = null; // `null` - every file is allowed
    if (list.length && !list.some((r) => r === "*" || r === "*/*")) {
      const bad = list.find((r) => !/^(\..+|[^/*\s]+\/[^/\s]+)$/.test(r));
      if (bad) {
        throw new Error(
          `selectFiles. Invalid option accept: '${bad}'. Expected mime-type, mime-group or extension (image/png, image/*, .png)`
        );
      }
      accept = { list, rules: list.map((r) => (r.endsWith("/*") ? r.slice(0, -1) : r)) };
    }
    const ua = navigator.userActivation as UserActivation | undefined; // it's missed in jsdom
    if (ua && !ua.isActive) {
      throw new Error("selectFiles must be called from a user-action (click, keydown etc.)");
    }
    const now = performance.now();
    const prev = opened;
    if (prev && now - prev.at < openingMs) {
      res(null); // double-click: the dialog is opening already
      return;
    }

    // the dialog of the replaced call can be opened yet (non-modal picker) & the browser ignores `click()` of another
    // input then: so its input is reused; otherwise a new input: so selecting the same file again fires `change`
    const inp = prev?.inp ?? document.createElement("input");
    if (!prev) {
      inp.type = "file";
      inp.tabIndex = -1;
      inp.setAttribute("aria-hidden", "true");
      // WARN: not `hidden`: some mobile browsers don't open the dialog for an input with `display: none`
      inp.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
      inp.addEventListener("cancel", onDialogEvent);
      inp.addEventListener("change", onDialogEvent);
    }
    inp.multiple = !!options.multiple;
    if (accept) {
      inp.accept = accept.list.join(","); // it only filters the dialog: the user is still able to pick `All files`
    } else {
      inp.removeAttribute("accept");
    }
    opened = { at: now, inp, res: res as (v: unknown) => void, rej, onSelect, accept, maxSize };
    try {
      prev && validate(prev, null); // it's replaced: its dialog isn't opened at all or is opened yet (non-modal picker)
      document.body.appendChild(inp); // required by Safari: it doesn't fire `change` on a detached input
      inp.click();
    } catch (err) {
      disposeDialog();
      rej(err);
    }
  });
}
