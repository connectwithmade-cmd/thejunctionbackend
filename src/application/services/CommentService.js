import FileUploadService from './FileUploadService.js';
import CommentRepository from "../../infrastructure/repositories/CommentRepository.js";

class CommentService {
    async createComment(content, threadId, senderId, files) {
        let mediaUrls = [];

        if (files && files.length > 0) {
            for (let file of files) {
                try {
                    const fileBuffer = file.buffer;
                    const fileName = `${Date.now()}-${file.originalname}`;
                    const mimeType = file.mimetype;

                    const result = await FileUploadService.uploadToS3(fileBuffer, fileName, mimeType);
                    mediaUrls.push(result.Location);
                } catch (err) {
                    throw new Error('Error uploading files: ' + err.message);
                }
            }
        }

        // Create a new comment in the database
        const newMessage = await CommentRepository.createComment({
            content,
            media: mediaUrls,
            thread: threadId,
            sender: senderId,
        });

        return newMessage;
    }

    async getCommentsByThread(threadId) {
        return await CommentRepository.getCommentsByThread(threadId);
    }
}

export default new CommentService();
