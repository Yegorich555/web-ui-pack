import { useEffect, useState } from "react";
import Code from "src/elements/code";
import Example from "src/elements/example";
import Page from "src/elements/page";
import imageConvert, { IImageConvertOptions, WUPImageEncodeFormat } from "web-ui-pack/helpers/files/imageConvert";
import saveAsFile from "web-ui-pack/helpers/files/saveAsFile";
import styles from "./imageConvert.scss";

/** Info about an image that is shown in the preview */
interface IImageInfo {
  blob: Blob;
  url: string;
  w: number;
  h: number;
  name: string;
}

type SizeOption = "width" | "height" | "maxWidth" | "maxHeight" | "minWidth" | "minHeight";
const sizeOptions: SizeOption[] = ["width", "height", "maxWidth", "maxHeight", "minWidth", "minHeight"];

interface IFormState extends Record<SizeOption, string> {
  keepAspectRatio: boolean;
  format: WUPImageEncodeFormat | "";
  quality: string;
  background: string;
}

/** Form without any options: presets are applied on top of it */
const emptyForm: IFormState = {
  width: "",
  height: "",
  maxWidth: "",
  maxHeight: "",
  minWidth: "",
  minHeight: "",
  keepAspectRatio: true,
  format: "",
  quality: "",
  background: "",
};

const defaultForm: IFormState = { ...emptyForm, maxWidth: "300", maxHeight: "300" };

interface IPreset {
  label: string;
  details: string;
  form: Partial<IFormState>;
}

const presets: IPreset[] = [
  { label: "Preview", details: "{ maxWidth: 300, maxHeight: 300 }", form: { maxWidth: "300", maxHeight: "300" } },
  {
    label: "Avatar",
    details: '{ width: 96, height: 96, keepAspectRatio: false, format: "jpg" }',
    form: { width: "96", height: "96", keepAspectRatio: false, format: "jpg" },
  },
  {
    label: "Increase",
    details: "{ minWidth: 1600, minHeight: 1600 }",
    form: { minWidth: "1600", minHeight: "1600" },
  },
  {
    label: "Compress",
    details: '{ format: "webp", quality: 0.5 }',
    form: { format: "webp", quality: "0.5" },
  },
  {
    label: "Fill transparency",
    details: '{ background: "#ffd400" }',
    form: { background: "#ffd400" },
  },
];

/** Returns options of imageConvert based on the form */
function toOptions(f: IFormState): IImageConvertOptions {
  const opts: IImageConvertOptions = {};
  sizeOptions.forEach((k) => {
    if (f[k] !== "") opts[k] = +f[k];
  });
  if (!f.keepAspectRatio) opts.keepAspectRatio = false;
  if (f.format) opts.format = f.format;
  if (f.quality !== "") opts.quality = +f.quality;
  if (f.background) opts.background = f.background;
  return opts;
}

/** Reads the size of the image */
function readImageInfo(blob: Blob, name: string): Promise<IImageInfo> {
  const url = URL.createObjectURL(blob);
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res({ blob, url, w: img.naturalWidth, h: img.naturalHeight, name });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("Image is broken or its format isn't supported"));
    };
    img.src = url;
  });
}

/** Generates a sample png with transparent parts: so every option (background included) is visible */
function generateSample(): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 800;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, c.width, c.height);
  g.addColorStop(0, "#4472c4");
  g.addColorStop(1, "#e74c3c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(40, 40, c.width - 80, c.height - 80, 120); // corners are transparent
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 120px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("1200 x 800", c.width / 2, c.height / 2);
  return new Promise((res, rej) => {
    c.toBlob((b) => (b ? res(b) : rej(new Error("Impossible to generate the sample"))), "image/png");
  });
}

function fileExt(type: string): string {
  return type.replace("image/", "").replace("jpeg", "jpg");
}

function Preview({ header, info, extra }: { header: string; info: IImageInfo | null; extra: string }) {
  return (
    <figure className={styles.preview}>
      <figcaption>
        <b>{header}</b>
        {info ? (
          <small>
            {info.w} x {info.h} px, {(info.blob.size / 1024).toFixed(1)}Kb, {info.blob.type || "unknown type"}
            {extra ? `, ${extra}` : ""}
          </small>
        ) : null}
      </figcaption>
      <div className={styles.imgWrap}>{info ? <img src={info.url} alt={header} /> : <small>empty</small>}</div>
    </figure>
  );
}

