/**
    @overview Adds tags @rqtResource and @rqtHelper, which are used to organize the sidenav.
    @module plugins/rqtResource
    @author Brett Beutell
 */
'use strict'

// const logger = require('jsdoc/util/logger')

exports.defineTags = function (dictionary) {
  dictionary.defineTag('rqtResource', {
    mustHaveValue: true,
    canHaveType: false,
    canHaveName: false,
    onTagged: function (doclet, tag) {
      doclet.rqtResource = tag.value
    }
  })
  dictionary.defineTag('rqtHelper', {
    mustHaveValue: false,
    canHaveType: false,
    canHaveName: false,
    onTagged: function (doclet, tag) {
      doclet.rqtHelper = true
    }
  })
  dictionary.defineTag('rqtError', {
    mustHaveValue: false,
    canHaveType: false,
    canHaveName: false,
    onTagged: function (doclet, tag) {
      doclet.rqtError = true
    }
  })
}

exports.handlers = {
  processingComplete(e) {
    // const doclets = e.doclets
    // console.log(doclets.map(d => d.kind).filter((a, b, c) => b === c.indexOf(a)))
    // console.log(doclets.filter(d => d.kind === 'class' && !d.undocumented))
  }
}
