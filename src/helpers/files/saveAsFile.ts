/** Saves Blob into file via hidden <a download>
 * @param fileName file with extension `savedfile.txt` */
export default function saveAsFile(blob: Blob, fileName: string): void {
  const h = URL.createObjectURL(blob);
  const a = document.createElement("a");

  try {
    a.rel = "noopener";
    a.href = h;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a); // required by Firefox: a click on a detached anchor is ignored
    a.click();
  } finally {
    a.remove();
    // WARN: revoking right after the click can abort the download, so it's delayed (the same as FileSaver.js does)
    setTimeout(() => URL.revokeObjectURL(h), 40_000);
  }
}
