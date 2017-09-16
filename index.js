'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const corser = require('corser')

const db = require('./db')

const app = express()

app.use(corser.create())
app.use(bodyParser.json())

app.post('/measurements', (req, res) => {
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

app.listen(3000)
