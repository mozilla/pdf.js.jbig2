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

#!/bin/sh

BUILD_TYPE=${BUILD_TYPE:=wasm}
BUILD_DIR=${BUILD_DIR:=build_${BUILD_TYPE}}
INPUT=${INPUT:=src}
PDFIUM=${PDFIUM:=pdfium}
OUTPUT=${OUTPUT:=.}
JBIG2=${JBIG2:=${PDFIUM}/core/fxcodec/jbig2}
JBIG2_BUILD=${JBIG2_BUILD:=${JBIG2}/${BUILD_DIR}}

CODEC_DIR=${PDFIUM}/core/fxcodec/
JBIG2_DIR=${CODEC_DIR}/jbig2
FAX_DIR=${CODEC_DIR}/fax
CRT_DIR=${PDFIUM}/core/fxcrt
GE_DIR=${PDFIUM}/core/fxge

echo "Building ${BUILD_TYPE} from ${BUILD_DIR} to ${OUTPUT}..."

if [ "$BUILD_TYPE" = "js" ]
then
    OUTPUT_FILE="jbig2_nowasm_fallback.js"
    CXXFLAGS="-Oz"
    WASM=0
else
    OUTPUT_FILE="jbig2.js"
    CXXFLAGS="-O3 -msimd128 -msse -fno-exceptions"
    WASM=1
fi

em++ -o ${OUTPUT}/${OUTPUT_FILE} \
        ${CODEC_DIR}/scanlinedecoder.cpp \
        ${CRT_DIR}/debug/alias.cc \
        ${CRT_DIR}/fx_memory.cpp \
        ${CRT_DIR}/fx_memory_malloc.cpp \
        ${FAX_DIR}/faxmodule.cpp \
        ${GE_DIR}/calculate_pitch.cpp \
        ${JBIG2}/jbig2_decoder.cpp \
        ${JBIG2}/JBig2_ArithDecoder.cpp \
        ${JBIG2}/JBig2_ArithIntDecoder.cpp \
        ${JBIG2}/JBig2_BitStream.cpp \
        ${JBIG2}/JBig2_Context.cpp \
        ${JBIG2}/JBig2_DocumentContext.cpp \
        ${JBIG2}/JBig2_GrdProc.cpp \
        ${JBIG2}/JBig2_GrrdProc.cpp \
        ${JBIG2}/JBig2_HtrdProc.cpp \
        ${JBIG2}/JBig2_HuffmanDecoder.cpp \
        ${JBIG2}/JBig2_HuffmanTable.cpp \
        ${JBIG2}/JBig2_Image.cpp \
        ${JBIG2}/JBig2_PddProc.cpp \
        ${JBIG2}/JBig2_PatternDict.cpp \
        ${JBIG2}/JBig2_SddProc.cpp \
        ${JBIG2}/JBig2_Segment.cpp \
        ${JBIG2}/JBig2_SymbolDict.cpp \
        ${JBIG2}/JBig2_TrdProc.cpp \
        ${INPUT}/decoder.cpp \
        --std=c++20 \
        -I${PDFIUM} \
        -I${INPUT} \
        -I. \
        -s ALLOW_MEMORY_GROWTH=1 \
        -s MAXIMUM_MEMORY=2GB \
        -s WASM=${WASM} \
        -s MODULARIZE=1 \
        -s EXPORT_NAME="'JBig2'" \
        -s WASM_ASYNC_COMPILATION=${WASM} \
        -s EXPORT_ES6=1 \
        -s SINGLE_FILE=0 \
        -s ENVIRONMENT='web' \
        -s ERROR_ON_UNDEFINED_SYMBOLS=1 \
        -s NO_FILESYSTEM=1 \
        -s NO_EXIT_RUNTIME=1 \
        -s MALLOC=emmalloc \
        -s EXPORTED_FUNCTIONS='["_jbig2_decode", "_ccit_decode","_malloc", "_free", "writeArrayToMemory"]' \
        -s AGGRESSIVE_VARIABLE_ELIMINATION=1 \
        -s ASSERTIONS=0 \
        -DNDEBUG \
        -flto \
        ${CXXFLAGS} \
        --js-library ${INPUT}/myjs.js

if [ "$BUILD_TYPE" = "wasm" ]
then
    chmod ugo-x ${OUTPUT}/jbig2.wasm
fi
sed -i '1 i\/* THIS FILE IS GENERATED - DO NOT EDIT */' ${OUTPUT}/${OUTPUT_FILE}

# -s ASSERTIONS=2 -s SAFE_HEAP=1 -s STACK_OVERFLOW_CHECK=2 -O0 -g4 \
