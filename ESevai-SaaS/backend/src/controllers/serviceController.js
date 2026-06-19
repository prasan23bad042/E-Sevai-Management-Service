const {
    createService,
    getServices,
    getServiceById,
    updateService,
    toggleServiceStatus,
    seedMasterServicesData
} = require('../services/serviceService');

/**
 * Creates a new service.
 */
const create = async (req, res) => {
    try {
        const {
            service_code,
            service_name,
            service_category,
            description,
            required_documents,
            estimated_processing_days,
            sla_days,
            government_fee,
            service_charge,
            is_active
        } = req.body;

        if (!service_code || !service_name || !service_category) {
            return res.status(400).json({
                success: false,
                message: 'service_code, service_name, and service_category are required'
            });
        }

        // Simple validation on required_documents array structure
        if (required_documents && !Array.isArray(required_documents)) {
            return res.status(400).json({
                success: false,
                message: 'required_documents must be a structured JSON array'
            });
        }

        const newService = await createService({
            service_code,
            service_name,
            service_category,
            description,
            required_documents,
            estimated_processing_days: parseInt(estimated_processing_days) || 0,
            sla_days: parseInt(sla_days) || 0,
            government_fee: parseFloat(government_fee) || 0.00,
            service_charge: parseFloat(service_charge) || 0.00,
            is_active
        });

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: newService
        });
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Lists catalog services with category filters, searches, and paginations.
 */
const list = async (req, res) => {
    try {
        const { category, active, search, page, limit } = req.query;

        const result = await getServices(
            { category, active, search },
            { page, limit }
        );

        res.json({
            success: true,
            data: result.services
        });
    } catch (error) {
        console.error('Error listing services:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Gets details of a single service.
 */
const details = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await getServiceById(id);

        res.json({
            success: true,
            data: service
        });
    } catch (error) {
        console.error('Error fetching service details:', error);
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Updates a service configuration.
 */
const update = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.body.required_documents && !Array.isArray(req.body.required_documents)) {
            return res.status(400).json({
                success: false,
                message: 'required_documents must be a structured JSON array'
            });
        }

        const service = await updateService(id, req.body);

        res.json({
            success: true,
            message: 'Service updated successfully',
            data: service
        });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Activates a service.
 */
const activate = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await toggleServiceStatus(id, true);

        res.json({
            success: true,
            message: 'Service activated successfully',
            data: service
        });
    } catch (error) {
        console.error('Error activating service:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Deactivates a service.
 */
const deactivate = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await toggleServiceStatus(id, false);

        res.json({
            success: true,
            message: 'Service deactivated successfully',
            data: service
        });
    } catch (error) {
        console.error('Error deactivating service:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Seeds master services catalog idempotently.
 */
const seed = async (req, res) => {
    try {
        const summary = await seedMasterServicesData();

        res.json({
            success: true,
            message: 'Master services seeded successfully',
            summary
        });
    } catch (error) {
        console.error('Error seeding master services:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    create,
    list,
    details,
    update,
    activate,
    deactivate,
    seed
};
