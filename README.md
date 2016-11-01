# Arbor Church Website

This repository hosts the sources for the Arbor Church website. 

## Development

To work the site you'll need a copy of [Hugo](https://gohugo.io). Hugo is a static site generator that builds the website. Start Hugo locally by using the `run-site.sh` script.

    ./run-site.sh

Then, visit `http://localhost:1313/` to see your local copy of the site. You can experiment and make any changes you like. 

## Making Changes

TBD

## Publishing Changes

Once you're happy with your change you can run the `publish-site.sh` script to send that change to the public site.

    ./publish-site.sh

This will rebuild the site and publish the rebuilt site to DreamHost.

TODO: Integrate with Jenkins CI to automatically rebuild and deploy after commits.
