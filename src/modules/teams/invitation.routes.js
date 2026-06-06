'use strict';

const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const ctrl = require('./team.controller');
const { acceptInviteSchema } = require('./team.schema');

const router = Router();
router.use(authenticate);

router.post('/:token/accept', validate(acceptInviteSchema), ctrl.acceptInvite);

module.exports = router;
