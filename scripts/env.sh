#!/usr/bin/env bash

echo -e "\033[34mEnvironment...\n\033[0m";

lerna exec --parallel --scope @ethberry/framework-public-api --scope @ethberry/framework-public-ui --scope @ethberry/framework-admin-api --scope @ethberry/framework-admin-ui --scope @ethberry/framework-emailer --scope @ethberry/framework-webhooks -- cp -rf .env.sample .env.development
lerna exec --parallel --scope @ethberry/framework-public-api --scope @ethberry/framework-public-ui --scope @ethberry/framework-admin-api --scope @ethberry/framework-admin-ui --scope @ethberry/framework-emailer --scope @ethberry/framework-webhooks -- cp -rf .env.sample .env.test
lerna exec --parallel --scope @ethberry/framework-public-api --scope @ethberry/framework-public-ui --scope @ethberry/framework-admin-api --scope @ethberry/framework-admin-ui --scope @ethberry/framework-emailer --scope @ethberry/framework-webhooks -- cp -rf .env.sample .env.production

