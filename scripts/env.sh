#!/usr/bin/env bash

echo -e "\033[34mEnvironment...\n\033[0m";

lerna exec --parallel --scope @gemunion/framework-public-api --scope @gemunion/framework-public-ui --scope @gemunion/framework-admin-api --scope @gemunion/framework-admin-ui --scope @gemunion/framework-emailer --scope @gemunion/framework-webhooks -- cp -rf .env.sample .env.development
lerna exec --parallel --scope @gemunion/framework-public-api --scope @gemunion/framework-public-ui --scope @gemunion/framework-admin-api --scope @gemunion/framework-admin-ui --scope @gemunion/framework-emailer --scope @gemunion/framework-webhooks -- cp -rf .env.sample .env.test
lerna exec --parallel --scope @gemunion/framework-public-api --scope @gemunion/framework-public-ui --scope @gemunion/framework-admin-api --scope @gemunion/framework-admin-ui --scope @gemunion/framework-emailer --scope @gemunion/framework-webhooks -- cp -rf .env.sample .env.production

