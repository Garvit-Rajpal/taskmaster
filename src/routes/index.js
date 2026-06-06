'use strict';

const { Router } = require('express');

const router = Router();

// Feature routers are mounted here as they are implemented (TDD order).
router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/users', require('../modules/users/user.routes'));
router.use('/teams', require('../modules/teams/team.routes'));
router.use('/invitations', require('../modules/teams/invitation.routes'));

const { teamProjectsRouter, projectsRouter } = require('../modules/projects/project.routes');
router.use('/teams/:teamId/projects', teamProjectsRouter);
router.use('/projects', projectsRouter);

const { projectTasksRouter, tasksRouter } = require('../modules/tasks/task.routes');
router.use('/projects/:projectId/tasks', projectTasksRouter);
router.use('/tasks', tasksRouter);

const { taskCommentsRouter, commentsRouter } = require('../modules/comments/comment.routes');
router.use('/tasks/:taskId/comments', taskCommentsRouter);
router.use('/comments', commentsRouter);

const {
  taskAttachmentsRouter,
  attachmentsRouter,
} = require('../modules/attachments/attachment.routes');
router.use('/tasks/:taskId/attachments', taskAttachmentsRouter);
router.use('/attachments', attachmentsRouter);

router.use('/notifications', require('../modules/notifications/notification.routes'));

module.exports = router;
