const express = require('express');
const router = express.Router();
const multer = require('multer');

const {
    authenticateUser
} = require('../middleware/authMiddleware');

const {
    authorizeRoles
} = require('../middleware/roleMiddleware');

const {
    upload: uploadController,
    list,
    details,
    verify,
    reject,
    reupload,
    download,
    completion,
    exportZip
} = require('../controllers/documentController');

// Multer in-memory storage buffer configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB maximum file size limit
    }
});

// 1. Upload a new document (Multipart upload)
router.post(
    '/upload',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    upload.single('file'),
    uploadController
);

// 2. List all documents and checklists of an application
router.get(
    '/application/:applicationId',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    list
);

// 3. Retrieve document completion metrics
router.get(
    '/application/:applicationId/completion',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    completion
);

// 4. Export ZIP archive of all documents skeleton
router.get(
    '/application/:applicationId/export',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    exportZip
);

// 5. Download document via signed URL
router.get(
    '/:id/download',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    download
);

// 6. Get metadata details of a specific document
router.get(
    '/:id',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    details
);

// 7. Verify a document (Restricted to managers, owners, and admins)
router.put(
    '/:id/verify',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    verify
);

// 8. Reject a document with reason (Restricted to managers, owners, and admins)
router.put(
    '/:id/reject',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager'),
    reject
);

// 9. Reupload replacement file (Creates new version, updates checklist pointer)
router.post(
    '/:id/reupload',
    authenticateUser,
    authorizeRoles('platform_admin', 'center_owner', 'manager', 'staff'),
    upload.single('file'),
    reupload
);

module.exports = router;
