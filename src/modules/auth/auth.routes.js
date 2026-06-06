'use strict';

const { Router } = require('express');
const validate = require('../../middleware/validate');
const { authLimiter } = require('../../middleware/rateLimiter');
const ctrl = require('./auth.controller');
const { registerSchema, loginSchema, refreshSchema } = require('./auth.schema');

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.post('/logout', validate(refreshSchema), ctrl.logout);

module.exports = router;
