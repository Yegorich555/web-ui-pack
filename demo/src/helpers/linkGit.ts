/** Returns link to github of current repo */
export default function linkGit(link: string | undefined | null): string {
  if (link?.startsWith("src")) {
    link = `/blob/${DEV ? "develop" : "master"}/${link}`;
  }

  return `https://github.com/Yegorich555/web-ui-pack${link || ""}`;
}
