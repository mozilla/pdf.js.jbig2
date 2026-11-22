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

test("build metadata records the revision and tracked changes", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "jbig2-metadata-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync(
      "git",
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args],
      { cwd: dir, encoding: "utf8" },
    ).trim();

  const source = join(dir, "decoder.cpp");
  writeFileSync(source, "original\n");
  git("init", "--quiet");
  git("add", "decoder.cpp");
  git("commit", "--quiet", "--no-gpg-sign", "-m", "Initial commit");
  git("tag", "--annotate", "--no-sign", "-m", "Build tag", "build-tag");

  const revision = git("rev-parse", "HEAD");
  const version = "1.2.3";
  const flags = '-s EXPORTED_FUNCTIONS=["_malloc", "_free"]\t-O3';
  const script = require.resolve("../build_metadata.js");
  const metadata = (env = {}) =>
    JSON.parse(
      execFileSync(process.execPath, [script, dir, dir, version, flags], {
        encoding: "utf8",
        env: { ...process.env, REPO_REVISION: "", ...env },
      }),
    );

  assert.deepEqual(metadata(), {
    pdfium: revision,
    repo: revision,
    emscripten: version,
    flags,
  });
  writeFileSync(source, "modified\n");
  assert.equal(metadata().repo, `${revision}-dirty`);

  const brokenIndex = join(dir, "broken-index");
  writeFileSync(brokenIndex, "invalid index\n");
  assert.equal(metadata({ GIT_INDEX_FILE: brokenIndex }).repo, "unknown");
});
