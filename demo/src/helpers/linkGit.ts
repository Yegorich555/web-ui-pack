/** Returns link to github of current repo */
export default function linkGit(link: string | undefined | null): string {
  const isFile = /.[a-z]{2,3}$/.test(link || "");
  if (link?.startsWith("src") || isFile) {
    link = `/blob/${DEV ? "develop" : "master"}/${link}`;
  }

  return `https://github.com/Yegorich555/web-ui-pack${link || ""}`;
}
