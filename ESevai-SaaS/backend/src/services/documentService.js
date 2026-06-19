const supabase = require('../config/supabase');
const crypto = require('crypto');
const path = require('path');
const storageService = require('./storageService');
const notificationService = require('./notificationService');

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const BUCKET_NAME = 'application-documents';

/**
 * Access Control Helper
 */
const checkApplicationAccess = async (applicationId, userId) => {
    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return { authorized: false, role: null };
        }

        const userRole = user.role;
        if (userRole === 'platform_admin') {
            return { authorized: true, role: userRole };
        }

        const { data: app, error: appError } = await supabase
            .from('applications')
            .select('center_id, assigned_staff_id')
            .eq('id', applicationId)
            .single();

        if (appError || !app) {
            return { authorized: false, role: userRole };
        }

        if (userRole === 'center_owner') {
            const { data: center } = await supabase
                .from('centers')
                .select('owner_id')
                .eq('id', app.center_id)
                .single();

            if (center && center.owner_id === userId) {
                return { authorized: true, role: userRole };
            }
        }

        if (userRole === 'manager') {
            const { data: staff } = await supabase
                .from('center_staff')
                .select('role, is_active')
                .eq('center_id', app.center_id)
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

            if (staff && staff.role === 'manager') {
                return { authorized: true, role: userRole };
            }
        }

        if (userRole === 'staff') {
            if (app.assigned_staff_id === userId) {
                return { authorized: true, role: userRole };
            }
        }

        return { authorized: false, role: userRole };
    } catch (err) {
        console.error('Access verification failure:', err);
        return { authorized: false, role: null };
    }
};

/**
 * Helper to log activity log.
 */
const logActivity = async (userId, action, entityId, details = {}) => {
    try {
        await supabase
            .from('activity_logs')
            .insert({
                user_id: userId,
                action,
                entity_type: 'application',
                entity_id: entityId,
                details
            });
    } catch (err) {
        console.error('Activity log error:', err.message);
    }
};

/**
 * Automation checklist validation. Checks if all mandatory checklist items are verified.
 * If true, automatically advances application status to 'under_verification'.
 */
const checkAndPromoteApplication = async (applicationId, performingUserId) => {
    const { data: app, error: appError } = await supabase
        .from('applications')
        .select('status, document_checklist')
        .eq('id', applicationId)
        .single();

    if (appError || !app) return;

    const checklist = app.document_checklist || [];

    const allMandatoryVerified = checklist.every(item => {
        if (item.mandatory) {
            return item.status === 'verified';
        }
        return true;
    });

    if (allMandatoryVerified && (app.status === 'documents_pending' || app.status === 'submitted')) {
        await supabase
            .from('applications')
            .update({
                status: 'under_verification',
                updated_at: new Date().toISOString()
            })
            .eq('id', applicationId);

        await logActivity(performingUserId, 'Status Changed', applicationId, {
            from: app.status,
            to: 'under_verification',
            message: 'Automatically updated because all mandatory documents in checklist have been verified.'
        });
    }
};

/**
 * Upload an application document.
 */
