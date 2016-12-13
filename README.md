[![Build Status](https://travis-ci.org/arborchurch/arbor-web.svg?branch=master)](https://travis-ci.org/arborchurch/arbor-web)

# Arbor Church Website

This repository hosts the sources for the [Arbor Church website](https://www.arborchurchnw.org/). 

## Development

Making small edits to the site is possible right on Github by clicking the Edit icon in the upper right of the file you want to edit.

To do any nontrivial work on the site, however, you'll want a copy of [Hugo](https://gohugo.io). Hugo is a static site generator that builds the website. Start Hugo locally by using the `run-site.sh` script.

    ./run-site.sh

Then, visit `http://localhost:1313/` to see your local copy of the site. You can experiment and make any changes you like. 

## Publishing Changes

Once you're happy with your local copy, commit the changes. [Travis CI](https://travis-ci.org/) will automatically build and deploy the site. You don't need to worry about how this works, but if you're curious or need to reconfigure, you can read more about it here:

[Deploying Hugo with Travis CI](https://jmcphers.github.io/hugo/web/development/2016/11/09/hugo-and-travis.html)

