#!/bin/sh

if [ -z "$1" ]
 then
  echo "Are you deploying a MAJOR, MINOR or PATCH update?"
  echo "Note that MAJOR updates should probably go through the Play Store"
  exit 1
 fi

npm version $1
cd src
meteor deploy ondemand --settings production.json
