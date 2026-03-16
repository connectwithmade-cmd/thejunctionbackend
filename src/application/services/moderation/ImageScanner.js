import vision from "@google-cloud/vision";

const client = new vision.ImageAnnotatorClient();

class ImageScanner {

 async scan(images){

   if(!images || images.length === 0) return 0;

   let highest = 0;

   for(const img of images){

     const [result] = await client.safeSearchDetection(img);

     const safe = result.safeSearchAnnotation;

     const levels = {
       UNKNOWN:0,
       VERY_UNLIKELY:0.1,
       UNLIKELY:0.2,
       POSSIBLE:0.5,
       LIKELY:0.8,
       VERY_LIKELY:0.95
     };

     const risk = Math.max(
       levels[safe.adult],
       levels[safe.violence],
       levels[safe.racy]
     );

     highest = Math.max(highest,risk);
   }

   return highest;
 }

}

export default new ImageScanner();