const supabase = require('../config/supabase');
const storageService = require('./storageService');
const notificationService = require('./notificationService');

const BUCKET_NAME = 'receipts-documents';

/**
 * Access Control Helper
 */
const checkPaymentAccess = async (paymentId, userId) => {
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

        // Fetch payment details
        const { data: p, error: getError } = await supabase
            .from('payments')
            .select('center_id, application_id')
            .eq('id', paymentId)
            .single();

        if (getError || !p) {
            return { authorized: false, role: userRole };
        }

        if (userRole === 'center_owner') {
            const { data: center } = await supabase
                .from('centers')
                .select('owner_id')
                .eq('id', p.center_id)
                .single();

            if (center && center.owner_id === userId) {
                return { authorized: true, role: userRole };
            }
        }

        if (userRole === 'manager') {
            const { data: staff } = await supabase
                .from('center_staff')
                .select('role, is_active')
                .eq('center_id', p.center_id)
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

            if (staff && staff.role === 'manager') {
                return { authorized: true, role: userRole };
            }
        }

        if (userRole === 'staff') {
            const { data: app } = await supabase
                .from('applications')
                .select('assigned_staff_id')
                .eq('id', p.application_id)
                .single();

            if (app && app.assigned_staff_id === userId) {
                return { authorized: true, role: userRole };
            }
        }

        return { authorized: false, role: userRole };
    } catch (err) {
        console.error('Error in checkPaymentAccess:', err);
        return { authorized: false, role: null };
    }
};

/**
 * Helper to log activity logs.
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
 * Creates a new payment request record.
 * One application is allowed only one active payment (pending or paid), unless cancelled/refunded.
 */
