'use strict';
require('dotenv').config();
const odm = require('./lib/pg-odm');
const Term = require('./models/Term');

(async () => {
  await odm.connect();
  const terms = await Term.find({});
  terms.forEach(t => console.log(t.name, t.code, 'year:', t.academicYear, '_id:', t._id));
  await odm.disconnect();
})();
