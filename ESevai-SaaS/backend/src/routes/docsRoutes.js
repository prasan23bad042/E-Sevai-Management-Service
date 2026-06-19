const express = require('express');
const router = express.Router();
const { getSpecJson, serveDocs } = require('../controllers/docsController');

// Serve Swagger specification JSON
router.get('/json', getSpecJson);

// Serve Swagger HTML static page viewer
router.get('/', serveDocs);

module.exports = router;
