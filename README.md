[![Build Status](https://travis-ci.org/arborchurch/arbor-web.svg?branch=master)](https://travis-ci.org/arborchurch/arbor-web)

# Arbor Church Website

This repository hosts the sources for the [Arbor Church website](https://www.arborchurchnw.org/). 

## Development

To work the site you'll need a copy of [Hugo](https://gohugo.io). Hugo is a static site generator that builds the website. Start Hugo locally by using the `run-site.sh` script.

    ./run-site.sh

Then, visit `http://localhost:1313/` to see your local copy of the site. You can experiment and make any changes you like. 

## Publishing Changes

Once you're happy with your local copy, commit the changes. [Travis CI](https://travis-ci.org/) will automatically build and deploy the site.
