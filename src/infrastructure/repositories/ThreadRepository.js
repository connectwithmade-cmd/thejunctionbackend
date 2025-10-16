import Thread from "../../domain/models/Thread.js";

class ThreadRepository {
    // Create a new thread
    async createThread({ topic, content, createdBy, image }) {
        const newThread = new Thread({
            topic,
            content,
            createdBy,
            image,
        });
        return await newThread.save();
    }

    // Add comment to thread
    async addCommentToThread(threadId, commentId) {
        const thread = await Thread.findById(threadId);
        if (!thread) throw new Error('Thread not found');
        thread.comments.push(commentId);
        return await thread.save();
    }

    // Get a thread by ID
    async getThreadById(threadId) {
        return await Thread.findById(threadId).populate('comments');
    }

    // Get all threads
    async getAllThreads() {
        return await Thread.find().populate('comments');
    }
}

export default new ThreadRepository();
