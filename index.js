'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const corser = require('corser')
const boom = require('boom')
const ndjson = require('ndjson')
const pump = require('pump')
const sink = require('stream-sink')
const pick = require('lodash/pick')

const db = require('./db')

const app = express()

if (process.env.NODE_ENV === 'production') {
	const letsencrypt = require('letsencrypt-express')
	letsencrypt
		.create({
			server: 'https://acme-v01.api.letsencrypt.org/directory',
			agreeTos: true,
			email: process.env.EMAIL,
			approveDomains: ['cyclehack-2017-lora-backend.jannisr.de'],
			app
		})
		.listen(80, 443)
} else {
	app.listen(3000)
}

app.use(corser.create())
app.use(bodyParser.json())

const parseTime = (val) => {
	return Math.round(new Date(val) / 1000)
}

app.post('/measurements', (req, res, next) => {
	if (! req.body.metadata) {
		next(boom.badRequest('regpsifjwofij is missing'))
		return
	}

	const timestamp = parseTime(req.body.metadata.time)
	const key = [
		req.body.app_id,
		req.body.dev_id,
		timestamp
	].join('-')

	const val = Object.assign(
		pick(req.body, ['app_id', 'dev_id']),
		{
			latitude: req.body.payload_fields.latitude,
			longitude: req.body.payload_fields.longitude,
			pm10: req.body.payload_fields.pm10,
			pm25: req.body.payload_fields.pm25,
			timestamp: parseTime(req.body.metadata.time),
		}
	)

	db.put(key, val, (err) => {
		if (err) res.status(500).send(err.message)
		else res.status(201).send('stored')
	})
})

app.get('/measurements', (req, res, next) => {
	db.createValueStream({limit: 100, reverse: true})
	.pipe(sink.object())
	.then((vals) => {
		res.send(vals.reverse())
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
