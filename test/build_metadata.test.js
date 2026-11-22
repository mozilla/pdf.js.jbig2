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

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { test } = require("node:test");

test("build metadata records the revision and local changes", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "jbig2-metadata-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const env = { ...process.env, REPO_REVISION: "" };
  delete env.GIT_INDEX_FILE;
  const options = { cwd: dir, encoding: "utf8", env };
  const git = (...args) =>
    execFileSync(
      "git",
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args],
      options,
    ).trim();

  const source = join(dir, "decoder.cpp");
  writeFileSync(source, "original\n");
  git("init", "--quiet");
  git("add", ".");
  git("commit", "--quiet", "--no-gpg-sign", "-m", "Initial commit");
  git("tag", "--annotate", "--no-sign", "-m", "Build tag", "build-tag");

  const revision = git("rev-parse", "HEAD");
  const emscripten = "1.2.3";
  const flags = '-s EXPORTED_FUNCTIONS=["_malloc", "_free"]\t-O3';
  const args = [
    require.resolve("../build_metadata.js"),
    dir,
    dir,
    emscripten,
    flags,
  ];
  const readMetadata = () =>
    JSON.parse(execFileSync(process.execPath, args, options));

  assert.deepEqual(readMetadata(), {
    pdfium: revision,
    repo: revision,
    emscripten,
    flags,
  });
  git("config", "status.showUntrackedFiles", "no");
  const untracked = join(dir, "untracked.h");
  writeFileSync(untracked, "untracked\n");
  assert.equal(readMetadata().repo, `${revision}-dirty`);
  rmSync(untracked);
  assert.equal(readMetadata().repo, revision);

  writeFileSync(source, "modified\n");
  assert.equal(readMetadata().repo, `${revision}-dirty`);

  writeFileSync(join(dir, ".git", "index"), "invalid index\n");
  assert.equal(readMetadata().repo, "unknown");
});