const uploadApplicationDocument = async (userId, applicationId, documentName, file, expiryDate = null) => {
    // 1. Check access
    const { authorized } = await checkApplicationAccess(applicationId, userId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permission to upload documents for this application');
    }

    // 2. Validate application exists
    const { data: app, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

    if (appError || !app) {
        throw new Error('Application not found');
    }

    // 3. Document Type Validation against checklist
    const checklist = app.document_checklist || [];
    const checklistItem = checklist.find(item => item.document_name === documentName);

    if (!checklistItem) {
        throw new Error('Document not required for this application');
    }

    // 4. File Type Validation (Extension and MIME)
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExt) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.');
    }

    // 5. File Size Limits (Photos = 5MB, Documents = 10MB)
    const isPhoto = documentName.toLowerCase().includes('photo') || documentName.toLowerCase().includes('picture');
    const maxSize = isPhoto ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
        throw new Error(`File exceeds maximum allowed size (${isPhoto ? '5MB' : '10MB'})`);
    }

    // 6. Generate SHA256 file checksum
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // 7. Storage parameters
    const version = 1;
    const timestamp = Date.now();
    const uploadedFileName = `${documentName.replace(/\s+/g, '_')}_v${version}_${timestamp}${fileExt}`;
    const storagePath = `applications/${applicationId}/${uploadedFileName}`;

    // 8. Upload to private bucket using Storage abstraction
    await storageService.uploadFile(BUCKET_NAME, storagePath, file.buffer, file.mimetype);

    // 9. Create documents table metadata row
    const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
            application_id: applicationId,
            service_id: app.service_id,
            customer_id: app.customer_id,
            document_name: documentName,
            document_type: fileExt.slice(1).toUpperCase(),
            storage_path: storagePath,
            file_name: file.originalname,
            mime_type: file.mimetype,
            file_size: file.size,
            version,
            upload_status: 'uploaded',
            verification_status: 'pending',
            file_hash: fileHash,
            scan_status: 'pending',
            expiry_date: expiryDate || null,
            original_file_name: file.originalname,
            uploaded_file_name: uploadedFileName,
            bucket_name: BUCKET_NAME
        })
        .select()
        .single();

    if (docError) throw docError;

    // 10. Update checklist pointer in application
    const updatedChecklist = checklist.map(item => {
        if (item.document_name === documentName) {
            return {
                ...item,
                status: 'uploaded',
                document_id: doc.id
            };
        }
        return item;
    });

    const { error: appChecklistError } = await supabase
        .from('applications')
        .update({
            document_checklist: updatedChecklist,
            updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

    if (appChecklistError) throw appChecklistError;

    // 11. Write activity logs
    await logActivity(userId, 'Document Uploaded', applicationId, {
        document_id: doc.id,
        document_name: documentName,
        version
    });

    return doc;
};

/**
 * Lists application documents.
 */
const getDocumentsByApplication = async (applicationId, userId) => {
    const { authorized } = await checkApplicationAccess(applicationId, userId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permission to view documents for this application');
    }

    const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return documents;
};

/**
 * Gets details of a specific document.
 */
const getDocumentById = async (documentId, userId) => {
    const { data: doc, error: getError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

    if (getError || !doc) {
        throw new Error('Document not found');
    }

    const { authorized } = await checkApplicationAccess(doc.application_id, userId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permission to view this document');
    }

    return doc;
};

/**
 * Verifies document metadata.
 */
const verifyApplicationDocument = async (documentId, reviewComments, performingUserId) => {
    const { data: doc, error: getError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

    if (getError || !doc) {
        throw new Error('Document not found');
    }

    // Only manager, owner, or admin can verify
    const { authorized, role } = await checkApplicationAccess(doc.application_id, performingUserId);
    if (!authorized || role === 'staff') {
        throw new Error('Access Denied: Only managers, owners, or platform admins can verify documents');
    }

    const { data: updatedDoc, error } = await supabase
        .from('documents')
        .update({
            verification_status: 'verified',
            upload_status: 'uploaded',
            verified_by: performingUserId,
            verified_at: new Date().toISOString(),
            review_comments: reviewComments || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single();

    if (error) throw error;

    // Update application checklist status
    const { data: app } = await supabase
        .from('applications')
        .select('application_number, document_checklist, assigned_staff_id')
        .eq('id', doc.application_id)
        .single();

    if (app && app.document_checklist) {
        const updatedChecklist = app.document_checklist.map(item => {
            if (item.document_id === documentId) {
                return { ...item, status: 'verified' };
            }
            return item;
        });

        await supabase
            .from('applications')
            .update({
                document_checklist: updatedChecklist,
                updated_at: new Date().toISOString()
            })
            .eq('id', doc.application_id);
    }

    // Log verification
    await logActivity(performingUserId, 'Document Verified', doc.application_id, {
        document_id: documentId,
        document_name: doc.document_name,
        version: doc.version,
        review_comments: reviewComments || null
    });

    // Trigger Notification
    if (app && app.assigned_staff_id) {
        await notificationService.createNotification(app.assigned_staff_id, {
            type: 'Document Verified',
            title: 'Document Verified',
            message: `Document "${doc.document_name}" has been verified for application ${app.application_number}.`,
            category: 'document',
            priority: 'medium',
            referenceType: 'document',
            referenceId: documentId
        });
    }

    // Check checklist completion automation
    await checkAndPromoteApplication(doc.application_id, performingUserId);

    return updatedDoc;
};

/**
 * Rejects document metadata with reason.
 */
const rejectApplicationDocument = async (documentId, rejectionReason, reviewComments, performingUserId) => {
    if (!rejectionReason) {
        throw new Error('rejection_reason is required to reject a document');
    }

    const { data: doc, error: getError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

    if (getError || !doc) {
        throw new Error('Document not found');
    }

    // Only manager, owner, or admin can reject
    const { authorized, role } = await checkApplicationAccess(doc.application_id, performingUserId);
    if (!authorized || role === 'staff') {
        throw new Error('Access Denied: Only managers, owners, or platform admins can reject documents');
    }

    const { data: updatedDoc, error } = await supabase
        .from('documents')
        .update({
            verification_status: 'rejected',
            rejection_reason: rejectionReason,
            review_comments: reviewComments || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select()
        .single();

    if (error) throw error;

    // Update checklist status to rejected
    const { data: app } = await supabase
        .from('applications')
        .select('status, document_checklist, application_number, assigned_staff_id')
        .eq('id', doc.application_id)
        .single();

    if (app && app.document_checklist) {
        const updatedChecklist = app.document_checklist.map(item => {
            if (item.document_id === documentId) {
                return { ...item, status: 'rejected' };
            }
            return item;
        });

        const appUpdates = {
            document_checklist: updatedChecklist,
            updated_at: new Date().toISOString()
        };

        // Automatically change application status back to documents_pending for reupload
        if (app.status !== 'documents_pending') {
            appUpdates.status = 'documents_pending';
        }

        await supabase
            .from('applications')
            .update(appUpdates)
            .eq('id', doc.application_id);

        if (app.status !== 'documents_pending') {
            await logActivity(performingUserId, 'Status Changed', doc.application_id, {
                from: app.status,
                to: 'documents_pending',
                message: `Application shifted to documents_pending because mandatory document "${doc.document_name}" was rejected.`
            });
        }
    }

    // Log rejection
    await logActivity(performingUserId, 'Document Rejected', doc.application_id, {
        document_id: documentId,
        document_name: doc.document_name,
        version: doc.version,
        rejection_reason: rejectionReason,
        review_comments: reviewComments || null
    });

    // Trigger Notification
    if (app && app.assigned_staff_id) {
        await notificationService.createNotification(app.assigned_staff_id, {
            type: 'Document Rejected',
            title: 'Document Rejected',
            message: `Document "${doc.document_name}" was rejected for application ${app.application_number}. Reason: ${rejectionReason}`,
            category: 'document',
            priority: 'high',
            referenceType: 'document',
            referenceId: documentId
        });
    }

    return updatedDoc;
};

/**
 * Reuploads a document creating a new version.
 */
const reuploadApplicationDocument = async (userId, previousDocumentId, file, expiryDate = null) => {
    // 1. Fetch previous document profile
    const { data: prevDoc, error: getError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', previousDocumentId)
        .single();

    if (getError || !prevDoc) {
        throw new Error('Previous document record not found');
    }

    // 2. Validate access
    const { authorized } = await checkApplicationAccess(prevDoc.application_id, userId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permission to upload documents for this application');
    }

    // 3. Confirm file cannot be verified version reuploaded
    if (prevDoc.verification_status === 'verified') {
        throw new Error('Cannot reupload files for verified documents');
    }

    // 4. File validations
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExt) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.');
    }

    const isPhoto = prevDoc.document_name.toLowerCase().includes('photo') || prevDoc.document_name.toLowerCase().includes('picture');
    const maxSize = isPhoto ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
        throw new Error(`File exceeds maximum allowed size (${isPhoto ? '5MB' : '10MB'})`);
    }

    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // 5. Version increments
    const newVersion = prevDoc.version + 1;
    const timestamp = Date.now();
    const uploadedFileName = `${prevDoc.document_name.replace(/\s+/g, '_')}_v${newVersion}_${timestamp}${fileExt}`;
    const storagePath = `applications/${prevDoc.application_id}/${uploadedFileName}`;

    // 6. Upload using storage abstraction
    await storageService.uploadFile(BUCKET_NAME, storagePath, file.buffer, file.mimetype);

    // 7. Insert new documents row
    const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
            application_id: prevDoc.application_id,
            service_id: prevDoc.service_id,
            customer_id: prevDoc.customer_id,
            document_name: prevDoc.document_name,
            document_type: fileExt.slice(1).toUpperCase(),
            storage_path: storagePath,
            file_name: file.originalname,
            mime_type: file.mimetype,
            file_size: file.size,
            version: newVersion,
            upload_status: 'uploaded',
            verification_status: 'pending',
            file_hash: fileHash,
            scan_status: 'pending',
            expiry_date: expiryDate || null,
            original_file_name: file.originalname,
            uploaded_file_name: uploadedFileName,
            bucket_name: BUCKET_NAME
        })
        .select()
        .single();

    if (docError) throw docError;

    // 8. Update checklist index to reference the newly created ID
    const { data: app } = await supabase
        .from('applications')
        .select('document_checklist')
        .eq('id', prevDoc.application_id)
        .single();

    if (app && app.document_checklist) {
        const updatedChecklist = app.document_checklist.map(item => {
            if (item.document_name === prevDoc.document_name) {
                return {
                    ...item,
                    status: 'uploaded',
                    document_id: doc.id
                };
            }
            return item;
        });

        await supabase
            .from('applications')
            .update({
                document_checklist: updatedChecklist,
                updated_at: new Date().toISOString()
            })
            .eq('id', prevDoc.application_id);
    }

    // 9. Audit reuploading
    await logActivity(userId, 'Document Reuploaded', prevDoc.application_id, {
        document_id: doc.id,
        previous_document_id: previousDocumentId,
        document_name: prevDoc.document_name,
        version: newVersion
    });

    return doc;
};

/**
 * Downloads document via signed URL.
 */
const downloadApplicationDocument = async (documentId, userId) => {
    const { data: doc, error: getError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

    if (getError || !doc) {
        throw new Error('Document not found');
    }

    const { authorized } = await checkApplicationAccess(doc.application_id, userId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permission to download this document');
    }

    // Generate signed URL via Storage Service
    const signedUrl = await storageService.generateSignedUrl(doc.bucket_name, doc.storage_path, 300);

    // Log download event
    await logActivity(userId, 'Document Downloaded', doc.application_id, {
        document_id: documentId,
        document_name: doc.document_name,
        version: doc.version
    });

    return signedUrl;
};

/**
 * Computes Completion Metrics details.
 */
const getDocumentCompletionPercentage = async (applicationId, userId) => {
    const { authorized } = await checkApplicationAccess(applicationId, userId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permission to view completion details');
    }

    const { data: app } = await supabase
        .from('applications')
        .select('document_checklist')
        .eq('id', applicationId)
        .single();

    if (!app || !app.document_checklist) {
        throw new Error('Application or checklist directory not found');
    }

    const checklist = app.document_checklist || [];

    const required = checklist.filter(item => item.mandatory).length;
    const uploaded = checklist.filter(item => item.status === 'uploaded' || item.status === 'verified').length;
    const verified = checklist.filter(item => item.status === 'verified').length;
    const rejected = checklist.filter(item => item.status === 'rejected').length;
    const pending = checklist.filter(item => item.status === 'pending').length;

    const total = checklist.length || 1;
    const percentage = Math.round((uploaded / total) * 100);

    return {
        required,
        uploaded,
        verified,
        rejected,
        pending,
        percentage
    };
};

module.exports = {
    uploadApplicationDocument,
    getDocumentsByApplication,
    getDocumentById,
    verifyApplicationDocument,
    rejectApplicationDocument,
    reuploadApplicationDocument,
    downloadApplicationDocument,
    getDocumentCompletionPercentage
};
