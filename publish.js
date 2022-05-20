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

  await exec("npm run build-demo"); // run building demo
  await exec("npm run coverage"); // run tests

  /* set date in changelog */
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dt = new Date();
  const gotDate = `(${monthsShort[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${dt.getUTCFullYear()})`;
  const txt = fs.readFileSync("./CHANGELOG.md", { encoding: "utf8" }).replace("(___)", gotDate);
  fs.writeFileSync("./CHANGELOG.md", txt, { encoding: "utf8" });

  /* update version in package.json */
  await exec("npm version patch --commit-hooks false --git-tag-version false", []);

  /* commit files */
  const { version } = require("./package.json");
  await exec(`git config core.autocrlf false && git add . && git commit -m "Bump version to ${version}"`, []);
  await exec(`git tag v${version}`, []);

  // publish to npm
  await exec("cd ./dist && npm publish");

  // push files
  await exec("git push && git push --tags", []);

  console.log("SUCCESS");
}

go();
