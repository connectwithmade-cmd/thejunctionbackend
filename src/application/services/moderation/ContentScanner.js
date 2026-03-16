import TextScanner from "./TextScanner.js";
import ImageScanner from "./ImageScanner.js";

class ContentScanner {

 async scan(content){

   const text = `${content.title || ""} ${content.description || ""}`;

   const textRisk = await TextScanner.scan(text);

   const imageRisk = await ImageScanner.scan(content.images);

   return Math.max(textRisk,imageRisk);
 }

}

export default new ContentScanner();