export default function ImageConvertView() {
  const [source, setSource] = useState<IImageInfo | null>(null);
  const [result, setResult] = useState<{ info: IImageInfo; ms: number } | null>(null);
  const [form, setForm] = useState<IFormState>(defaultForm);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // free the memory of the previous object-urls
  useEffect(
    () => () => {
      source && URL.revokeObjectURL(source.url);
    },
    [source]
  );
  useEffect(
    () => () => {
      result && URL.revokeObjectURL(result.info.url);
    },
    [result]
  );

  useEffect(() => {
    generateSample()
      .then((b) => readImageInfo(b, "sample.png"))
      .then(setSource)
      .catch((err) => setError((err as Error).message));
  }, []);

  const convert = async (src: IImageInfo | null, f: IFormState): Promise<void> => {
    if (!src) return;
    setPending(true);
    setError(null);
    try {
      const start = performance.now();
      const blob = await imageConvert(src.blob, toOptions(f));
      const ms = Math.round(performance.now() - start);
      const name = `${src.name.replace(/\.[^.]*$/, "")}-converted.${fileExt(blob.type)}`;
      setResult({ info: await readImageInfo(blob, name), ms });
    } catch (err) {
      console.error(err);
      setResult(null);
      setError(`Error: ${(err as Error).message}`);
    } finally {
      setPending(false);
    }
  };

  // re-convert on every change
  useEffect(() => {
    convert(source, form);
  }, [source, form]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSource(await readImageInfo(file, file.name));
    } catch (err) {
      // a browser can't show it (heic in Chrome etc.): try to convert anyway
      setSource({ blob: file, url: "", w: 0, h: 0, name: file.name });
      setError((err as Error).message);
    }
  };

  const setField = <K extends keyof IFormState>(key: K, v: IFormState[K]): void => setForm((p) => ({ ...p, [key]: v }));

  const optsJSON = JSON.stringify(toOptions(form));

  let statusText = error ?? "";
  if (!error && pending) {
    statusText = "Converting...";
  } else if (!error && result && result.info.blob === source?.blob) {
    statusText = "Nothing is changed: the file is returned as it is";
  }

  return (
    <Page //
      header="imageConvert"
      link="src/helpers/files/imageConvert.ts"
      features={[
        "Resizes an image via canvas without any dependencies",
        "Reduce (max...), increase (min...) or fit (width/height) with keeping the aspect ratio",
        "Cuts the image (centered) when keepAspectRatio: false",
        "Converts to png/jpg/webp with a custom quality & background for transparent parts",
        "Applies exif-rotation of photos & returns the file as it is when nothing is changed",
      ]}
    >
      <Example header="Usage" link="demo/src/components/imageConvert/imageConvert.tsx">
        <Code code={codeJS} />
      </Example>

      <Example header="Try it" link="demo/src/components/imageConvert/imageConvert.tsx">
        <div className={styles.toolbar}>
          <label className="btn" htmlFor="ic_file">
            Choose image...
            <input id="ic_file" type="file" accept="image/*" hidden onChange={onFileChange} />
          </label>
          <small>or use the generated sample below (it has transparent corners)</small>
        </div>

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
          {sizeOptions.map((k) => (
            <label key={k} htmlFor={`ic_${k}`}>
              <span>{k}</span>
              <input
                id={`ic_${k}`}
                type="number"
                min={0}
                value={form[k]}
                onChange={(e) => setField(k, e.target.value)}
              />
            </label>
          ))}
          <label htmlFor="ic_format">
            <span>format</span>
            <select
              id="ic_format"
              value={form.format}
              onChange={(e) => setField("format", e.target.value as IFormState["format"])}
            >
              <option value="">same as source</option>
              <option value="png">png</option>
              <option value="jpg">jpg</option>
              <option value="webp">webp</option>
            </select>
          </label>
          <label htmlFor="ic_quality">
            <span>quality</span>
            <input
              id="ic_quality"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={form.quality}
              onChange={(e) => setField("quality", e.target.value)}
            />
          </label>
          <label htmlFor="ic_background">
            <span>background</span>
            <input
              id="ic_background"
              type="text"
              placeholder="#fff"
              value={form.background}
              onChange={(e) => setField("background", e.target.value)}
            />
          </label>
          <label className={styles.check} htmlFor="ic_keepAspectRatio">
            <input
              id="ic_keepAspectRatio"
              type="checkbox"
              checked={form.keepAspectRatio}
              onChange={(e) => setField("keepAspectRatio", e.target.checked)}
            />
            <span>keepAspectRatio</span>
          </label>
        </div>

        <code className={styles.opts}>imageConvert(file, {optsJSON});</code>

        <div className={styles.status} data-error={error ? "" : undefined}>
          {statusText}
        </div>

        <div className={styles.previews}>
          <Preview header="Source" info={source?.url ? source : null} extra="" />
          <Preview header="Result" info={result?.info ?? null} extra={result ? `converted in ${result.ms}ms` : ""} />
        </div>

        <button
          className="btn"
          type="button"
          disabled={!result || pending}
          onClick={() => result && saveAsFile(result.info.blob, result.info.name)}
        >
          Save result
        </button>
      </Example>
    </Page>
  );
}

const codeJS = `js
import imageConvert from "web-ui-pack/helpers/files/imageConvert";

// reduce the image to fit into the box (the smaller one isn't touched)
const preview = await imageConvert(file, { maxWidth: 200, maxHeight: 200 });

// resize & cut (centered) to the exact size + convert to jpg
const avatar = await imageConvert(file, { width: 96, height: 96, keepAspectRatio: false, format: "jpg" });

// convert only: the same size but another format & quality
const small = await imageConvert(pngFile, { format: "webp", quality: 0.8 });

// fill transparent parts (jpg is filled with #fff by default)
const withBg = await imageConvert(pngFile, { format: "jpg", background: "#ffd400" });`;
