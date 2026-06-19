const {
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
} = require('../services/paymentService');

/**
 * Initiates a payment request.
 */
const create = async (req, res) => {
    try {
        const { application_id } = req.body;

        if (!application_id) {
            return res.status(400).json({
                success: false,
                message: 'application_id is required'
            });
        }

        const payment = await createPaymentRecord(req.user.id, application_id);

        res.status(201).json({
            success: true,
            message: 'Payment request created successfully',
            data: payment
        });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Record payment completion.
 */
const pay = async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_method, transaction_reference, cash_received, balance_returned } = req.body;

        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: 'payment_method is required'
            });
        }

        const cashDetails = { cash_received, balance_returned };
        const payment = await processPaymentCompletion(
            id,
            payment_method,
            transaction_reference,
            cashDetails,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Payment registered successfully',
            data: payment
        });
    } catch (error) {
        console.error('Error recording payment completion:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Cancels a pending payment.
 */
const cancel = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await processPaymentCancellation(id, req.user.id);

        res.json({
            success: true,
            message: 'Payment cancelled successfully',
            data: payment
        });
    } catch (error) {
        console.error('Error cancelling payment:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Processes refund logic.
 */
const refund = async (req, res) => {
    try {
        const { id } = req.params;
        const { refund_amount, refund_reason } = req.body;

        const payment = await processPaymentRefund(
            id,
            refund_amount,
            refund_reason,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Payment refund processed successfully',
            data: payment
        });
    } catch (error) {
        console.error('Error issuing refund:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Gets payment details profile.
 */
const details = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await getPaymentDetails(id, req.user.id);

        res.json({
            success: true,
            data: payment
        });
    } catch (error) {
        console.error('Error fetching payment details:', error);

        const status = error.message.includes('Access Denied') ? 403 : 404;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Lists paginated billing logs.
 */
const list = async (req, res) => {
    try {
        const { status, method, date_start, date_end, center, search, page, limit } = req.query;

        const result = await getPaymentsList(
            req.user.id,
            { status, method, date_start, date_end, center, search },
            { page, limit }
        );

        res.json({
            success: true,
            data: result.payments
        });
    } catch (error) {
        console.error('Error listing payments:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Generates receipt record.
 */
const generateReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const receipt = await generateReceiptRecord(id, req.user.id);

        res.json({
            success: true,
            message: 'Receipt record generated successfully',
            data: receipt
        });
    } catch (error) {
        console.error('Error generating receipt:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Resolves signed download URL for receipt.
 */
const downloadReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const signedUrl = await getReceiptPDFSignedUrl(id, req.user.id);

        res.json({
            success: true,
            message: 'Signed receipt URL generated successfully',
            signedUrl
        });
    } catch (error) {
        console.error('Error downloading receipt PDF:', error);

        const status = error.message.includes('Access Denied') ? 403 : 400;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Daily Analytics summary.
 */
const dailyRevenue = async (req, res) => {
    try {
        const data = await getDailyRevenueMetrics(req.user.id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error loading daily analytics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Monthly Analytics summary.
 */
const monthlyRevenue = async (req, res) => {
    try {
        const data = await getMonthlyRevenueMetrics(req.user.id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error loading monthly analytics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Center-wise Analytics summary.
 */
const centerRevenue = async (req, res) => {
    try {
        const data = await getCenterRevenueMetrics(req.user.id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error loading center analytics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Service-wise Analytics summary.
 */
const serviceRevenue = async (req, res) => {
    try {
        const data = await getServiceRevenueMetrics(req.user.id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error loading service analytics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Daily closing report collection reconciliation.
 */
const closingReport = async (req, res) => {
    try {
        const { date } = req.query;
        const result = await getDailyClosingReconciliation(req.user.id, date);

        res.json({
            success: true,
            reconciliation: result
        });
    } catch (error) {
        console.error('Error generating daily closing report:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Lists customer payment records.
 */
const customerPayments = async (req, res) => {
    try {
        const { customerId } = req.params;
        const payments = await getCustomerPaymentsList(customerId, req.user.id);

        res.json({
            success: true,
            payments
        });
    } catch (error) {
        console.error('Error listing customer payments:', error);

        const status = error.message.includes('Access Denied') ? 403 : 500;
        res.status(status).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    create,
    pay,
    cancel,
    refund,
    details,
    list,
    generateReceipt,
    downloadReceipt,
    dailyRevenue,
    monthlyRevenue,
    centerRevenue,
    serviceRevenue,
    closingReport,
    customerPayments
};
