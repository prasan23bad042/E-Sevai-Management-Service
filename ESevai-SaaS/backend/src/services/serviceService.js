const supabase = require('../config/supabase');

const MASTER_SERVICES = [
    {
        service_code: "SVC-AADHAAR-UPD",
        service_name: "Aadhaar Update",
        service_category: "Identity Services",
        description: "Update details in Aadhaar card (Name, Address, DOB, Mobile Number)",
        required_documents: [
            { name: "Aadhaar Card", mandatory: true },
            { name: "Proof of Identity (POI)", mandatory: true },
            { name: "Proof of Address (POA)", mandatory: false }
        ],
        estimated_processing_days: 10,
        sla_days: 20,
        government_fee: 50.00,
        service_charge: 30.00,
        total_fee: 80.00
    },
    {
        service_code: "SVC-AADHAAR-DL",
        service_name: "Aadhaar Download",
        service_category: "Identity Services",
        description: "Download electronic copy of Aadhaar Card",
        required_documents: [
            { name: "Aadhaar Number or Enrollment ID", mandatory: true },
            { name: "Linked Mobile Number for OTP", mandatory: true }
        ],
        estimated_processing_days: 1,
        sla_days: 3,
        government_fee: 0.00,
        service_charge: 20.00,
        total_fee: 20.00
    },
    {
        service_code: "SVC-PAN-NEW",
        service_name: "PAN Card Application",
        service_category: "Identity Services",
        description: "Apply for new Permanent Account Number (PAN) Card",
        required_documents: [
            { name: "Aadhaar Card", mandatory: true },
            { name: "Proof of Identity", mandatory: true },
            { name: "Passport Size Photo", mandatory: true }
        ],
        estimated_processing_days: 15,
        sla_days: 30,
        government_fee: 107.00,
        service_charge: 50.00,
        total_fee: 157.00
    },
    {
        service_code: "SVC-VOTER-NEW",
        service_name: "Voter ID Application",
        service_category: "Identity Services",
        description: "Apply for a new Voter ID Card",
        required_documents: [
            { name: "Aadhaar Card", mandatory: true },
            { name: "Proof of Age", mandatory: true },
            { name: "Proof of Residence", mandatory: true },
            { name: "Passport Size Photo", mandatory: true }
        ],
        estimated_processing_days: 20,
        sla_days: 45,
        government_fee: 0.00,
        service_charge: 30.00,
        total_fee: 30.00
    },
    {
        service_code: "SVC-CERT-INC",
        service_name: "Income Certificate",
        service_category: "Certificates",
        description: "Income certificate issued by the Revenue Department",
        required_documents: [
            { name: "Aadhaar Card", mandatory: true },
            { name: "Ration Card", mandatory: true },
            { name: "Salary Certificate or Income Proof", mandatory: true },
            { name: "Self Declaration", mandatory: true }
        ],
        estimated_processing_days: 7,
        sla_days: 15,
        government_fee: 60.00,
        service_charge: 40.00,
        total_fee: 100.00
    },
    {
        service_code: "SVC-CERT-COMM",
        service_name: "Community Certificate",
        service_category: "Certificates",
        description: "Community/Caste certificate for school, college or jobs",
        required_documents: [
            { name: "Aadhaar Card", mandatory: true },
            { name: "Parent Community Certificate", mandatory: true },
            { name: "School Leaving Certificate", mandatory: true },
            { name: "Ration Card", mandatory: false }
        ],
        estimated_processing_days: 7,
        sla_days: 15,
        government_fee: 60.00,
        service_charge: 40.00,
        total_fee: 100.00
    },
    {
        service_code: "SVC-CERT-NAT",
        service_name: "Nativity Certificate",
        service_category: "Certificates",
        description: "Nativity certificate verifying geographic origin",
        required_documents: [
            { name: "Aadhaar Card", mandatory: true },
            { name: "School Study Certificate (5 years)", mandatory: true },
            { name: "Ration Card", mandatory: true },
            { name: "Birth Certificate", mandatory: false }
        ],
        estimated_processing_days: 7,
        sla_days: 15,
        government_fee: 60.00,
        service_charge: 40.00,
        total_fee: 100.00
    },
    {
        service_code: "SVC-CERT-RES",
        service_name: "Residence Certificate",
        service_category: "Certificates",
        description: "Residence certificate verifying current domicile status",
        required_documents: [
            { name: "Aadhaar Card", mandatory: true },
            { name: "Ration Card or Voter ID", mandatory: true },
            { name: "Rental Agreement or Land Deed", mandatory: true }
        ],
        estimated_processing_days: 7,
        sla_days: 15,
        government_fee: 60.00,
        service_charge: 40.00,
        total_fee: 100.00
    },
    {
        service_code: "SVC-CERT-BIRTH",
        service_name: "Birth Certificate",
        service_category: "Certificates",
        description: "Apply for or download birth registration certificate",
        required_documents: [
            { name: "Hospital Birth Report", mandatory: true },
            { name: "Aadhaar Card of Parents", mandatory: true },
            { name: "Address Proof of Parents", mandatory: false }
        ],
        estimated_processing_days: 5,
        sla_days: 10,
        government_fee: 0.00,
        service_charge: 30.00,
        total_fee: 30.00
    },
    {
        service_code: "SVC-CERT-DEATH",
        service_name: "Death Certificate",
        service_category: "Certificates",
        description: "Apply for or download death registration certificate",
        required_documents: [
            { name: "Hospital Death Report or Cremation Certificate", mandatory: true },
            { name: "Aadhaar Card of Deceased", mandatory: true },
            { name: "Aadhaar Card of Applicant", mandatory: false }
        ],
        estimated_processing_days: 5,
        sla_days: 10,
        government_fee: 0.00,
        service_charge: 30.00,
        total_fee: 30.00
    },
    {
        service_code: "SVC-CERT-MARR",
        service_name: "Marriage Certificate",
        service_category: "Certificates",
        description: "Registration of marriage and certificate issuance",
        required_documents: [
            { name: "Proof of Marriage (Invitation/Temple receipt)", mandatory: true },
            { name: "Aadhaar Card of Groom & Bride", mandatory: true },
            { name: "Age Proof", mandatory: true },
            { name: "Witness Identity Proofs", mandatory: true }
        ],
        estimated_processing_days: 15,
        sla_days: 30,
        government_fee: 100.00,
        service_charge: 100.00,
        total_fee: 200.00
    },
    {
        service_code: "SVC-TRANS-DL",
        service_name: "Driving License",
        service_category: "Transport",
        description: "Apply for a permanent Driving License",
        required_documents: [
            { name: "Learner License Number", mandatory: true },
            { name: "Address Proof", mandatory: true },
            { name: "Age Proof", mandatory: true },
            { name: "Form 1A Medical Certificate (if applicable)", mandatory: false }
        ],
        estimated_processing_days: 30,
        sla_days: 45,
        government_fee: 500.00,
        service_charge: 150.00,
        total_fee: 650.00
    },
    {
        service_code: "SVC-TRANS-LL",
        service_name: "Learner License",
        service_category: "Transport",
        description: "Apply for a Learner License",
        required_documents: [
            { name: "Aadhaar Card", mandatory: true },
            { name: "Age Proof", mandatory: true },
            { name: "Address Proof", mandatory: true },
            { name: "Passport Size Photo", mandatory: true }
        ],
        estimated_processing_days: 3,
        sla_days: 7,
        government_fee: 200.00,
        service_charge: 100.00,
        total_fee: 300.00
    },
    {
        service_code: "SVC-TRANS-TO",
        service_name: "Vehicle Transfer",
        service_category: "Transport",
        description: "Transfer of vehicle ownership (Transfer of Ownership)",
        required_documents: [
            { name: "Original RC Book", mandatory: true },
            { name: "Form 29 & 30", mandatory: true },
            { name: "Insurance Certificate", mandatory: true },
            { name: "Pollution Under Control (PUC) Certificate", mandatory: true },
            { name: "Aadhaar Card of Buyer & Seller", mandatory: true }
        ],
        estimated_processing_days: 25,
        sla_days: 45,
        government_fee: 300.00,
        service_charge: 200.00,
        total_fee: 500.00
    },
    {
        service_code: "SVC-PASS-NEW",
        service_name: "New Passport",
        service_category: "Passport",
        description: "Apply for a fresh Indian Passport",
        required_documents: [
            { name: "Aadhaar Card", mandatory: true },
            { name: "Birth Certificate or School Certificate", mandatory: true },
            { name: "Address Proof (Bank Statement/Utility Bill)", mandatory: true }
        ],
        estimated_processing_days: 30,
        sla_days: 60,
        government_fee: 1500.00,
        service_charge: 250.00,
        total_fee: 1750.00
    },
    {
        service_code: "SVC-PASS-REN",
        service_name: "Passport Renewal",
        service_category: "Passport",
        description: "Re-issue/Renewal of Indian Passport upon expiry",
        required_documents: [
            { name: "Old Passport (Original)", mandatory: true },
            { name: "Self-attested copies of first and last pages", mandatory: true },
            { name: "Aadhaar Card", mandatory: true }
        ],
        estimated_processing_days: 15,
        sla_days: 30,
        government_fee: 1500.00,
        service_charge: 250.00,
        total_fee: 1750.00
    },
    {
        service_code: "SVC-UTIL-EB",
        service_name: "EB Services",
        service_category: "Utility",
        description: "Electricity Bill (EB) payment and connection queries",
        required_documents: [
            { name: "Consumer Number", mandatory: true },
            { name: "Previous EB Bill (Optional)", mandatory: false }
        ],
        estimated_processing_days: 1,
        sla_days: 3,
        government_fee: 0.00,
        service_charge: 15.00,
        total_fee: 15.00
    },
    {
        service_code: "SVC-UTIL-GAS",
        service_name: "Gas Connection Services",
        service_category: "Utility",
        description: "Book new gas cylinder, transfer connection, or apply for new connection",
        required_documents: [
            { name: "Consumer Number", mandatory: true },
            { name: "Gas Card / Book", mandatory: true },
            { name: "Aadhaar Card", mandatory: false }
        ],
        estimated_processing_days: 2,
        sla_days: 5,
        government_fee: 0.00,
        service_charge: 20.00,
        total_fee: 20.00
    },
    {
        service_code: "SVC-GOVT-PEN",
        service_name: "Pension Services",
        service_category: "Government",
        description: "Apply for Old Age Pension (OAP), Widow Pension, or Disability Pension",
        required_documents: [
            { name: "Aadhaar Card", mandatory: true },
            { name: "Income Certificate", mandatory: true },
            { name: "Age Proof", mandatory: true },
            { name: "Bank Passbook", mandatory: true },
            { name: "Disability Certificate (if applicable)", mandatory: false }
        ],
        estimated_processing_days: 45,
        sla_days: 90,
        government_fee: 0.00,
        service_charge: 40.00,
        total_fee: 40.00
    },
    {
        service_code: "SVC-GOVT-RAT",
        service_name: "Ration Card Services",
        service_category: "Government",
        description: "Apply for new Smart Card, member addition, member deletion, or address change",
        required_documents: [
            { name: "Aadhaar Card of all family members", mandatory: true },
            { name: "Surrender Certificate (if family split)", mandatory: false },
            { name: "Address Proof", mandatory: true },
            { name: "Voter ID", mandatory: false }
        ],
        estimated_processing_days: 20,
        sla_days: 40,
        government_fee: 0.00,
        service_charge: 50.00,
        total_fee: 50.00
    },
    {
        service_code: "SVC-GOVT-PMK",
        service_name: "PM Kisan Application",
        service_category: "Government",
        description: "Register for PM Kisan Samman Nidhi Yojana (Farmers Income Support)",
        required_documents: [
            { name: "Land Patta Chitta Documents", mandatory: true },
            { name: "Aadhaar Card", mandatory: true },
            { name: "Bank Passbook", mandatory: true },
            { name: "Mobile number linked to Aadhaar", mandatory: false }
        ],
        estimated_processing_days: 15,
        sla_days: 30,
        government_fee: 0.00,
        service_charge: 30.00,
        total_fee: 30.00
    },
    {
        service_code: "SVC-GOVT-SCH",
        service_name: "Scholarship Applications",
        service_category: "Government",
        description: "Apply for Pre-Matric, Post-Matric or Higher Education Scholarships",
        required_documents: [
            { name: "Aadhaar Card", mandatory: true },
            { name: "Community Certificate", mandatory: true },
            { name: "Income Certificate", mandatory: true },
            { name: "Previous Marksheet", mandatory: true },
            { name: "College/School Study Certificate", mandatory: true },
            { name: "Fees Structure", mandatory: false }
        ],
        estimated_processing_days: 30,
        sla_days: 60,
        government_fee: 0.00,
        service_charge: 40.00,
        total_fee: 40.00
    }
];

