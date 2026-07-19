#!/bin/bash

rm -rf ./public
mkdir -p ./public
cp -r index.html script.js style.css ./assets/ ./public/
firebase deploy