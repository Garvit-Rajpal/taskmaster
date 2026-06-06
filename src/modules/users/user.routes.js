'use strict';

const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const ctrl = require('./user.controller');
const { updateMeSchema, userIdParamSchema } = require('./user.schema');

const router = Router();

// All user routes require a valid access token.
router.use(authenticate);

router.get('/me', ctrl.getMe);
router.patch('/me', validate(updateMeSchema), ctrl.updateMe);
router.get('/:id', validate(userIdParamSchema), ctrl.getById);

module.exports = router;
