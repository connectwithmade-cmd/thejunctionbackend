import express from 'express';
import CommonResponse from '../../application/common/CommonResponse.js';
import ChatService from '../../application/services/ChatService.js';
import UserManagementService from "../../application/services/UserManagementService.js";
import Chat from "../../domain/models/Chat.js";

// import {io} from "../../index.js";

const router = express.Router();
const userManagementService = new UserManagementService();
export const userSocketMap = {};

router.post('/initiate', async (req, res) => {
    const { userId1, userId2 } = req.body;
    try {
        const chat = await ChatService.initiateChat(userId1, userId2);
        CommonResponse.success(res, chat);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const chats = await ChatService.getUserChats(userId, page, limit);
        CommonResponse.success(res, chats);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});


router.get('/:chatId', async (req, res) => {
    const { chatId } = req.params;
    try {
        const chat = await ChatService.getChatById(chatId);
        CommonResponse.success(res, chat);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

router.get('/:chatId/messages', async (req, res) => {
    const { chatId } = req.params;
    const page = parseInt(req.query.page) || 1;
    try {
        const messages = await ChatService.streamMessages(chatId, page);
        CommonResponse.success(res, messages);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

router.post('/:chatId/message', async (req, res) => {
    const { chatId } = req.params;
    const { senderId, content } = req.body;
    try {
        const updatedChat = await ChatService.addMessage(chatId, senderId, content);
        CommonResponse.success(res, updatedChat);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

router.post('/:chatId/read', async (req, res) => {
    const { chatId } = req.params;
    const { userId } = req.body;

    try {
        const updatedChat = await ChatService.markChatAsRead(chatId, userId);
        CommonResponse.success(res, updatedChat);
    } catch (err) {
        CommonResponse.error(res, err.message, 400);
    }
});

export async function markChatAsRead(chatId, userId) {
    return ChatRepository.markChatAsRead(chatId, userId);
}


export async function findChatsByUser(userId) {
    const chats = await Chat.find({ 'participants.userId': userId })
        .populate({
            path: 'participants.userId',
            select: 'name _id userName email' // add any needed fields
        })
        .lean();

    const chatSummaries = chats.map(chat => {
        const otherParticipant = chat.participants.find(
            p => p.userId._id.toString() !== userId.toString()
        );

        const lastMessage = chat.messages.length > 0
            ? chat.messages[chat.messages.length - 1]
            : null;

        return {
            chatId: chat._id,
            otherUser: otherParticipant ? otherParticipant.userId : null, // ✅ full populated user object
            lastMessage: lastMessage ? {
                content: lastMessage.content,
                sentAt: lastMessage.sentAt,
                sender: lastMessage.sender // optionally populate sender too
            } : null
        };
    });

    return chatSummaries;
}



const MESSAGES_PER_PAGE = 20;

export async function streamMessages(chatId, page = 1) {
    // Ensure page is positive integer
    page = Math.max(1, parseInt(page));

    // Fetch the chat document with only the messages slice for the requested page
    // Using Mongoose's $slice to paginate messages array
    const chat = await Chat.findById(chatId)
        .select({
            messages: {
                $slice: [-(page * MESSAGES_PER_PAGE), MESSAGES_PER_PAGE]
            }
        })
        .lean();

    if (!chat) {
        throw new Error('Chat not found');
    }

    // Messages are sliced from the end (most recent)
    // Reverse to show oldest first in the page
    const pagedMessages = (chat.messages || []).reverse();

    // Optional: Map or format messages as needed before returning
    const formattedMessages = pagedMessages.map(msg => ({
        _id: msg._id,
        content: msg.content,
        sender: msg.sender,      // userId or ref
        sentAt: msg.sentAt,
        // Add other fields if needed
    }));

    return formattedMessages;
}



export async function handleSendMessage(socket, data, io) {
    const { chatId, senderId, content } = data;
    try {
        const updatedChat = await ChatService.addMessage(chatId, senderId, content);
        const newMessage = updatedChat.messages[updatedChat.messages.length - 1];
    } catch (err) {
        console.error('Error sending message:', err);
        socket.emit('errorMessage', 'Failed to send message');
    }
}

// Helper function to get the socket IDs of participants in a chat
export async function getReceiverSocketId(chatId) {
    try {
        const chat = await ChatService.getChatById(chatId);
        if (chat) {
            return chat.participants;
        } else {
            console.log(`Chat ${chatId} not found.`);
            return null;
        }
    } catch (err) {
        console.error('Error fetching chat participants:', err);
        return null;
    }
}


export default router;
