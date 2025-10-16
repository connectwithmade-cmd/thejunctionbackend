import Chat from "../../domain/models/Chat.js";

class ChatRepository {
    static async findChatByParticipants(participant1, participant2) {
        return Chat.findOne({
            participants: {
                $all: [
                    { userId: participant1 },
                    { userId: participant2 },
                ],
            },
        });
    }

    static async createChat(participants) {
        const chat = new Chat({ participants, messages: [] });
        return chat.save();
    }

  static async findChatsByUser(userId) {
    const chats = await Chat.find({ 'participants.userId': userId })
        .populate({
            path: 'participants.userId',
            select: 'name'
        })
        .lean();

    const chatSummaries = chats.map(chat => {
        const otherParticipant = chat.participants.find(p => p.userId._id.toString() !== userId.toString());
        const senderName = otherParticipant ? `${otherParticipant.userId.name}` : 'Unknown';
        const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;

        return {
                        
            //unreadMessageCount: chat.unreadMessageCount,
            chatId: chat._id,
            senderName: senderName,
            lastMessage: lastMessage ? {
                content: lastMessage.content,
                sentAt: lastMessage.sentAt,
                sender: lastMessage.sender
            } : null
        };
    });

    return chatSummaries;
}



static async streamMessages(chatId, page = 1) {
    // Ensure page is positive integer
    page = Math.max(1, parseInt(page));

    // Fetch the chat document with only the messages slice for the requested page
    // Using Mongoose's $slice to paginate messages array
    const chat = await Chat.findById(chatId)
        .select({
            messages: {
                $slice: [-(page * MESSAGES_PER_PAGE), 20]
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




    static async findChatById(chatId) {
        return Chat.findById(chatId);
    }

    static async updateChat(chat) {
        return chat.save();
    }

    static async streamMessages(chatId, page = 1) {
    const chat = await Chat.findById(chatId, { messages: { $slice: [-20 * page, 20] } });

    if (!chat) return null;

    const totalMessages = chat.messages.length;
    const startIndex = Math.max(0, totalMessages - (page * 20));
    const paginatedMessages = chat.messages.slice(startIndex, startIndex + 20);

    return paginatedMessages;
}
static async markChatAsRead(chatId, userId) {
    const chat = await Chat.findById(chatId);
    if (!chat) throw new Error('Chat not found');

    const entry = chat.unreadMessageCounts.find(c => c.userId.toString() === userId.toString());
    if (entry) {
        entry.count = 0;
    }

    return chat.save();
}


}




export default ChatRepository;
