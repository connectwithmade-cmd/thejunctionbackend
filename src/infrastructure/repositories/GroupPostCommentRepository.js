import GroupPostComment from "../../domain/models/GroupPostComment.js";

class GroupPostCommentRepository {
    async create(data) {
        const comment = new GroupPostComment(data);
        return comment.save();
    }

    async findById(commentId) {
        return GroupPostComment.findById(commentId);
    }
}

export default new GroupPostCommentRepository();
