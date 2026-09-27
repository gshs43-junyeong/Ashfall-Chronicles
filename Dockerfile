# syntax=docker/dockerfile:1
# Ashfall Chronicles — 컨테이너로 묶기 · 검사 · 서빙(엔진화 계획 §5-2 · P11).
# 기존 방식(index.html 더블클릭 · python3 -m http.server · Vercel)은 그대로다 — 이 파일은 "누구 컴퓨터에서든 같게"를 위한 덧문이다.
#
#   docker build --target game  -t ashfall-game .    # game/ 만 nginx 로   → docker run -p 8000:80 ashfall-game
#   docker build --target site  -t ashfall-site .    # 배포 사이트(/home · /download · /play)
#   docker build --target check -t ashfall-check .   # 회귀 검사 한 벌   → docker run --rm ashfall-check
#   docker compose up dev                            # 고치고 새로고침(소스를 걸어 둔다)
#
# ★ 번들(game/js/ashfall.js)은 저장소에 커밋된 산출물이다. build 단계가 소스에서 다시 만들어 쓰지만,
#   이미지 안에서 만든 번들을 저장소로 되가져오지는 않는다 — 커밋할 번들은 늘 로컬 `npm run build` 로.

ARG NODE_IMAGE=node:22-bookworm-slim
ARG NGINX_IMAGE=nginx:alpine
# package.json 의 playwright 판과 같아야 한다 — 다르면 브라우저를 못 찾는다.
ARG PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v1.63.0-noble

# ---- 의존성 — package*.json 만 먼저 넣어 소스를 고쳐도 이 층은 캐시에 남게 ----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
# 회사·학교 프록시처럼 TLS 를 가로채는 망이면 그 CA 를 시크릿으로 준다(없으면 그냥 지나간다):
#   docker build --secret id=ca,src=/path/to/ca.crt …   · compose 는 아래 secrets 참고
RUN --mount=type=secret,id=ca,required=false \
    if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; npm ci --no-audit --no-fund

# ---- 묶기 — 번들 · 매니페스트 · 사이트(site/play 복사와 ?v= 찍기) ----
FROM deps AS build
# 배포 판 번호. .git 은 이미지에 넣지 않으므로 밖에서 준다(docker build --build-arg BUILD=$(git rev-parse HEAD) …).
ARG BUILD=docker
COPY . .
RUN node tools/bundle.mjs \
 && node tools/sync-manifest.mjs \
 && CI=1 GITHUB_SHA="$BUILD" bash tools/build-site.sh \
 # 체크아웃의 파일 권한(600 따위)이 이미지에 따라오면 nginx 가 403 을 낸다 — 누구나 읽게
 && chmod -R a+rX game site

# ---- 게임만 서빙 ----
FROM ${NGINX_IMAGE} AS game
COPY docker/nginx-game.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/game /usr/share/nginx/html
EXPOSE 80

# ---- 배포 사이트 — vercel.json 의 되돌려 보내기·캐시 규칙을 nginx 로 옮겼다 ----
FROM ${NGINX_IMAGE} AS site
COPY docker/nginx-site.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/site /usr/share/nginx/html
EXPOSE 80

# ---- 회귀 검사 — Playwright 공식 이미지(브라우저·글꼴이 들어 있다) ----
FROM ${PLAYWRIGHT_IMAGE} AS check
WORKDIR /app
# test:manifest 가 python3 을 부른다
RUN (command -v python3 >/dev/null || (apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*))
# 스크린샷은 이 이미지의 글꼴로 찍은 기준(tests/baseline/shots-docker)과 대조한다 — 누구 컴퓨터에서든 같게
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 CI=1 SHOTS_SET=docker
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=ca,required=false \
    if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; npm ci --no-audit --no-fund
COPY . .
CMD ["npm", "run", "check"]
