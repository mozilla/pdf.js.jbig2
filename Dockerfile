FROM emscripten/emsdk:7.0.0@sha256:6bd7aef93408b10bf7b36642cb7c91119b302f720b9ec2d20439f73cf07fe894
WORKDIR /tmp

ENV PDFIUM_GIT_HASH=bb1f9f71e7b15afdd5937adf8cfe5807522b882f

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

ADD build build

CMD ["/bin/sh", "-c", "/code/compile.sh"]
