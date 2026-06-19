/**
 * Abstract Payment Gateway Service
 * Preserves the interface for future online payment gateways (Razorpay, PhonePe, Paytm, Stripe)
 * to avoid major refactoring during online processing integration.
 */
class PaymentGatewayService {
    constructor(provider = 'razorpay') {
        this.provider = provider;
    }

    /**
     * Creates a gateway transaction order.
     * @param {number} amount - Amount in Rs.
     * @param {string} currency - Currency code (default: INR)
     * @param {string} receiptId - Payment or application identifier
     * @returns {Promise<Object>} - Order creation details
     */
    async createOrder(amount, currency = 'INR', receiptId) {
        console.log(`[PG Abstraction] Creating order on ${this.provider} for Rs.${amount} (Receipt: ${receiptId})`);
        
        // Return dummy order payload matching standard gateway expectations
        return {
            id: `order_${this.provider}_${Date.now()}`,
            amount: amount * 100, // standard decimal representations (e.g. paisa)
            currency,
            receipt: receiptId,
            status: 'created',
            created_at: Math.floor(Date.now() / 1000)
        };
    }

    /**
     * Verifies payment signature (webhook or checkout return verification).
     * @param {string} orderId - Order ID returned by PG
     * @param {string} paymentId - Payment ID returned by PG
     * @param {string} signature - Signed hash signature
     * @returns {Promise<boolean>} - true if signature is valid
     */
    async verifyPaymentSignature(orderId, paymentId, signature) {
        console.log(`[PG Abstraction] Verifying signature on ${this.provider} for order: ${orderId}, payment: ${paymentId}`);
        // Mock verification validation checks
        return true;
    }

    /**
     * Initiates a refund request.
     * @param {string} transactionReference - Original reference transaction ID
     * @param {number} refundAmount - Amount to refund
     * @param {string} reason - Reversal reason
     * @returns {Promise<Object>} - Refund transaction payload
     */
    async initiateRefund(transactionReference, refundAmount, reason) {
        console.log(`[PG Abstraction] Initiating refund on ${this.provider} for TXN: ${transactionReference}, Amount: Rs.${refundAmount}, Reason: ${reason}`);
        
        return {
            refund_id: `rfnd_${this.provider}_${Date.now()}`,
            payment_id: transactionReference,
            amount: refundAmount * 100,
            status: 'processed',
            processed_at: new Date().toISOString()
        };
    }
}

module.exports = new PaymentGatewayService('razorpay'); // defaults to Razorpay
