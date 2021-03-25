const path = require('path')
const express = require('express')
const app = express()

app.use(express.static(path.join(__dirname, 'docs')))

app.listen(61108, () => console.log('Serving docs on port 61108'))
