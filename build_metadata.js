/*
 * Copyright (c) 2026, Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

const { execFileSync } = require("child_process");

function git(dir, args) {
  return execFileSync("git", args, {
    cwd: dir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function getRepoRevision(dir, gitOptions = []) {
  try {
    const revision = git(dir, [...gitOptions, "rev-parse", "HEAD"]);
    const status = git(dir, [
      ...gitOptions,
      "status",
      "--porcelain",
      "--untracked-files=no",
    ]);
    return status ? `${revision}-dirty` : revision;
  } catch {
    return "unknown";
  }
}

function getPdfiumRevision(dir) {
  try {
    return git(dir, ["rev-parse", "HEAD"]);
  } catch {
    return process.env.PDFIUM_GIT_HASH || "unknown";
  }
}

if (require.main === module) {
  const [pdfiumDir, sourceDir, emscripten, flags] = process.argv.slice(2);
  const pdfium = getPdfiumRevision(pdfiumDir);
  // The mounted checkout can belong to a different user inside Docker.
  const repo =
    process.env.REPO_REVISION ||
    getRepoRevision(sourceDir, ["-c", "safe.directory=*"]);
  process.stdout.write(JSON.stringify({ pdfium, repo, emscripten, flags }));
}

module.exports = { getRepoRevision };
