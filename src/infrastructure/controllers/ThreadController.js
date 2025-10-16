import express from 'express';
import multer from 'multer';
import CommonResponse from '../../application/common/CommonResponse.js';
import ThreadService from "../../application/services/ThreadService.js";
// import { io } from '../../index.js';
import UserManagementService from "../../application/services/UserManagementService.js";


const userManagementService = new UserManagementService();
const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file && !file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    },
});

// Create a thread with optional image uploads
router.post('/', upload.array('images', 5), async (req, res) => {
    const { topic, content, createdBy } = req.body;
    const imageFiles = req.files || [];
    const user = await userManagementService.getUserById(createdBy);
    // const creatorModel = user?.userType;

    try {
        const newThread = await ThreadService.createThread({
            topic,
            content,
            createdBy,
            // creatorModel,
            imageFiles,
        });
        CommonResponse.success(res, newThread);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

// Get a thread by ID
router.get('/:threadId', async (req, res) => {
    const { threadId } = req.params;

    try {
        const thread = await ThreadService.getThreadById(threadId);
        if (!thread) {
            return CommonResponse.error(res, 'Thread not found', 404);
        }
        CommonResponse.success(res, thread);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

// Get all threads
router.get('/', async (req, res) => {
    try {
        const threads = await ThreadService.getAllThreads();
        CommonResponse.success(res, threads);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

// Add a comment to a thread
router.post('/:threadId/comment', async (req, res) => {
    const { threadId } = req.params;
    const { content, createdBy } = req.body;
    const user = await userManagementService.getUserById(createdBy);
    // const creatorModel = user?.userType;

    try {
        const updatedThread = await ThreadService.addCommentToThread(threadId, {
            content,
            createdBy,
            // creatorModel,
        });
        CommonResponse.success(res, updatedThread);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

export default router;
