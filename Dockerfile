FROM emscripten/emsdk:latest
WORKDIR /tmp

ENV PDFIUM_GIT_HASH=3c679253a9e17c10be696d345c63636b18b7f925

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
