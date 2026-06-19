const {
    uploadApplicationDocument,
    getDocumentsByApplication,
    getDocumentById,
    verifyApplicationDocument,
    rejectApplicationDocument,
    reuploadApplicationDocument,
    downloadApplicationDocument,
    getDocumentCompletionPercentage
} = require('../services/documentService');

/**
 * Handles multipart file upload.
 */
const upload = async (req, res) => {
    try {
        const { application_id, document_name, expiry_date } = req.body;
        const file = req.file;

        if (!application_id || !document_name) {
            return res.status(400).json({
                success: false,
                message: 'application_id and document_name are required'
            });
        }

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Please attach a file field.'
            });
        }

        const document = await uploadApplicationDocument(
            req.user.id,
            application_id,
            document_name,
            file,
            expiry_date
        );

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: document
        });
    } catch (error) {
        console.error('Error in document upload:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Lists all documents of an application.
 */
const list = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const documents = await getDocumentsByApplication(applicationId, req.user.id);

        res.json({
            success: true,
            data: documents
        });
    } catch (error) {
        console.error('Error listing application documents:', error);

        const status = error.message.includes('Access Denied') ? 403 : 500;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Gets details of a specific document.
 */
const details = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await getDocumentById(id, req.user.id);

        res.json({
            success: true,
            data: document
        });
    } catch (error) {
        console.error('Error fetching document details:', error);

        const status = error.message.includes('Access Denied') ? 403 : 404;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Verifies a document (Manager/Owner only).
 */
const verify = async (req, res) => {
    try {
        const { id } = req.params;
        const { review_comments } = req.body;

        const document = await verifyApplicationDocument(
            id,
            review_comments,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Document verified successfully',
            data: document
        });
    } catch (error) {
        console.error('Error verifying document:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Rejects a document with a reason (Manager/Owner only).
 */
const reject = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, review_comments } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'reason is required to reject a document'
            });
        }

        const document = await rejectApplicationDocument(
            id,
            reason,
            review_comments,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Document rejected successfully',
            data: document
        });
    } catch (error) {
        console.error('Error rejecting document:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Reuploads a replacement file for a document.
 */
const reupload = async (req, res) => {
    try {
        const { id } = req.params;
        const { expiry_date } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Please attach a file field.'
            });
        }

        const document = await reuploadApplicationDocument(
            req.user.id,
            id,
            file,
            expiry_date
        );

        res.status(201).json({
            success: true,
            message: 'Document version reuploaded successfully',
            data: document
        });
    } catch (error) {
        console.error('Error reuploading document:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Generates signed download URL.
 */
const download = async (req, res) => {
    try {
        const { id } = req.params;
        const signedUrl = await downloadApplicationDocument(id, req.user.id);

        res.json({
            success: true,
            message: 'Signed URL generated successfully. Valid for 5 minutes.',
            signedUrl
        });
    } catch (error) {
        console.error('Error downloading document:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Checks checklist completion metrics.
 */
const completion = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const metrics = await getDocumentCompletionPercentage(applicationId, req.user.id);

        res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Error checking checklist completion:', error);

        const status = error.message.includes('Access Denied') ? 403 : 500;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Skeletons the future ZIP exports.
 */
const exportZip = async (req, res) => {
    try {
        const { applicationId } = req.params;

        // Perform access check first before returning the mock response
        const { authorized } = await checkApplicationAccess(applicationId, req.user.id);
        if (!authorized) {
            return res.status(403).json({
                success: false,
                message: 'Access Denied: You do not have permission to export documents for this application'
            });
        }

        res.json({
            success: true,
            message: 'Bulk document export ZIP package preparation skeleton. Verified documents collection is ready to pack.',
            applicationId
        });
    } catch (error) {
        console.error('Error in export ZIP skeleton:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    upload,
    list,
    details,
    verify,
    reject,
    reupload,
    download,
    completion,
    exportZip
};
