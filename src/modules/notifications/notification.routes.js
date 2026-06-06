'use strict';

const { Router } = require('express');
const { z } = require('zod');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const ctrl = require('./notification.controller');

const idParamSchema = { params: z.object({ id: z.string().uuid('Invalid notification id') }) };

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.patch('/:id/read', validate(idParamSchema), ctrl.markRead);

module.exports = router;