/**
 * Creates a new service catalog entry.
 */
const createService = async (serviceData) => {
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
    } = serviceData;

    // Verify service code uniqueness
    const { data: existing, error: checkError } = await supabase
        .from('services')
        .select('id')
        .eq('service_code', service_code)
        .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
        throw new Error(`Service code "${service_code}" is already in use`);
    }

    const govFee = parseFloat(government_fee) || 0.00;
    const srvCharge = parseFloat(service_charge) || 0.00;
    const totalFee = govFee + srvCharge;

    const { data, error } = await supabase
        .from('services')
        .insert({
            service_code,
            service_name,
            service_category,
            description,
            required_documents,
            estimated_processing_days: parseInt(estimated_processing_days) || 0,
            sla_days: parseInt(sla_days) || 0,
            government_fee: govFee,
            service_charge: srvCharge,
            total_fee: totalFee,
            is_active: is_active !== undefined ? is_active : true
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Fetches services based on filters and pagination parameters.
 */
const getServices = async (filters = {}, pagination = {}) => {
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('services')
        .select('*', { count: 'exact' });

    // Category filter
    if (filters.category) {
        query = query.eq('service_category', filters.category);
    }

    // Active status filter
    if (filters.active !== undefined) {
        const isAct = filters.active === 'true' || filters.active === true;
        query = query.eq('is_active', isAct);
    }

    // Search filter matching name, code, or description
    if (filters.search) {
        query = query.or(`service_name.ilike.%${filters.search}%,service_code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Order and paginate
    const { data, count, error } = await query
        .order('service_name', { ascending: true })
        .range(from, to);

    if (error) throw error;

    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return {
        services: data || [],
        total,
        page,
        limit,
        pages
    };
};

/**
 * Fetches a service by its ID.
 */
const getServiceById = async (serviceId) => {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

    if (error || !data) {
        throw new Error('Service not found');
    }

    return data;
};

/**
 * Updates a service configuration.
 */
const updateService = async (serviceId, serviceData) => {
    const {
        service_name,
        service_category,
        description,
        required_documents,
        estimated_processing_days,
        sla_days,
        government_fee,
        service_charge,
        is_active
    } = serviceData;

    // Fetch the existing service to check current fees if one is missing in update payload
    const { data: current, error: getError } = await supabase
        .from('services')
        .select('government_fee, service_charge')
        .eq('id', serviceId)
        .single();

    if (getError || !current) {
        throw new Error('Service not found');
    }

    const finalGovFee = government_fee !== undefined ? parseFloat(government_fee) : parseFloat(current.government_fee);
    const finalSrvCharge = service_charge !== undefined ? parseFloat(service_charge) : parseFloat(current.service_charge);
    const totalFee = finalGovFee + finalSrvCharge;

    const updatePayload = {
        updated_at: new Date().toISOString()
    };

    if (service_name !== undefined) updatePayload.service_name = service_name;
    if (service_category !== undefined) updatePayload.service_category = service_category;
    if (description !== undefined) updatePayload.description = description;
    if (required_documents !== undefined) updatePayload.required_documents = required_documents;
    if (estimated_processing_days !== undefined) updatePayload.estimated_processing_days = parseInt(estimated_processing_days);
    if (sla_days !== undefined) updatePayload.sla_days = parseInt(sla_days);
    if (government_fee !== undefined) updatePayload.government_fee = finalGovFee;
    if (service_charge !== undefined) updatePayload.service_charge = finalSrvCharge;
    updatePayload.total_fee = totalFee;
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const { data, error } = await supabase
        .from('services')
        .update(updatePayload)
        .eq('id', serviceId)
        .select()
        .single();

    if (error || !data) {
        throw new Error('Service not found or update failed');
    }

    return data;
};

/**
 * Toggles the activation state of a service.
 */
const toggleServiceStatus = async (serviceId, isActive) => {
    const { data, error } = await supabase
        .from('services')
        .update({
            is_active: isActive,
            updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .select()
        .single();

    if (error || !data) {
        throw new Error('Service not found or update failed');
    }

    return data;
};

/**
 * Seeds pre-defined master E-Sevai services. Idempotent.
 */
const seedMasterServicesData = async () => {
    let seededCount = 0;
    let existingCount = 0;

    for (const service of MASTER_SERVICES) {
        const { data: existing, error: checkError } = await supabase
            .from('services')
            .select('id')
            .eq('service_code', service.service_code)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existing) {
            existingCount++;
        } else {
            const { error: insertError } = await supabase
                .from('services')
                .insert(service);

            if (insertError) throw insertError;
            seededCount++;
        }
    }

    return {
        seededCount,
        existingCount,
        totalInCatalog: seededCount + existingCount
    };
};

module.exports = {
    createService,
    getServices,
    getServiceById,
    updateService,
    toggleServiceStatus,
    seedMasterServicesData
};
