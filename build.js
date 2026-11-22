/*
 * Copyright (c) 2026, Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

const { ArgumentParser } = require("argparse");
const fs = require("fs");
const { spawn } = require("child_process");
const { tmpdir } = require("os");
const { join, resolve } = require("path");
const { getRepoRevision } = require("./build_metadata.js");

function execAndPrint(fun, args) {
  const child = spawn(fun, args, { stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${fun} exited with code ${code}`));
    });
  });
}

function create(imageIdFile) {
  const args = ["build", "-t", "jbig2-decoder"];
  if (imageIdFile) {
    args.push("--iidfile", imageIdFile);
  }
  return execAndPrint("docker", [...args, "."]);
}

function build(path, imageId) {
  const workingDir = resolve(".");
  return execAndPrint("docker", [
    "run",
    "-t",
    "-e",
    `REPO_REVISION=${getRepoRevision(workingDir)}`,
    "-v",
    `${path}:/js`,
    "-v",
    `${workingDir}:/code`,
    "--rm",
    imageId,
  ]);
}

async function compile(path) {
  path = resolve(path);
  await fs.promises.access(path, fs.constants.F_OK);
  const tempDir = await fs.promises.mkdtemp(join(tmpdir(), "jbig2-build-"));
  try {
    const imageIdFile = join(tempDir, "image-id");
    await create(imageIdFile);
    // Another checkout can retag the image before this container starts.
    const imageId = (await fs.promises.readFile(imageIdFile, "utf8")).trim();
    await build(path, imageId);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

const parser = new ArgumentParser({
  description: "Build JBig2 decoder",
});

parser.add_argument("-C", "--create", {
  help: "Create the docker image",
  action: "store_true",
});
parser.add_argument("-c", "--compile", {
  help: "Build the WASM decoder and JS fallback",
  action: "store_true",
});
parser.add_argument("-o", "--output", {
  help: "Output directory",
  default: ".",
});

const args = parser.parse_args();

async function main() {
  if (args.compile) {
    await compile(args.output);
  } else if (args.create) {
    await create();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
