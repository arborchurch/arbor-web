#!/bin/bash

cd site 

# clean up existing public site contents, if any
rm -rf public

# generate new site to public folder
echo Generating site
echo ---------------
hugo --theme=arbor 

# copy site contents to production
echo Publishing site
echo ---------------
cd public
scp -r * arborchurch@arborchurchnw.org:arborchurchnw.org

