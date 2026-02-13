FROM emscripten/emsdk:latest
WORKDIR /tmp

ENV PDFIUM_GIT_HASH=0455e822ded1a5537d826703988e986a33d2d4a1

RUN git config --global user.email "you@example.com" && \
    git config --global user.name "Your Name" && \
    git clone https://pdfium.googlesource.com/pdfium && \
    cd pdfium && \
    git checkout -b base ${PDFIUM_GIT_HASH} && \
    cd ..

ENV OUTPUT=/js
ENV PDFIUM=/tmp/pdfium
ENV INPUT=/code/src

ENV BUILD_TYPE=wasm
ENV BUILD_DIR=build_${BUILD_TYPE}

ADD compile.sh .
ADD build build

CMD ["/bin/sh", "-c", "/code/compile.sh"]
