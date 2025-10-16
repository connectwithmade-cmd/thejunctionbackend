import mongoose from 'mongoose';

const groupPostCommentSchema = new mongoose.Schema({
    content: { type: String, required: true },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    groupPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GroupPost',
        required: true,
    },
    createdAt: { type: Date, default: Date.now },
});

const GroupPostComment = mongoose.model('GroupPostComment', groupPostCommentSchema);

export default GroupPostComment;
