/*
 * Copyright 2026 Mozilla Foundation
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

#include "core/fxcodec/fax/faxmodule.h"
#include "core/fxcodec/scanlinedecoder.h"
#include "core/fxcodec/jbig2/JBig2_DocumentContext.h"
#include "core/fxcodec/jbig2/jbig2_decoder.h"
#include "core/fxcrt/fx_memory_wrappers.h"
#include "core/fxcrt/maybe_owned.h"
#include "emscripten.h"
#include <cstddef>
#include <cstdint>

extern "C" void setImageData(const uint8_t *, size_t, size_t, size_t);
extern "C" void createImageData(size_t);
extern "C" void setLineData(const uint8_t *, size_t, size_t);

extern "C" void EMSCRIPTEN_KEEPALIVE jbig2_decode(const uint8_t *data,
                                                  size_t data_size,
                                                  size_t width, size_t height,
                                                  const uint8_t *globals_data,
                                                  size_t globals_size) {
  const pdfium::span<const uint8_t> span =
      UNSAFE_BUFFERS(pdfium::span(data, data_size));
  const pdfium::span<const uint8_t> globals_span =
      UNSAFE_BUFFERS(pdfium::span(globals_data, globals_size));
  const size_t pitch32 = ((width + 31) / 32) * 4;
  const size_t pitch8 = ((width + 7) / 8);
  const size_t outputSize = pitch32 * height;
  MaybeOwned<uint8_t, FxFreeDeleter> outBuffer;
  outBuffer =
      std::unique_ptr<uint8_t, FxFreeDeleter>(FX_TryAlloc(uint8_t, outputSize));
  if (!outBuffer) {
    return;
  }
  const auto outSpan = pdfium::span(outBuffer.Get(), outputSize);
  JBig2_DocumentContext document_context;
  Jbig2Context jbig2_context;

  const bool reject_large_regions_when_fuzzing = false;
  FXCODEC_STATUS status = Jbig2Decoder::StartDecode(
      &jbig2_context, &document_context, width, height, span, 0, globals_span,
      0, outSpan, pitch32, nullptr, reject_large_regions_when_fuzzing);

  while (status == FXCODEC_STATUS::kDecodeToBeContinued) {
    status = Jbig2Decoder::ContinueDecode(&jbig2_context, nullptr);
  }

  if (status == FXCODEC_STATUS::kDecodeFinished) {
    setImageData(outBuffer.Get(), pitch8, pitch32, height);
  }
}

extern "C" void EMSCRIPTEN_KEEPALIVE ccitt_decode(
    const uint8_t *data, size_t data_size, size_t width, size_t height, int K,
    uint8_t EndOfLine, uint8_t ByteAlign, uint8_t BlackIs1, int Columns, int Rows) {

  const pdfium::span<const uint8_t> span =
      UNSAFE_BUFFERS(pdfium::span(data, data_size));
  std::unique_ptr<ScanlineDecoder> decoder = FaxModule::CreateDecoder(
      span, width, height, K, !!EndOfLine, !!ByteAlign, !!BlackIs1, Columns, Rows);
  if (!decoder) {
    return;
  }
  const size_t pitch8 = ((width + 7) / 8);
  createImageData(pitch8 * height);

  pdfium::span<const uint8_t> pOutLine;
  for (size_t line = 0; line < height; ++line) {
    pOutLine = decoder->GetScanline(static_cast<int>(line));
    if (pOutLine.empty()) {
      break;
    }
    setLineData(pOutLine.data(), pitch8, line * pitch8);
  }
}
