import Comment from "../../domain/models/Comment.js";

class CommentRepository {
    async createComment(data) {
        const message = new Comment(data);
        return await message.save();
    }

    async getCommentsByThread(threadId) {
        return await Comment.find({ thread: threadId }).populate('sender', 'username').sort({ timestamp: -1 });
    }
}

export default new CommentRepository();
