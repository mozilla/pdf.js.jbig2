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

mergeInto(LibraryManager.library, {
  setImageData: function (array_ptr, pitch8, pitch32, height) {
    if (pitch32 === pitch8) {
      Module.imageData = new Uint8ClampedArray(
        HEAPU8.subarray(array_ptr, array_ptr + pitch32 * height)
      );
      return;
    }
    const destSize = pitch8 * height;
    const imageData = (Module.imageData = new Uint8ClampedArray(destSize));
    for (
      let srcStart = array_ptr, destStart = 0;
      destStart < destSize;
      srcStart += pitch32, destStart += pitch8
    ) {
      imageData.set(HEAPU8.subarray(srcStart, srcStart + pitch8), destStart);
    }
  },
  createImageData: function (size) {
    Module.imageData = new Uint8Array(size);
  },
  setLineData: function (line_ptr, pitch8, offset) {
    Module.imageData.set(HEAPU8.subarray(line_ptr, line_ptr + pitch8), offset);
  },
});
