'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { globalSearch } = require('../controllers/searchController');

router.use(requireAuth);

router.get('/search', globalSearch);

module.exports = router;
