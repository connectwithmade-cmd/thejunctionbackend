import FileUploadService from '../services/FileUploadService.js';
import GroupPostRepository from "../../infrastructure/repositories/GroupPostRepository.js";
import GroupPostCommentRepository from "../../infrastructure/repositories/GroupPostCommentRepository.js";
import mongoose from "mongoose";

class GroupPostService {

    async getAllGroupPosts({ groupId, userId }) {
        return GroupPostRepository.findByGroupId(new mongoose.Types.ObjectId(groupId));
    }

    async createGroupPost({ groupId, content, images, userId }) {
        return GroupPostRepository.create({
            groupId: new mongoose.Types.ObjectId(groupId),
            content,
            images,
            author: userId,
        });
    }

    async editGroupPost({ postId, content, images, userId }) {
        const post = await GroupPostRepository.findById(postId);
        if (!post) throw new Error('Post not found');
        if (post.author.toString() !== userId.toString()) throw new Error('Unauthorized');

        post.content = content || post.content;
        post.images = images || post.images;

        return post.save();
    }

    async addCommentToPost({ postId, content, userId }) {
        const comment = await GroupPostCommentRepository.create({
            groupPost: postId,
            content,
            createdBy: userId,
        });

        await GroupPostRepository.addCommentToPost(postId, comment._id);

        return comment;
    }

    async editComment({ commentId, content, userId }) {
        const comment = await GroupPostCommentRepository.findById(commentId);
        if (!comment) throw new Error('Comment not found');
        if (comment.createdBy.toString() !== userId.toString()) throw new Error('Unauthorized');

        comment.content = content;

        return comment.save();
    }
}

export default new GroupPostService();
