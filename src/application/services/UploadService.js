import { v4 as uuidv4 } from 'uuid';
import FileUploadService from './FileUploadService.js';
import UserManagementService from './UserManagementService.js';
import EventService from './EventService.js';
import GroupService from './GroupService.js';
import ServiceService from './ServiceService.js';

const ENTITY_MAP = {
  user: UserManagementService,
  event: EventService,
  group: GroupService,
  service: ServiceService,
};

class UploadService {
  static async uploadMedia(type, id, files) {
    const service = ENTITY_MAP[type];
    if (!service) throw new Error('Invalid entity type');

    return Promise.all(
      files.map(async (file) => {
        const key = `media/${type}s/${uuidv4()}_${file.originalname}`;
        const result = await FileUploadService.uploadToS3(file.buffer, key, file.mimetype);

        await service.updateMedia(id, result.Location); // each service should define this method
        return result;
      })
    );
  }
}

export default UploadService;
