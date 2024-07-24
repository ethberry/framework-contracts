#!/usr/bin/env bash
 echo -e "\033[34mTesting...\n\033[0m";
 set -e # this will cause the shell to exit immediately if any command exits with a nonzero exit value.

 export NODE_ENV=$NODE_ENV
 export BUSINESS_TYPE=$BUSINESS_TYPE
 export POSTGRES_URL=$POSTGRES_URL
 export CHAIN_ID=$CHAIN_ID
 export GEMUNION_API_KEY=$GEMUNION_API_KEY

 export PRIVATE_KEY=$PRIVATE_KEY
 export GEMUNION_PRIVATE_KEY_STAGE=$GEMUNION_PRIVATE_KEY_STAGE
 export GEMUNION_PRIVATE_KEY_PROD=$GEMUNION_PRIVATE_KEY_PROD

# lerna bootstrap --concurrency 1 --hoist --ignore-scripts

# DEV ONLY !!!
# export $(cat ./.env.test | sed 's/#.*//g' | xargs)

# lerna run build --concurrency 1
#
# lerna exec --scope @framework/admin-api -- npm run test
# lerna exec --scope @framework/market-api -- npm run test
# lerna exec --scope @framework/mobile-api -- npm run test
#
## should test only if changes there
# if [ "$TEST_CONTRACTS" == "true" ]; then
#     echo -e "\033[34mTesting CONTRACTS...\n\033[0m";
#     lerna exec --scope @framework/core-contracts -- npm run test
# else
#     echo -e "\033[34m SKIP Testing CONTRACTS...\n\033[0m";
# fi
