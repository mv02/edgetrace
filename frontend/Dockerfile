# File: frontend/Dockerfile
# Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
# Description: Dockerfile for building the frontend container image.

FROM node:23 AS build
WORKDIR /code
COPY ./package.json ./pnpm-lock.yaml ./
RUN corepack enable
RUN corepack use pnpm
RUN pnpm install --frozen-lockfile
COPY . .

FROM build AS prod
RUN pnpm run build
# TODO
CMD ["pnpm", "run", "dev", "--host"]

FROM build AS dev
CMD ["pnpm", "run", "dev", "--host"]
