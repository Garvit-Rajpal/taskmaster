'use strict';

const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const ctrl = require('./team.controller');
const {
  createTeamSchema,
  updateTeamSchema,
  teamIdParamSchema,
  addMemberSchema,
  memberParamSchema,
  inviteSchema,
} = require('./team.schema');

const router = Router();
router.use(authenticate);

router.post('/', validate(createTeamSchema), ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', validate(teamIdParamSchema), ctrl.detail);
router.patch('/:id', validate(updateTeamSchema), ctrl.update);
router.delete('/:id', validate(teamIdParamSchema), ctrl.remove);

router.post('/:id/members', validate(addMemberSchema), ctrl.addMember);
router.delete('/:id/members/:userId', validate(memberParamSchema), ctrl.removeMember);

router.post('/:id/invitations', validate(inviteSchema), ctrl.invite);

module.exports = router;
