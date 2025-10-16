import multer from 'multer';
import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';

import CommonResponse from '../../application/common/CommonResponse.js';
import ServiceService from '../../application/services/ServiceService.js';
import UserRepositoryImpl from "../repositories/UserRepositoryImpl.js";
import GroupService from '../../application/services/GroupService.js';
import EventService from '../../application/services/EventService.js';

const router = express.Router();
const userRepository = new UserRepositoryImpl();

const upload = multer({ storage: multer.memoryStorage() });
router.post('/:type/:id/media', upload.array('files'), passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const userId = req.user?.id;
    console.log("userId", userId);

    try {
      const { type, id } = req.params;
      const files = req.files;

      if (!files || files.length === 0) {
        return CommonResponse.error(res, 'No files uploaded', 400);
      }

      let result = [];

      // Handle different types of media
        // Loop through files, handle each type
      for (const file of files) {
        switch (type) {
          case 'user':
            result.push(await userRepository.updateProfilePicture(id, file));
            break;
          case 'group':
            result.push(await GroupService.addBannerImage(id, file, userId));
            break;
          case 'service':
            const serviceFileUrls = await ServiceService.addServiceMedia(id, files, userId);  // Pass all files
            result.push(serviceFileUrls);  
            break;
          case 'event':
            // Handle event media once and break out of the entire loop
            const eventFileUrls = await EventService.addEventMedia(id, files, userId);  // Pass all files
            result.push(eventFileUrls);  // Add the updated URLs to the result
            break;
        }

        // Break out of the loop after handling event case
        if (type === 'event'|| type==='service') {
          break;  // This will stop the loop after the event is processed
        }
      }

      return CommonResponse.success(res, result);
    } catch (error) {
      console.error(error);
      return CommonResponse.error(res, error.message || 'Error uploading files', 500);
    }
  });



export default router;
