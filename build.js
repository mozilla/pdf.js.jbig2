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
const { resolve } = require("path");

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

function create() {
  return execAndPrint("docker", ["build", "-t", "jbig2-decoder", "."]);
}

function build(type, path) {
  const workingDir = resolve(".");
  return execAndPrint("docker", [
    "run",
    "-t",
    "-v",
    `${path}:/js`,
    "-v",
    `${workingDir}:/code`,
    "--env",
    `BUILD_TYPE=${type}`,
    "--rm",
    "jbig2-decoder",
  ]);
}

async function hasImage() {
  try {
    await execAndPrint("docker", ["image", "inspect", "jbig2-decoder"]);
    return true;
  } catch {
    return false;
  }
}

async function compile(type, path) {
  path = resolve(path);
  await fs.promises.access(path, fs.constants.F_OK);
  if (!(await hasImage())) {
    await create();
  }
  await build(type, path);
}

const parser = new ArgumentParser({
  description: "Build JBig2 decoder",
});

parser.add_argument("-C", "--create", {
  help: "Create the docker image",
  action: "store_true",
});
parser.add_argument("-c", "--compile", {
  help: "Compile the decoder and output a js file",
  action: "store_true",
});
parser.add_argument("-o", "--output", {
  help: "Output directory",
  default: ".",
});
parser.add_argument("-t", "--type", {
  help: "Type (wasm or js)",
  default: "wasm",
});

const args = parser.parse_args();

async function main() {
  if (args.create) {
    await create();
  }
  if (args.compile) {
    await compile(args.type, args.output);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
