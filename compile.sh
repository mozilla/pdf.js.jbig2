#!/bin/sh

# Copyright 2026 Mozilla Foundation
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -e

INPUT=${INPUT:=src}
PDFIUM=${PDFIUM:=pdfium}
OUTPUT=${OUTPUT:=.}
WASM2JS="${EMSDK}/upstream/bin/wasm2js"
TERSER="${EMSDK}/upstream/emscripten/node_modules/.bin/terser"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "${TMP_DIR}"' EXIT

CODEC_DIR="${PDFIUM}/core/fxcodec"
JBIG2="${CODEC_DIR}/jbig2"
FAX_DIR="${CODEC_DIR}/fax"
CRT_DIR="${PDFIUM}/core/fxcrt"
GE_DIR="${PDFIUM}/core/fxge"

build() {
    BUILD_TYPE=$1
    OUTPUT_FILE=$2
    CXXFLAGS=$3

    echo "Building ${BUILD_TYPE} to ${OUTPUT_FILE}..."

    em++ -o "${OUTPUT_FILE}" \
        "${CODEC_DIR}/scanlinedecoder.cpp" \
        "${CRT_DIR}/debug/alias.cc" \
        "${CRT_DIR}/fx_memory.cpp" \
        "${CRT_DIR}/fx_memory_malloc.cpp" \
        "${FAX_DIR}/faxmodule.cpp" \
        "${GE_DIR}/calculate_pitch.cpp" \
        "${JBIG2}/jbig2_decoder.cpp" \
        "${JBIG2}/jbig2_arith_decoder.cpp" \
        "${JBIG2}/jbig2_arith_int_decoder.cpp" \
        "${JBIG2}/jbig2_bit_stream.cpp" \
        "${JBIG2}/jbig2_context.cpp" \
        "${JBIG2}/jbig2_document_context.cpp" \
        "${JBIG2}/jbig2_grd_proc.cpp" \
        "${JBIG2}/jbig2_grrd_proc.cpp" \
        "${JBIG2}/jbig2_htrd_proc.cpp" \
        "${JBIG2}/jbig2_huffman_decoder.cpp" \
        "${JBIG2}/jbig2_huffman_table.cpp" \
        "${JBIG2}/jbig2_image.cpp" \
        "${JBIG2}/jbig2_pdd_proc.cpp" \
        "${JBIG2}/jbig2_pattern_dict.cpp" \
        "${JBIG2}/jbig2_sdd_proc.cpp" \
        "${JBIG2}/jbig2_segment.cpp" \
        "${JBIG2}/jbig2_symbol_dict.cpp" \
        "${JBIG2}/jbig2_trd_proc.cpp" \
        "${INPUT}/decoder.cpp" \
        --std=c++20 \
        -I"${PDFIUM}" \
        -I"${INPUT}" \
        -I. \
        -s ALLOW_MEMORY_GROWTH=1 \
        -s MAXIMUM_MEMORY=2GB \
        -s MODULARIZE=1 \
        -s EXPORT_NAME="'JBig2'" \
        -s EXPORT_ES6=1 \
        -s SINGLE_FILE=0 \
        -s ENVIRONMENT='web' \
        -s ERROR_ON_UNDEFINED_SYMBOLS=1 \
        -s NO_FILESYSTEM=1 \
        -s NO_EXIT_RUNTIME=1 \
        -s MALLOC=emmalloc \
        -s EXPORTED_FUNCTIONS='["_jbig2_decode", "_ccitt_decode", "_malloc", "_free"]' \
        -s EXPORTED_RUNTIME_METHODS='["writeArrayToMemory"]' \
        -s ASSERTIONS=0 \
        -DNDEBUG \
        -flto \
        ${CXXFLAGS} \
        --js-library "${INPUT}/myjs.js"
}

build wasm "${OUTPUT}/jbig2.js" "-O3 -msimd128 -msse -fno-exceptions"
chmod ugo-x "${OUTPUT}/jbig2.wasm"

build js "${TMP_DIR}/jbig2.js" "-Oz -fno-exceptions"

for PATTERN in 'var wasmImports={[^}]*}' 'function assignWasmExports(wasmExports){[^}]*}'
do
    EXPECTED=$(grep -o "${PATTERN}" "${OUTPUT}/jbig2.js" || true)
    ACTUAL=$(grep -o "${PATTERN}" "${TMP_DIR}/jbig2.js" || true)
    if [ -z "${EXPECTED}" ] || [ "${EXPECTED}" != "${ACTUAL}" ]
    then
        echo "The wasm and js builds must have the same imports and exports." >&2
        exit 1
    fi
done

echo "Converting the js build to ${OUTPUT}/jbig2_nowasm_fallback.js..."

"${WASM2JS}" --all-features --emscripten -O "${TMP_DIR}/jbig2.wasm" \
    -o "${TMP_DIR}/wasm2js.js"
{ printf "export default "; cat "${TMP_DIR}/wasm2js.js"; } > "${TMP_DIR}/module.js"
"${TERSER}" "${TMP_DIR}/module.js" --module --compress --mangle \
    -o "${OUTPUT}/jbig2_nowasm_fallback.js"

for OUTPUT_FILE in jbig2.js jbig2_nowasm_fallback.js
do
    sed -i '1 i\/* THIS FILE IS GENERATED - DO NOT EDIT */' "${OUTPUT}/${OUTPUT_FILE}"
done

# -s ASSERTIONS=2 -s SAFE_HEAP=1 -s STACK_OVERFLOW_CHECK=2 -O0 -g4 \
