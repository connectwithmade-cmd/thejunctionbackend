import '../dnsfix.js';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectDB from './infrastructure/database/MongoDB.js';
import bodyParser from 'body-parser';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import passport from './application/services/GoogleAuthService.js';
import CommonResponse from "./application/common/CommonResponse.js";
import authController from './infrastructure/controllers/AuthController.js';
import profileController from './infrastructure/controllers/ProfileController.js';
import friendController from './infrastructure/controllers/FriendController.js';
import postsController from './infrastructure/controllers/ThreadController.js';
import groupController from './infrastructure/controllers/GroupController.js';
import eventController from './infrastructure/controllers/EventController.js';
import serviceController from './infrastructure/controllers/ServiceController.js';
import stagepostController from './infrastructure/controllers/StagePostController.js';
import ticketController from './infrastructure/controllers/TicketController.js';
import bookingController from './infrastructure/controllers/BookingController.js';
import uploadController from './infrastructure/controllers/UploadController.js';

import chatController, {
    getReceiverSocketId,
    handleSendMessage,
    userSocketMap,findChatsByUser,streamMessages
} from './infrastructure/controllers/ChatController.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO server with Express HTTP server
const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const corsOptions = {
    origin: process.env.ALLOWED_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
};

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authController);
app.use('/api/account', profileController);
app.use('/api/users', profileController);
app.use('/api/friend', friendController);
app.use('/api/posts', postsController);
app.use('/api/chat', chatController);
app.use('/api/groups', groupController);
app.use('/api/events', eventController);
app.use('/api/services', serviceController);
app.use('/api/stageposts', stagepostController);
app.use('/api/tickets', ticketController);
app.use('/api/bookings', bookingController);
app.use('/api/media', uploadController);

// Socket.IO Connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Register user by their userId (sent via query string or headers)
    socket.on('registerUser', (userId) => {
        userSocketMap[userId] = socket.id;
        console.log(`User ${userId} connected with socket ID: ${socket.id}`);
    });


     // Handle the 'getMessages' event (to start streaming messages)
    socket.on('getMessages', async (chatId, page = 1) => {
        try {
            const messages = await streamMessages(chatId, page);
            socket.emit('messages', messages, page);  // Emit the messages to the client
        } catch (err) {
            console.error('Error streaming messages:', err);
            socket.emit('error', 'Error fetching messages');
        }
    });


    // Handle the 'getUserChats' event to stream all chats for a user
socket.on('getUserChats', async ({ userId, page = 1, limit = 10 }) => {
    console.log('getUserChats hit');
    try {
        const chats = await findChatsByUser(userId, page, limit);
        socket.emit('userChats', chats);
        console.log('User chats streamed:', chats);
    } catch (err) {
        console.error('Error streaming user chats:', err);
        socket.emit('error', 'Error fetching user chats');
    }
});



    // Listen for 'sendMessage' events from users
    socket.on('sendMessage', async (data) => {
  const { senderId, chatId, content } = data;
  handleSendMessage(socket, data, io);

  try {
    const participants = await getReceiverSocketId(chatId);

    if (participants) {
      participants.forEach((participant) => {
        const receiverSocketId = userSocketMap[participant.userId];

        if (receiverSocketId) {
          // Emit to each participant, including sender
          io.to(receiverSocketId).emit('newMessageNotification', {
            senderId,
            chatId,
            content,
            recipientId: participant.userId,
            notification: 'You have a new message!',
          });

          console.log(`Notification sent to ${participant.userId} in chat ${chatId}`);
        } else {
          console.log(`User ${participant.userId} is not online`);
        }
      });
    } else {
      console.log(`No participants found for chat ID: ${chatId}`);
    }

  } catch (err) {
    console.error('Error sending message notification:', err);
  }
});


    // Handle user disconnections and clean up userSocketMap
    socket.on('disconnect', () => {
        for (let userId in userSocketMap) {
            if (userSocketMap[userId] === socket.id) {
                delete userSocketMap[userId]; // Remove the disconnected user from the map
                console.log(`User ${userId} disconnected and removed from map`);
                break;
            }
        }
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err);
    CommonResponse.error(res, err);
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});