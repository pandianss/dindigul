import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Saves a base64 encoded image to the uploads/photos directory and returns the public URL.
 * @param base64Data The base64 string, optionally with data URL prefix.
 * @returns The relative public URL to the saved image.
 */
export const saveBase64Image = (base64Data: string): string => {
    if (!base64Data || typeof base64Data !== 'string') {
        throw new Error('Invalid image data');
    }

    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB safety cap

    const fileName = `${uuidv4()}.jpg`;
    const photosDir = path.join(process.cwd(), 'uploads', 'photos');

    if (!fs.existsSync(photosDir)) {
        fs.mkdirSync(photosDir, { recursive: true });
    }

    const filePath = path.join(photosDir, fileName);
    const data = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(data, 'base64');

    if (buffer.length > MAX_BYTES) {
        throw new Error('Image too large');
    }

    fs.writeFileSync(filePath, buffer);
    return `uploads/photos/${fileName}`;
};
