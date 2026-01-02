# pdf.js.jbig2

Provide a decoder for JBIG2 images based on the [pdfium](https://pdfium.googlesource.com/pdfium/) library.

## Build

Run:

```sh
node build.js --compile --output my_output_dir
```

it will create a Docker image with emsdk and then run it. The generated `jbig2.js` will be in `my_output_dir`.

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

## Licensing

The code is released under [Apache-2.0](https://pdfium.googlesource.com/pdfium/+/main/LICENSE).
