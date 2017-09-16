'use strict'

const letsencrypt = require('letsencrypt-express')
const express = require('express')
const bodyParser = require('body-parser')
const corser = require('corser')
const boom = require('boom')

const db = require('./db')

const app = express()

letsencrypt
.create({
	server: 'https://acme-v01.api.letsencrypt.org/directory',
	agreeTos: true,
	email: process.env.EMAIL,
	approveDomains: ['cyclehack-2017-lora-backend.jannisr.de'],
	app
})
.listen(80, 443)

app.use(corser.create())
app.use(bodyParser.json())

app.post('/measurements', (req, res, next) => {
	if (! req.body.metadata) {
		next(boom.badRequest('metadata is missing'))
		return
	}

	const timestamp = Math.round(new Date(req.body.metadata.time) / 1000)
	const key = [
		req.body.app_id,
		req.body.dev_id,
		timestamp
	].join('-')
	const val = JSON.stringify(req.body)

	db.put(key, val, (err) => {
		if (err) res.status(500).send(err.message)
		else res.status(201).send('stored')
	})
})

app.use((err, req, res, next) => {
	res.status(err.output.statusCode || 500).send(err.message || 'Unknown error')
})
