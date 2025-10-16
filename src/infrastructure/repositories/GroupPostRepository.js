import GroupPost from "../../domain/models/GroupPost.js";


class GroupPostRepository {
    async create(data) {
        const post = new GroupPost(data);
        return post.save();
    }

    async findById(postId) {
        return GroupPost.findById(postId);
    }

    async findByGroupId(groupId) {
        return GroupPost.find({groupId: groupId});
    }

    async addCommentToPost(postId, commentId) {
        return GroupPost.findByIdAndUpdate(
            postId,
            { $push: { comments: commentId } },
            { new: true }
        );
    }
}

export default new GroupPostRepository();
