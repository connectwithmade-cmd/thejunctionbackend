import mongoose from 'mongoose';

const GroupPostSchema = new mongoose.Schema(
    {
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        images: [
            {
                type: String, required: false
                // url: { type: String, required: false },
                // mimeType: { type: String, required: false },
                // uploadedAt: { type: Date, default: Date.now },
            },
        ],
        comments: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'GroupPostComment',
            },
        ],
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const GroupPost = mongoose.model('GroupPost', GroupPostSchema);
export default GroupPost;
