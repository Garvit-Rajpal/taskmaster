'use strict';

const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const ctrl = require('./project.controller');
const {
  createProjectSchema,
  teamIdParamSchema,
  projectIdParamSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  projectMemberParamSchema,
} = require('./project.schema');

// Nested under /teams/:teamId/projects — needs mergeParams to read :teamId.
const teamProjectsRouter = Router({ mergeParams: true });
teamProjectsRouter.use(authenticate);
teamProjectsRouter.post('/', validate(createProjectSchema), ctrl.create);
teamProjectsRouter.get('/', validate(teamIdParamSchema), ctrl.listByTeam);

// Top-level /projects.
const projectsRouter = Router();
projectsRouter.use(authenticate);
projectsRouter.get('/:id', validate(projectIdParamSchema), ctrl.detail);
projectsRouter.patch('/:id', validate(updateProjectSchema), ctrl.update);
projectsRouter.delete('/:id', validate(projectIdParamSchema), ctrl.remove);
projectsRouter.post('/:id/members', validate(addProjectMemberSchema), ctrl.addMember);
projectsRouter.delete(
  '/:id/members/:userId',
  validate(projectMemberParamSchema),
  ctrl.removeMember
);

module.exports = { teamProjectsRouter, projectsRouter };
