import { Router } from 'express';
import { authMiddleware } from '@shared/index';
import * as topicController from '../controllers/topic.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Topic CRUD
router.get('/', topicController.getTopics);
router.get('/:id', topicController.getTopic);
router.post('/', topicController.createTopic);
router.put('/:id', topicController.updateTopic);
router.delete('/:id', topicController.deleteTopic);

// Topic progress
router.get('/:id/progress', topicController.getTopicProgress);

export default router;
