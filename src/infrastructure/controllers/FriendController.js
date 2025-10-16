import express from 'express';
import FriendService from '../../application/services/FriendService.js';
import CommonResponse from '../../application/common/CommonResponse.js';
import UserRepositoryImpl from "../repositories/UserRepositoryImpl.js";

const router = express.Router();
const userRepository = new UserRepositoryImpl();
const friendService = new FriendService(userRepository);

// Send friend request
router.post('/friend-request', async (req, res) => {
    const { senderId, receiverId } = req.body;

    try {
        const response = await friendService.sendFriendRequest(senderId, receiverId);
        CommonResponse.success(res, response);
    } catch (err) {
        CommonResponse.error(res, err.message, 500);
    }
});

// Respond to friend request (Accept/Reject)
router.post('/friend-request/respond', async (req, res) => {
    const { receiverId, senderId, status } = req.body;

    try {
        const response = await friendService.respondToFriendRequest(receiverId, senderId, status);
        CommonResponse.success(res, response);
    } catch (err) {
        CommonResponse.error(res, err.message, 500);
    }
});

// Remove friend
router.post('/remove-friend', async (req, res) => {
    const { userId, friendId } = req.body;

    try {
        const response = await friendService.removeFriend(userId, friendId);
        CommonResponse.success(res, response);
    } catch (err) {
        CommonResponse.error(res, err.message, 500);
    }
});

// Get friends list
router.get('/:userId/friends', async (req, res) => {
    const { userId } = req.params;

    try {
        const friends = await friendService.getFriends(userId);
        CommonResponse.success(res, friends);
    } catch (err) {
        CommonResponse.error(res, err.message, 500);
    }
});

// Get friend requests
router.get('/:userId/friend-requests', async (req, res) => {
    const { userId } = req.params;

    try {
        const requests = await friendService.getFriendRequests(userId);
        CommonResponse.success(res, requests);
    } catch (err) {
        CommonResponse.error(res, err.message, 500);
    }
});

export default router;
