import { registerNotification } from '../../application/services/NotificationService.js'; // adjust path as needed


class FriendService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }


async sendFriendRequest(senderId, receiverId) {
  try {
    const receiver = await this.userRepository.findById(receiverId);
    if (!receiver) throw new Error('Receiver not found.');

    const alreadyRequested = receiver.friendRequests.some(
      (request) => request.from.toString() === senderId
    );
    if (alreadyRequested) throw new Error('Friend request already sent.');

    if (receiver.friends.includes(senderId)) {
      throw new Error('User is already your friend.');
    }

    // Add friend request
    await this.userRepository.pushToField(receiverId, 'friendRequests', { from: senderId });

    // Send notification to receiver
    await registerNotification({
      type: 'friend_request',
      title: 'New Friend Request',
      message: 'You have received a new friend request.',
      receiverId,
      senderId,
      metadata: { senderId }
    });

    return { message: 'Friend request sent successfully.' };
  } catch (error) {
    throw new Error(`Failed to send friend request: ${error.message}`);
  }


    }

    async respondToFriendRequest(receiverId, senderId, status) {
        try {
            if (!['accepted', 'rejected'].includes(status)) {
                throw new Error('Invalid status. Use "accepted" or "rejected".');
            }

            const receiver = await this.userRepository.findById(receiverId);

            if (!receiver) throw new Error('Receiver not found.');

            const request = receiver.friendRequests.find(
                (req) => req.from.toString() === senderId
            );

            if (!request) throw new Error('Friend request not found.');

            if (status === 'accepted') {
                await this.userRepository.pushToField(receiverId, 'friends', senderId);
                await this.userRepository.pushToField(senderId, 'friends', receiverId);

                
      // ✅ Send notification to sender that request was accepted
      await registerNotification({
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: `${receiver.name || 'Someone'} accepted your friend request.`,
        receiverId: senderId, // notify the sender
        senderId: receiverId, // person who accepted
        metadata: { receiverId }
      });
    
            }

            await this.userRepository.pullFromField(receiverId, 'friendRequests', { from: senderId });
            return { message: `Friend request ${status} successfully.` };
        } catch (error) {
            throw new Error(`Failed to respond to friend request: ${error.message}`);
        }
    }

    async removeFriend(userId, friendId) {
        try {
            const user = await this.userRepository.findById(userId);

            if (!user || !user.friends.includes(friendId)) {
                throw new Error('Friend not found.');
            }

            await this.userRepository.pullFromField(userId, 'friends', friendId);
            await this.userRepository.pullFromField(friendId, 'friends', userId);

            return { message: 'Friend removed successfully.' };
        } catch (error) {
            throw new Error(`Failed to remove friend: ${error.message}`);
        }
    }

    async getFriends(userId) {
        try {
            const friends = await this.userRepository.findFriends(userId);
            return friends;
        } catch (error) {
            throw new Error(`Failed to fetch friends: ${error.message}`);
        }
    }

    async getFriendRequests(userId) {
        try {
            const friendRequests = await this.userRepository.findFriendRequests(userId);
            return friendRequests;
        } catch (error) {
            throw new Error(`Failed to fetch friend requests: ${error.message}`);
        }
    }
}

export default FriendService;
