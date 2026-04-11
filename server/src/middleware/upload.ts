import multer from 'multer';
import path from 'path';
import fs from 'fs';

const BASE_UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * Ensures a directory exists, creates it if not.
 */
const ensureDir = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
};

// ── 1. Office Note (Scanned Signed Copies) ───────────────────────────────────
export const officeNoteUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, ensureDir(path.join(BASE_UPLOAD_DIR, 'office-notes')));
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `OFFICE_NOTE_SIGNED_${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and Image files are allowed'));
        }
    }
});

// ── 2. Department Seals (Stored in public assets for access) ──────────────────
export const departmentUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            // Seals need to be in public so pdfService can find them
            cb(null, ensureDir(path.join(process.cwd(), '..', 'public', 'assets')));
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now();
            cb(null, `dept_seal_${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    }),
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit for seal images
});

// ── 3. Letters (Scanned Signed Copies) ───────────────────────────────────────
export const letterUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, ensureDir(path.join(BASE_UPLOAD_DIR, 'letters')));
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `LETTER_SIGNED_${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ── 4. MIS Ingestion (Temporary CSV Storage) ──────────────────────────────────
export const misUpload = multer({
    dest: ensureDir(path.join(BASE_UPLOAD_DIR, 'mis-temp')),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit for large CSVs
});

// ── 5. Memory Storage (Dynamic processing like Budget CSVs) ──────────────────
export const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});
