'use strict'

const letsencrypt = require('letsencrypt-express')
const express = require('express')
const bodyParser = require('body-parser')
const corser = require('corser')
const boom = require('boom')
const ndjson = require('ndjson')
const pump = require('pump')
const sink = require('stream-sink')

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
.listen(process.env.HTTP_PORT || 80, process.env.HTTPS_PORT || 443)

app.use(corser.create())
app.use(bodyParser.json())

app.post('/measurements', (req, res, next) => {
	if (! req.body.metadata) {
		next(boom.badRequest('regpsifjwofij is missing'))
		return
	}

	const timestamp = Math.round(new Date(req.body.metadata.time) / 1000)
	const key = [
		req.body.app_id,
		req.body.dev_id,
		timestamp
	].join('-')

	db.put(key, req.body, (err) => {
		if (err) res.status(500).send(err.message)
		else res.status(201).send('stored')
	})
})

app.get('/measurements', (req, res, next) => {
	db.createValueStream({limit: 100})
	.pipe(sink.object())
	.then((vals) => {
		res.json(vals)
	})
	.catch(next)
})

app.get('/measurements/all', (req, res, next) => {
	pump(
		db.createValueStream(),
		ndjson.serialize(),
		res,
		next
	)
})

app.use((err, req, res, next) => {
	res.status(err.output.statusCode || 500).send(err.message || 'Unknown error')
})
