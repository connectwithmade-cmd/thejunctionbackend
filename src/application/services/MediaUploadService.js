// services/MediaUploadService.js

const { default: GroupService } = require('./GroupService');
const { default: EventService } = require('./EventService');
const { default: FileUploadService } = require('./FileUploadService');
const { default: ServiceService } = require('./ServiceService');
const { default: StagePostService } = require('./StagePostService');


// ... etc.

class MediaUploadService {
  constructor() {
    this.fileUploadService = new FileUploadService();
  }

  async handleMediaUpload({ files, type, targetId, userId }) {
    const imageMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const videoMimes = ['video/mp4', 'video/quicktime'];

    const images = files.filter(file => imageMimes.includes(file.mimetype));
    const videos = files.filter(file => videoMimes.includes(file.mimetype));

    if (images.length > 4) throw new Error('Max 4 images allowed');
    if (videos.length > 1) throw new Error('Only 1 video allowed');

    const folderPath = `uploads/${type}/${targetId}`;
    const uploaded = [];

    for (const file of [...images, ...videos]) {
      const uniqueFileName = `${folderPath}/${uuidv4()}_${file.originalname}`;
      const uploadResult = await this.fileUploadService.uploadToS3(file.buffer, uniqueFileName, file.mimetype);
      uploaded.push({ url: uploadResult.Location, mimetype: file.mimetype });
    }

    const imageUrls = uploaded.filter(f => imageMimes.includes(f.mimetype)).map(f => f.url);
    const videoUrl = uploaded.find(f => videoMimes.includes(f.mimetype))?.url || null;

    switch (type) {
      case 'event':
        return EventService.editEvent(targetId, {
          bannerImages: imageUrls,
          bannerVideo: videoUrl,
        }, userId);

      case 'community':
        return GroupService.editGroup(targetId, {
          bannerImages: imageUrls,
        }, userId);

      case 'service':
        return ServiceService.editService(targetId, {
          bannerImages: imageUrls,
          bannerVideo: videoUrl,
        }, userId);

      case 'stagepost':
        return StagePostService.update(targetId,userId, {
          images: imageUrls,
          video: videoUrl,
        });

      default:
        throw new Error(`Unsupported upload type: ${type}`);
    }
  }
}

module.exports = MediaUploadService;
