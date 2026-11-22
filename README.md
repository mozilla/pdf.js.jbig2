# pdf.js.jbig2

Provide a decoder for JBIG2 images based on the [pdfium](https://pdfium.googlesource.com/pdfium/) library.

## Build

Run:

```sh
node build.js --compile --output my_output_dir
```

This builds a Docker image if needed, then writes `jbig2.js`, `jbig2.wasm` and `jbig2_nowasm_fallback.js` to `my_output_dir`.

### Build metadata

`jbig2.wasm` contains a `build_info` custom section with a JSON object describing the build: the pdfium revision (`pdfium`), the revision of this repository (`repo`, suffixed with `-dirty` if there were local changes), the Emscripten version (`emscripten`) and the compile flags (`flags`). It can be read with:

```js
const module = await WebAssembly.compile(bytes);
const [section] = WebAssembly.Module.customSections(module, "build_info");
const buildInfo = JSON.parse(new TextDecoder().decode(section));
```

## Update

In order to update pdfium to a specific revision, change the commit hash in `Dockerfile` and then run:
```sh
node build.js --create
```
to create a new docker image and then
```sh
node build.js --compile --output my_output_dir
```
to compile. The short version is:
```sh
node build.js -Cco my_output_dir
```

## Release

Pushing a version tag (e.g. `v1.2.3`) runs the `Release` workflow: it builds the decoder and opens a pull request in [pdf.js](https://github.com/mozilla/pdf.js) updating `external/jbig2/`, titled "Update JBIG2 decoder to version 1.2.3":
```sh
git tag v1.2.3
git push origin v1.2.3
```

The workflow runs in the `release` environment, which must provide the `CLIENT_ID` and `APP_PRIVATE_KEY` secrets of a GitHub App installed on `mozilla/pdf.js` with read and write access to contents and pull requests.

## Licensing

The code is released under [Apache-2.0](https://pdfium.googlesource.com/pdfium/+/main/LICENSE).
