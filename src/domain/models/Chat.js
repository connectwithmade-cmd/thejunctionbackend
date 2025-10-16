import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // <- FIXED
        required: true
    },
    content: {
        type: String,
        required: true
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
});

const chatSchema = new mongoose.Schema({
    participants: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    }],
    messages: [messageSchema],
    unreadMessageCounts: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        count: { type: Number, default: 0 }
    }],
    createdAt: { type: Date, default: Date.now }
});


const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
