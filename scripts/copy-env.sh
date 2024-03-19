#!/usr/bin/env bash

echo -e "\033[34mCopy test env files to the services folders...\n\033[0m";

set -e # this will cause the shell to exit immediately if any command exits with a nonzero exit value.

cp -rf $PWD/contracts/core/.env.sample $PWD/contracts/core/.env.test

echo -e "\033[34mAll done!\n\033[0m";


