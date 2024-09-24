/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
const { spawn } = require("child_process");
const fs = require("fs");
const { cwd } = require("process");

async function go() {
  function exec(cmd, args, isGetResult) {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args || [("--progress", "--colors")], {
        shell: true,
        stdio: isGetResult ? "pipe" : "inherit",
        cwd: cwd(),
      });
      let msg;
      child.stdout?.on("data", (data) => (msg = data.toString()));
      child.on("error", reject);
      child.on("exit", (code) => (code === 0 ? resolve(msg) : reject(code)));
    });
  }

  /* checking master branch */
  const msg = await exec("git rev-parse --abbrev-ref HEAD", [], true);
  if (!msg.includes("master")) {
    throw new Error("Only master branch expected");
  }

  /* set date in changelog */
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dt = new Date();
  const gotDate = `(${monthsShort[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${dt.getUTCFullYear()})`;
  const txt = fs
    .readFileSync("./CHANGELOG.md", { encoding: "utf8" })
    .replace("(___)", gotDate)
    .replace("(\\_\\_\\_)", gotDate);
  fs.writeFileSync("./CHANGELOG.md", txt, { encoding: "utf8" });

  const ver = /## ([0-9.]+)/.exec(txt)[1];

  /* update version in package.json */
  const verReg = /("version": ")([0-9.]+)/;
  fs.writeFileSync(
    "./package.json", //
    fs.readFileSync("./package.json", { encoding: "utf8" }).replace(verReg, `$1${ver}`),
    { encoding: "utf8" }
  );
  fs.writeFileSync(
    "./package-lock.json",
    fs.readFileSync("./package-lock.json", { encoding: "utf8" }).replace(verReg, `$1${ver}`),
    { encoding: "utf8" }
  );
  // await exec("npm version patch --commit-hooks false --git-tag-version false", []);
  // await exec("npm run build"); // run build again because version is changed

  await exec("npm run coverage"); // build for test + tests + publish coverage
  await exec("npm run build"); // building prod version with removing comments
  await exec("npm run build-demo"); // building demo

  /* commit files */
  // const { version } = require("./package.json");
  await exec(`git config core.autocrlf false && git add . && git commit -m "Bump version to ${ver}"`, []);
  await exec(`git tag v${ver}`, []);

  // publish to npm
  // await exec("cd ./dist && npm publish");

  // push files
  // await exec("git push && git push --tags", []);

  console.warn("The current release is DONE. Check commit, tag and push both into Github");
  console.warn("use `npm run go-publish` to publish you package");
}

go();
