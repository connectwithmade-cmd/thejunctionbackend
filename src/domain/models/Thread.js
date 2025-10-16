// models/Thread.js
import mongoose from 'mongoose';

const threadSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    content: { type: String, required: true },
    image: [{
        url: { type: String, required: false },
        mimeType: { type: String, required: false },
        uploadedAt: { type: Date, default: Date.now }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'User',
        required: true,
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
    }],
    createdAt: { type: Date, default: Date.now },
});

const Thread = mongoose.model('Thread', threadSchema);

export default Thread;
