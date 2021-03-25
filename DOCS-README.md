# Updating the Documentation

This repo uses JSDoc with a custom plugin and template.

To serve the docs, install dependencies and run `yarn docs:serve`.

While working on the docs, you'll probably want to run `yarn docs:dev`, to enable automatic recompiles on file changes.

## Documenting new features

We use custom JSDoc tags to organize our documentation website.

### `@rqtResource <resource-name>`

Add this to doclets that should show up under a specific `<resource-name>` in the "Api Resources" section of the side-nav.

### `@rqtHelper` 

Add this to doclets that should show up in the "Helper" section of the side-nav.

### `@rqtError`

Add this to doclets that should show up in the "Error" section of the side-nav.

## Adding a Tutorial

Write the tutorial in `jsdoc/tutorials`. Update the json file in that folder to set its title and sort order in the nav.

## Customizing the Site

This site is a modified version of the default jsdoc site template.

- Custom CSS is in `jsdoc/templates/reaqta/static/styles/reaqta-docs.css`.

- Custom javascript is in `jsdoc/templates/reaqta/static/scripts/reaqta-docs.js`.

- The `jsdoc/templates/reaqta/publish.js` script parses data before passing it to templates.

- Templates for various UI components are in `jsdoc/templates/reaqta/tmpl`