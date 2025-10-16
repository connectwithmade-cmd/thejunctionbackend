import FileUploadService from '../services/FileUploadService.js';
import ThreadRepository from "../../infrastructure/repositories/ThreadRepository.js";
import CommentRepository from "../../infrastructure/repositories/CommentRepository.js";  // Your existing FileUploadService

class ThreadService {
    // Create a new thread
    async createThread({ topic, content, createdBy, imageFiles }) {
        let images = [];

        if (imageFiles && imageFiles.length > 0) {
            for (let file of imageFiles) {
                const uploadedImage = await FileUploadService.uploadToS3(file.buffer, file.originalname, file.mimetype);
                images.push({
                    url: uploadedImage.Location,
                    mimeType: file.mimetype
                });
            }
        }

        const newThread = await ThreadRepository.createThread({
            topic,
            content,
            createdBy,
            // creatorModel,
            image: images,
        });

        return newThread;
    }

    // Add a comment to a thread
    async addCommentToThread(threadId, { content, createdBy }) {
        // Create the comment
        const newComment = await CommentRepository.createComment({
            content,
            createdBy,
            // creatorModel,
            thread: threadId,
        });

        // Add the comment reference to the thread
        const updatedThread = await ThreadRepository.addCommentToThread(threadId, newComment._id);
        return updatedThread;
    }

    // Get all threads
    async getAllThreads() {
        return await ThreadRepository.getAllThreads();
    }

    // Get a thread by ID
    async getThreadById(threadId) {
        return await ThreadRepository.getThreadById(threadId);
    }
}

export default new ThreadService();
