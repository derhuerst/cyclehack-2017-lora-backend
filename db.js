'use strict'

const level = require('level')
const path = require('path')

const db = level(process.env.DB || path.join(__dirname, 'data.ldb'))

module.exports = db
