# NFT Framework Contracts

Welcome to Framework contracts monorepo.

## Pre Install

I assume you have NodeJS NPM/YARN, Postgres, RabbitMQ and Redis installed
or, you can just use docker and docker compose :)

In any case you have to fill up sensitive keys in .env files

# This private keys starts with 0x and belongs to OWNER

```shell script
PRIVATE_KEY=
PRIVATE_KEY1=
PRIVATE_KEY2=
PRIVATE_KEY3=
```

## Install

```shell script
npm i
npm run bootstrap
npm run build
```

## DEV setup with Docker and Besu blockchain

0. Stop all containers (if any) and clean existing besu and start fresh

```shell script
docker stop $(docker ps -a -q)
docker compose down -v
rm -rf besu
docker compose up -d
```

-you will have local Besu blockchain and block explorer up and running

## Test

```shell script
npm run test
```

There is Swagger API documentation configured on http://localhost:3001/swagger

## Configuration

For fine tune check services READMEs
