'use strict';

const { Router } = require('express');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const ctrl = require('./task.controller');
const {
  createTaskSchema,
  taskIdParamSchema,
  updateTaskSchema,
  updateStatusSchema,
  updateAssigneeSchema,
  listTasksSchema,
} = require('./task.schema');

// Nested under /projects/:projectId/tasks.
const projectTasksRouter = Router({ mergeParams: true });
projectTasksRouter.use(authenticate);
projectTasksRouter.post('/', validate(createTaskSchema), ctrl.create);
projectTasksRouter.get('/', validate(listTasksSchema), ctrl.list);

// Top-level /tasks.
const tasksRouter = Router();
tasksRouter.use(authenticate);
tasksRouter.get('/:id', validate(taskIdParamSchema), ctrl.detail);
tasksRouter.patch('/:id', validate(updateTaskSchema), ctrl.update);
tasksRouter.delete('/:id', validate(taskIdParamSchema), ctrl.remove);
tasksRouter.patch('/:id/status', validate(updateStatusSchema), ctrl.updateStatus);
tasksRouter.patch('/:id/assignee', validate(updateAssigneeSchema), ctrl.updateAssignee);

module.exports = { projectTasksRouter, tasksRouter };