const createPaymentRecord = async (userId, applicationId) => {
    // 1. Validate application exists
    const { data: app, error: appError } = await supabase
        .from('applications')
        .select('id, application_number, center_id, service_id, customer_name, service_snapshot')
        .eq('id', applicationId)
        .single();

    if (appError || !app) {
        throw new Error('Application not found');
    }

    // 2. Duplicate active payment protection (prevent multiple pending/paid payments)
    const { data: existingActive, error: activeCheckError } = await supabase
        .from('payments')
        .select('id, payment_status')
        .eq('application_id', applicationId)
        .in('payment_status', ['pending', 'paid']);

    if (activeCheckError) throw activeCheckError;
    if (existingActive && existingActive.length > 0) {
        throw new Error('An active payment record (pending or paid) already exists for this application');
    }

    // 3. Extract fees from historical service snapshot
    const govFee = parseFloat(app.service_snapshot?.government_fee) || 0.00;
    const srvCharge = parseFloat(app.service_snapshot?.service_charge) || 0.00;
    const totalAmount = govFee + srvCharge;

    // 4. Generate sequential payment number (PAY-YYYY-000001)
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01T00:00:00.000Z`;
    const endDate = `${currentYear + 1}-01-01T00:00:00.000Z`;

    const { count, error: countError } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lt('created_at', endDate);

    if (countError) throw countError;
    const nextSeq = (count || 0) + 1;
    const paymentNumber = `PAY-${currentYear}-${String(nextSeq).padStart(6, '0')}`;

    // 5. Build payment snapshot JSON for historical accuracy
    const paymentSnapshot = {
        service_name: app.service_snapshot?.service_name || 'N/A',
        government_fee: govFee,
        service_charge: srvCharge,
        total_amount: totalAmount,
        application_number: app.application_number
    };

    // 6. Create payment details record
    const { data, error } = await supabase
        .from('payments')
        .insert({
            payment_number: paymentNumber,
            application_id: applicationId,
            service_id: app.service_id,
            center_id: app.center_id,
            customer_name: app.customer_name,
            government_fee: govFee,
            service_charge: srvCharge,
            total_amount: totalAmount,
            payment_status: 'pending',
            payment_snapshot: paymentSnapshot,
            financial_year: currentYear,
            payment_month: new Date().getMonth() + 1,
            payment_day: new Date().getDate()
        })
        .select()
        .single();

    if (error) throw error;

    // 7. Write activity logs
    await logActivity(userId, 'Payment Created', applicationId, {
        payment_id: data.id,
        payment_number: paymentNumber,
        total_amount: totalAmount
    });

    return data;
};

/**
 * Record payment completion (marks paid).
 * Supports cash collection entries (cash_received, balance_returned).
 */
const processPaymentCompletion = async (paymentId, paymentMethod, transactionReference, cashDetails = {}, performingUserId) => {
    // 1. Validate permissions
    const { authorized } = await checkPaymentAccess(paymentId, performingUserId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permissions to execute payments for this application');
    }

    // 2. Fetch payment details
    const { data: payment, error: getError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (getError || !payment) {
        throw new Error('Payment record not found');
    }

    if (payment.payment_status !== 'pending') {
        throw new Error(`Cannot process payment: current status is "${payment.payment_status}"`);
    }

    // 3. Process fields
    const paymentDate = new Date().toISOString();
    let txRef = transactionReference;

    const updatePayload = {
        payment_status: 'paid',
        payment_method: paymentMethod,
        paid_at: paymentDate,
        collected_by_user_id: performingUserId,
        collected_at: paymentDate,
        updated_at: paymentDate
    };

    // Cash transaction calculations
    if (paymentMethod === 'cash') {
        txRef = txRef || `CASH-${Date.now()}`;
        const cashReceived = parseFloat(cashDetails.cash_received) || 0.00;
        
        if (cashReceived < payment.total_amount) {
            throw new Error(`Insufficient cash. Received Rs.${cashReceived}, Total amount is Rs.${payment.total_amount}`);
        }

        const balanceReturned = cashReceived - payment.total_amount;
        updatePayload.cash_received = cashReceived;
        updatePayload.balance_returned = balanceReturned;
    }

    updatePayload.transaction_reference = txRef || `TXN-${Date.now()}`;

    // 4. Update payments table
    const { data, error } = await supabase
        .from('payments')
        .update(updatePayload)
        .eq('id', paymentId)
        .select()
        .single();

    if (error) throw error;

    // 5. Write activity log audit trail
    await logActivity(performingUserId, 'Payment Completed', payment.application_id, {
        payment_id: paymentId,
        payment_number: payment.payment_number,
        payment_method: paymentMethod,
        total_amount: payment.total_amount,
        transaction_reference: updatePayload.transaction_reference
    });

    // 6. Trigger notification
    await notificationService.createNotification(performingUserId, {
        type: 'Payment Completed',
        title: 'Payment Completed',
        message: `Payment of Rs.${payment.total_amount} was completed via ${paymentMethod.toUpperCase()} (Ref: ${updatePayload.transaction_reference}) for application ${payment.payment_snapshot?.application_number || 'N/A'}.`,
        category: 'payment',
        priority: 'medium',
        referenceType: 'payment',
        referenceId: paymentId
    });

    return data;
};

/**
 * Cancels a pending payment request.
 */
const processPaymentCancellation = async (paymentId, performingUserId) => {
    const { authorized } = await checkPaymentAccess(paymentId, performingUserId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permission to cancel this payment');
    }

    const { data: payment, error: getError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (getError || !payment) {
        throw new Error('Payment record not found');
    }

    if (payment.payment_status !== 'pending') {
        throw new Error(`Cannot cancel payment with status "${payment.payment_status}"`);
    }

    const { data, error } = await supabase
        .from('payments')
        .update({
            payment_status: 'cancelled',
            updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select()
        .single();

    if (error) throw error;

    await logActivity(performingUserId, 'Payment Cancelled', payment.application_id, {
        payment_id: paymentId,
        payment_number: payment.payment_number
    });

    return data;
};

/**
 * Initiates refund/reversal.
 */
const processPaymentRefund = async (paymentId, refundAmount, refundReason, performingUserId) => {
    // Only center owner or platform admin can trigger refunds
    const { authorized, role } = await checkPaymentAccess(paymentId, performingUserId);
    if (!authorized || role === 'staff') {
        throw new Error('Access Denied: Only center owners or platform admins can process refunds');
    }

    if (!refundReason || !refundAmount) {
        throw new Error('refund_amount and refund_reason are required to issue a refund');
    }

    const { data: payment, error: getError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (getError || !payment) {
        throw new Error('Payment record not found');
    }

    if (payment.payment_status !== 'paid' && payment.payment_status !== 'partially_refunded') {
        throw new Error(`Cannot refund payment with status "${payment.payment_status}"`);
    }

    const refAmt = parseFloat(refundAmount);
    if (refAmt <= 0 || refAmt > payment.total_amount) {
        throw new Error(`Invalid refund amount. Must be between 0 and total amount (Rs.${payment.total_amount})`);
    }

    const newStatus = refAmt === payment.total_amount ? 'refunded' : 'partially_refunded';

    const { data, error } = await supabase
        .from('payments')
        .update({
            payment_status: newStatus,
            refund_amount: refAmt,
            refund_reason: refundReason,
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select()
        .single();

    if (error) throw error;

    await logActivity(performingUserId, 'Refund Issued', payment.application_id, {
        payment_id: paymentId,
        payment_number: payment.payment_number,
        refund_amount: refAmt,
        refund_reason: refundReason,
        status: newStatus
    });

    return data;
};

/**
 * Fetch detailed payment configuration.
 */
const getPaymentDetails = async (paymentId, userId) => {
    const { authorized } = await checkPaymentAccess(paymentId, userId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permissions to view this payment record');
    }

    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (error || !data) {
        throw new Error('Payment record not found');
    }

    return data;
};

/**
 * Lists center payment logs.
 */
const getPaymentsList = async (userId, filters = {}, pagination = {}) => {
    const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    const role = user?.role;

    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('payments')
        .select('*, applications(application_number)', { count: 'exact' });

    // Enforce role-based boundaries
    if (role === 'staff') {
        // Find assigned application IDs first
        const { data: apps } = await supabase
            .from('applications')
            .select('id')
            .eq('assigned_staff_id', userId);
        
        const appIds = (apps || []).map(a => a.id);
        if (appIds.length > 0) {
            query = query.in('application_id', appIds);
        } else {
            return { payments: [], total: 0, page, limit, pages: 0 };
        }
    } else if (role === 'center_owner' || role === 'manager') {
        let centerId = null;
        if (role === 'center_owner') {
            const { data: center } = await supabase
                .from('centers')
                .select('id')
                .eq('owner_id', userId)
                .limit(1)
                .maybeSingle();
            centerId = center?.id;
        } else {
            const { data: staff } = await supabase
                .from('center_staff')
                .select('center_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();
            centerId = staff?.center_id;
        }

        if (centerId) {
            query = query.eq('center_id', centerId);
        } else {
            return { payments: [], total: 0, page, limit, pages: 0 };
        }
    }

    // Apply query filters
    if (filters.status) {
        query = query.eq('payment_status', filters.status);
    }
    if (filters.method) {
        query = query.eq('payment_method', filters.method);
    }
    if (filters.center && role === 'platform_admin') {
        query = query.eq('center_id', filters.center);
    }
    if (filters.date_start) {
        query = query.gte('created_at', filters.date_start);
    }
    if (filters.date_end) {
        query = query.lte('created_at', filters.date_end);
    }
    if (filters.search) {
        query = query.or(`payment_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,transaction_reference.ilike.%${filters.search}%`);
    }

    const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) throw error;

    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return {
        payments: data || [],
        total,
        page,
        limit,
        pages
    };
};

/**
 * Generates and saves a receipt versioned record.
 */
const generateReceiptRecord = async (paymentId, performingUserId) => {
    const { authorized } = await checkPaymentAccess(paymentId, performingUserId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permission to generate receipts for this payment');
    }

    // 1. Verify payment is paid
    const { data: payment, error: getError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (getError || !payment) {
        throw new Error('Payment record not found');
    }

    if (payment.payment_status !== 'paid') {
        throw new Error(`Receipts can only be generated for paid transactions. Current status: "${payment.payment_status}"`);
    }

    // 2. Fetch application and center details for metadata
    const { data: app } = await supabase
        .from('applications')
        .select('id, application_number, center_id, service_id, customer_name, customer_phone')
        .eq('id', payment.application_id)
        .single();

    const { data: center } = await supabase
        .from('centers')
        .select('name, center_code, address, district')
        .eq('id', payment.center_id)
        .single();

    const { data: userProfile } = await supabase
        .from('users')
        .select('full_name, name')
        .eq('id', performingUserId)
        .single();

    // 3. Receipt versioning (checks existing and increments)
    const { data: existingReceipts } = await supabase
        .from('receipts')
        .select('receipt_version')
        .eq('payment_id', paymentId)
        .order('receipt_version', { ascending: false });

    const receiptVersion = (existingReceipts && existingReceipts.length > 0) 
        ? existingReceipts[0].receipt_version + 1 
        : 1;

    // 4. Generate receipt number (RCPT-YYYY-000001)
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-01-01T00:00:00.000Z`;
    const endDate = `${currentYear + 1}-01-01T00:00:00.000Z`;

    const { count } = await supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lt('created_at', endDate);

    const nextSeq = (count || 0) + 1;
    const receiptNumber = `RCPT-${currentYear}-${String(nextSeq).padStart(6, '0')}`;

    // 5. Structure data snapshot
    const receiptData = {
        receipt_number: receiptNumber,
        receipt_version: receiptVersion,
        payment_number: payment.payment_number,
        application_number: app.application_number,
        service_name: payment.payment_snapshot?.service_name || 'N/A',
        customer_name: payment.customer_name,
        customer_phone: app.customer_phone || 'N/A',
        government_fee: payment.government_fee,
        service_charge: payment.service_charge,
        total_amount: payment.total_amount,
        payment_method: payment.payment_method,
        payment_date: payment.paid_at,
        center_name: center?.name || 'N/A',
        center_code: center?.center_code || 'N/A',
        generated_by: userProfile?.full_name || userProfile?.name || 'System',
        generated_timestamp: new Date().toISOString()
    };

    // 6. Build PDF standardized layout buffer (Plain-text invoice document)
    const printDate = new Date(receiptData.generated_timestamp).toLocaleString();
    const payDate = receiptData.payment_date ? new Date(receiptData.payment_date).toLocaleString() : 'N/A';
    const textBufferContent = `
==================================================
                 E-SEVAI RECEIPT                  
==================================================
Receipt Number: ${receiptData.receipt_number} (v${receiptData.receipt_version})
Date: ${printDate}
--------------------------------------------------
CENTER DETAILS:
Center Code: ${receiptData.center_code}
Center Name: ${receiptData.center_name}
--------------------------------------------------
APPLICATION DETAILS:
Application Number: ${receiptData.application_number}
Service Name: ${receiptData.service_name}
Customer Name: ${receiptData.customer_name}
Customer Contact: ${receiptData.customer_phone}
--------------------------------------------------
PAYMENT DETAILS:
Payment Number: ${receiptData.payment_number}
Payment Method: ${receiptData.payment_method.toUpperCase()}
Payment Date: ${payDate}
--------------------------------------------------
FEE BREAKDOWN:
Government Fee: Rs.${parseFloat(receiptData.government_fee).toFixed(2)}
Service Charge: Rs.${parseFloat(receiptData.service_charge).toFixed(2)}
--------------------------------------------------
TOTAL AMOUNT COLLECTED: Rs.${parseFloat(receiptData.total_amount).toFixed(2)}
==================================================
Generated By: ${receiptData.generated_by}
Thank you for using E-Sevai services.
==================================================
`;
    const fileBuffer = Buffer.from(textBufferContent.trim(), 'utf-8');
    const storagePath = `receipts/${paymentId}/receipt_v${receiptVersion}.txt`;

    // 7. Write to storage cache receipts-documents bucket
    await storageService.uploadFile(BUCKET_NAME, storagePath, fileBuffer, 'text/plain');

    // 8. Insert record in receipts table
    const { data: rcpt, error: insertError } = await supabase
        .from('receipts')
        .insert({
            receipt_number: receiptNumber,
            payment_id: paymentId,
            application_id: payment.application_id,
            receipt_version: receiptVersion,
            storage_path: storagePath,
            receipt_data: receiptData,
            bucket_name: BUCKET_NAME
        })
        .select()
        .single();

    if (insertError) throw insertError;

    // 9. Audit receipts
    await logActivity(performingUserId, 'Receipt Generated', payment.application_id, {
        payment_id: paymentId,
        receipt_id: rcpt.id,
        receipt_number: receiptNumber,
        version: receiptVersion
    });

    // 10. Trigger notification
    await notificationService.createNotification(performingUserId, {
        type: 'Receipt Generated',
        title: 'Receipt Generated',
        message: `Receipt ${receiptNumber} (v${receiptVersion}) was generated for application ${app.application_number}.`,
        category: 'payment',
        priority: 'low',
        referenceType: 'payment',
        referenceId: paymentId
    });

    return rcpt;
};

/**
 * Returns temporary signed URL for receipt.
 */
const getReceiptPDFSignedUrl = async (paymentId, performingUserId) => {
    const { authorized } = await checkPaymentAccess(paymentId, performingUserId);
    if (!authorized) {
        throw new Error('Access Denied: You do not have permission to view receipts for this payment');
    }

    // Fetch the latest generated version
    const { data: receipts, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('payment_id', paymentId)
        .order('receipt_version', { ascending: false })
        .limit(1);

    if (error || !receipts || receipts.length === 0) {
        throw new Error('No receipt has been generated for this payment yet. Please generate the receipt record first.');
    }

    const latestReceipt = receipts[0];
    const signedUrl = await storageService.generateSignedUrl(latestReceipt.bucket_name || BUCKET_NAME, latestReceipt.storage_path, 300);

    // Audit logs
    await logActivity(performingUserId, 'Receipt Downloaded', latestReceipt.application_id, {
        payment_id: paymentId,
        receipt_id: latestReceipt.id,
        receipt_number: latestReceipt.receipt_number
    });

    return signedUrl;
};

/**
 * Scope payments queries based on role constraints.
 */
const getScopedPaidPayments = async (userId) => {
    const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    const role = user?.role;

    let query = supabase.from('payments').select('*').eq('payment_status', 'paid');

    if (role === 'staff') {
        const { data: apps } = await supabase
            .from('applications')
            .select('id')
            .eq('assigned_staff_id', userId);
        const appIds = (apps || []).map(a => a.id);
        if (appIds.length > 0) {
            query = query.in('application_id', appIds);
        } else {
            return [];
        }
    } else if (role === 'center_owner' || role === 'manager') {
        let centerId = null;
        if (role === 'center_owner') {
            const { data: center } = await supabase
                .from('centers')
                .select('id')
                .eq('owner_id', userId)
                .limit(1)
                .maybeSingle();
            centerId = center?.id;
        } else {
            const { data: staff } = await supabase
                .from('center_staff')
                .select('center_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();
            centerId = staff?.center_id;
        }

        if (centerId) {
            query = query.eq('center_id', centerId);
        } else {
            return [];
        }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

/**
 * Calculates revenue totals.
 */
const getRevenueSummary = (payments) => {
    let govRev = 0;
    let srvRev = 0;
    let totRev = 0;

    payments.forEach(p => {
        govRev += parseFloat(p.government_fee) || 0;
        srvRev += parseFloat(p.service_charge) || 0;
        totRev += parseFloat(p.total_amount) || 0;
    });

    return {
        government_revenue: govRev,
        center_revenue: srvRev,
        total_revenue: totRev
    };
};

/**
 * Aggregates daily metrics.
 */
const getDailyRevenueMetrics = async (userId) => {
    const payments = await getScopedPaidPayments(userId);
    
    // Group in memory
    const daily = {};
    payments.forEach(p => {
        const dateStr = p.paid_at ? p.paid_at.split('T')[0] : 'N/A';
        if (!daily[dateStr]) {
            daily[dateStr] = { government_revenue: 0, center_revenue: 0, total_revenue: 0 };
        }
        daily[dateStr].government_revenue += parseFloat(p.government_fee) || 0;
        daily[dateStr].center_revenue += parseFloat(p.service_charge) || 0;
        daily[dateStr].total_revenue += parseFloat(p.total_amount) || 0;
    });

    return {
        summary: getRevenueSummary(payments),
        timeline: Object.keys(daily).map(date => ({
            date,
            ...daily[date]
        })).sort((a, b) => b.date.localeCompare(a.date))
    };
};

/**
 * Aggregates monthly metrics.
 */
const getMonthlyRevenueMetrics = async (userId) => {
    const payments = await getScopedPaidPayments(userId);
    
    const monthly = {};
    payments.forEach(p => {
        const dateStr = p.paid_at ? p.paid_at.split('T')[0] : 'N/A';
        const monthStr = dateStr !== 'N/A' ? dateStr.substring(0, 7) : 'N/A'; // YYYY-MM
        
        if (!monthly[monthStr]) {
            monthly[monthStr] = { government_revenue: 0, center_revenue: 0, total_revenue: 0 };
        }
        monthly[monthStr].government_revenue += parseFloat(p.government_fee) || 0;
        monthly[monthStr].center_revenue += parseFloat(p.service_charge) || 0;
        monthly[monthStr].total_revenue += parseFloat(p.total_amount) || 0;
    });

    return {
        summary: getRevenueSummary(payments),
        monthly: Object.keys(monthly).map(month => ({
            month,
            ...monthly[month]
        })).sort((a, b) => b.month.localeCompare(a.month))
    };
};

/**
 * Aggregates center revenue metrics.
 */
const getCenterRevenueMetrics = async (userId) => {
    const payments = await getScopedPaidPayments(userId);
    
    const centers = {};
    for (const p of payments) {
        const cId = p.center_id;
        if (!centers[cId]) {
            // Fetch name cache
            const { data: c } = await supabase.from('centers').select('name, center_code').eq('id', cId).single();
            centers[cId] = {
                center_id: cId,
                center_code: c?.center_code || 'N/A',
                center_name: c?.name || 'N/A',
                government_revenue: 0,
                center_revenue: 0,
                total_revenue: 0
            };
        }
        centers[cId].government_revenue += parseFloat(p.government_fee) || 0;
        centers[cId].center_revenue += parseFloat(p.service_charge) || 0;
        centers[cId].total_revenue += parseFloat(p.total_amount) || 0;
    }

    return {
        summary: getRevenueSummary(payments),
        centers: Object.values(centers).sort((a, b) => b.total_revenue - a.total_revenue)
    };
};

/**
 * Aggregates service revenue metrics.
 */
const getServiceRevenueMetrics = async (userId) => {
    const payments = await getScopedPaidPayments(userId);
    
    const services = {};
    for (const p of payments) {
        const sId = p.service_id;
        if (!services[sId]) {
            const serviceName = p.payment_snapshot?.service_name || 'N/A';
            services[sId] = {
                service_id: sId,
                service_name: serviceName,
                government_revenue: 0,
                center_revenue: 0,
                total_revenue: 0
            };
        }
        services[sId].government_revenue += parseFloat(p.government_fee) || 0;
        services[sId].center_revenue += parseFloat(p.service_charge) || 0;
        services[sId].total_revenue += parseFloat(p.total_amount) || 0;
    }

    return {
        summary: getRevenueSummary(payments),
        services: Object.values(services).sort((a, b) => b.total_revenue - a.total_revenue)
    };
};

/**
 * Daily closing closing report reconciliation checks.
 */
const getDailyClosingReconciliation = async (userId, targetDate = null) => {
    const payments = await getScopedPaidPayments(userId);
    
    const checkDate = targetDate || new Date().toISOString().split('T')[0];
    
    let cashSum = 0;
    let upiSum = 0;
    let cardSum = 0;
    let bankSum = 0;
    let walletSum = 0;
    let totalSum = 0;

    const filtered = payments.filter(p => p.paid_at && p.paid_at.startsWith(checkDate));

    filtered.forEach(p => {
        const method = p.payment_method;
        const amt = parseFloat(p.total_amount) || 0;
        
        if (method === 'cash') cashSum += amt;
        else if (method === 'upi') upiSum += amt;
        else if (method === 'credit_card' || method === 'debit_card') cardSum += amt;
        else if (method === 'net_banking') bankSum += amt;
        else walletSum += amt;

        totalSum += amt;
    });

    return {
        date: checkDate,
        transaction_count: filtered.length,
        collections: {
            cash: cashSum,
            upi: upiSum,
            cards: cardSum,
            net_banking: bankSum,
            wallets: walletSum,
            total_collection: totalSum
        }
    };
};

/**
 * Mock customer payments list skeleton.
 */
const getCustomerPaymentsList = async (customerId, userId) => {
    // Platform admin check
    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
    if (user?.role !== 'platform_admin' && customerId !== userId) {
        throw new Error('Access Denied: You do not have permissions to view this customer portal payment log');
    }

    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

module.exports = {
    createPaymentRecord,
    processPaymentCompletion,
    processPaymentCancellation,
    processPaymentRefund,
    getPaymentDetails,
    getPaymentsList,
    generateReceiptRecord,
    getReceiptPDFSignedUrl,
    getDailyRevenueMetrics,
    getMonthlyRevenueMetrics,
    getCenterRevenueMetrics,
    getServiceRevenueMetrics,
    getDailyClosingReconciliation,
    getCustomerPaymentsList
};
