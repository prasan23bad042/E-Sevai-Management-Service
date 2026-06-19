const supabase = require('../config/supabase');

/**
 * Log the generated report to the report_exports audit table
 */
const logReportExport = async (userId, reportType, filters, format) => {
    try {
        await supabase
            .from('report_exports')
            .insert({
                user_id: userId,
                report_type: reportType,
                filters: filters || {},
                export_format: format
            });
    } catch (err) {
        console.error('[Report Audit] Failed to log report export:', err.message);
    }
};

/**
 * Mock report email scheduling hook
 */
const scheduleReportMail = async (userId, reportType, cronExpression) => {
    console.log(`[Schedule Setup] Automated report "${reportType}" scheduled with Cron "${cronExpression}" for user ${userId}`);
    return { success: true, message: `Report scheduling registered successfully for cron: ${cronExpression}` };
};

/**
 * Scopes query based on user roles (Admins see all, Owner/Manager see center, Staff see assigned only)
 */
const applyRoleFilters = async (userId, query, centerField = 'center_id', staffField = 'assigned_staff_id') => {
    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
    const role = user?.role;

    if (role === 'staff') {
        if (staffField) {
            return query.eq(staffField, userId);
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

        if (centerId && centerField) {
            return query.eq(centerField, centerId);
        } else {
            return query.eq(centerField, '00000000-0000-0000-0000-000000000000'); // empty results block
        }
    }
    return query;
};

/**
 * 1. Applications Report Data
 */
const getApplicationsReport = async (userId, filters = {}) => {
    let query = supabase
        .from('applications')
        .select('*, services(service_name), centers(name)');

    query = await applyRoleFilters(userId, query);

    // Apply query filters
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.service) query = query.eq('service_id', filters.service);
    if (filters.staff) query = query.eq('assigned_staff_id', filters.staff);
    if (filters.center) query = query.eq('center_id', filters.center);
    if (filters.date_start) query = query.gte('submitted_at', filters.date_start);
    if (filters.date_end) query = query.lte('submitted_at', filters.date_end);

    const { data, error } = await query.order('submitted_at', { ascending: false });
    if (error) throw error;

    return (data || []).map(a => {
        const now = new Date();
        const due = new Date(a.due_date);
        const isBreached = (!a.completed_at && due < now) || (a.completed_at && new Date(a.completed_at) > due);
        
        return {
            'Application Number': a.application_number,
            'Customer Name': a.customer_name,
            'Customer Phone': a.customer_phone || 'N/A',
            'Service': a.services?.service_name || 'N/A',
            'Center': a.centers?.name || 'N/A',
            'Status': a.status.toUpperCase(),
            'SLA Due Date': a.due_date ? new Date(a.due_date).toLocaleDateString() : 'N/A',
            'Submitted Date': a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : 'N/A',
            'Completed Date': a.completed_at ? new Date(a.completed_at).toLocaleDateString() : 'N/A',
            'SLA Breached': isBreached ? 'YES' : 'NO'
        };
    });
};

/**
 * 2. Revenue Report Data
 */
const getRevenueReport = async (userId, filters = {}) => {
    let query = supabase
        .from('payments')
        .select('*, centers(name)');

    query = await applyRoleFilters(userId, query);

    // Apply query filters
    if (filters.status) query = query.eq('payment_status', filters.status);
    if (filters.service) query = query.eq('service_id', filters.service);
    if (filters.center) query = query.eq('center_id', filters.center);
    if (filters.date_start) query = query.gte('paid_at', filters.date_start);
    if (filters.date_end) query = query.lte('paid_at', filters.date_end);
    if (filters.method) query = query.eq('payment_method', filters.method);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return (data || []).map(p => ({
        'Payment Number': p.payment_number,
        'Application Number': p.payment_snapshot?.application_number || 'N/A',
        'Customer Name': p.customer_name,
        'Center': p.centers?.name || 'N/A',
        'Service Name': p.payment_snapshot?.service_name || 'N/A',
        'Government Fee (Rs.)': parseFloat(p.government_fee).toFixed(2),
        'Service Charge (Rs.)': parseFloat(p.service_charge).toFixed(2),
        'Total Amount (Rs.)': parseFloat(p.total_amount).toFixed(2),
        'Payment Method': p.payment_method ? p.payment_method.toUpperCase() : 'N/A',
        'Status': p.payment_status.toUpperCase(),
        'Paid At': p.paid_at ? new Date(p.paid_at).toLocaleString() : 'N/A'
    }));
};

/**
 * 3. Center Performance Report Data
 */
const getCentersPerformanceReport = async (userId, filters = {}) => {
    let centersQuery = supabase.from('centers').select('id, name, center_code, created_at');
    
    // Scopes to single center if owner/manager
    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
    if (user?.role === 'center_owner' || user?.role === 'manager') {
        centersQuery = await applyRoleFilters(userId, centersQuery, 'id', null);
    } else if (user?.role !== 'platform_admin') {
        throw new Error('Access Denied: Performance reports secured');
    }

    const { data: centers } = await centersQuery;
    const report = [];

    for (const c of centers || []) {
        let appsQuery = supabase.from('applications').select('status, submitted_at, completed_at, due_date').eq('center_id', c.id);
        let paymentsQuery = supabase.from('payments').select('total_amount, government_fee, service_charge').eq('center_id', c.id).eq('payment_status', 'paid');

        if (filters.date_start) {
            appsQuery = appsQuery.gte('submitted_at', filters.date_start);
            paymentsQuery = paymentsQuery.gte('paid_at', filters.date_start);
        }
        if (filters.date_end) {
            appsQuery = appsQuery.lte('submitted_at', filters.date_end);
            paymentsQuery = paymentsQuery.lte('paid_at', filters.date_end);
        }

        const { data: apps } = await appsQuery;
        const { data: payments } = await paymentsQuery;

        const totalApps = apps?.length || 0;
        const completedApps = apps?.filter(a => a.status === 'completed') || [];
        const completedCount = completedApps.length;

        // SLA breach checks
        let slaBreaches = 0;
        let totalProcessingTimeMs = 0;

        (apps || []).forEach(a => {
            const due = new Date(a.due_date);
            const now = new Date();
            const isBreached = (!a.completed_at && due < now) || (a.completed_at && new Date(a.completed_at) > due);
            if (isBreached) slaBreaches++;

            if (a.completed_at && a.submitted_at) {
                totalProcessingTimeMs += (new Date(a.completed_at) - new Date(a.submitted_at));
            }
        });

        const avgProcessingDays = completedCount > 0 
            ? Math.round(totalProcessingTimeMs / (completedCount * 24 * 60 * 60 * 1000)) 
            : 0;

        let totalRevenue = 0;
        let govRevenue = 0;
        let centerRevenue = 0;

        (payments || []).forEach(p => {
            totalRevenue += parseFloat(p.total_amount) || 0;
            govRevenue += parseFloat(p.government_fee) || 0;
            centerRevenue += parseFloat(p.service_charge) || 0;
        });

        // Active staff count
        const { count: staffCount } = await supabase.from('center_staff').select('*', { count: 'exact', head: true }).eq('center_id', c.id).eq('is_active', true);

        report.push({
            'Center Code': c.center_code,
            'Center Name': c.name,
            'Total Applications': totalApps,
            'Completed Applications': completedCount,
            'SLA Breaches': slaBreaches,
            'Average Processing (Days)': avgProcessingDays,
            'Staff Count': staffCount || 0,
            'Government Revenue (Rs.)': govRevenue.toFixed(2),
            'Center Revenue (Rs.)': centerRevenue.toFixed(2),
            'Total Revenue (Rs.)': totalRevenue.toFixed(2)
        });
    }

    return report;
};

/**
 * 4. Staff Performance Scorecard Report
 */
const getStaffPerformanceReport = async (userId, filters = {}) => {
    let staffQuery = supabase.from('center_staff').select('user_id, center_id, role, users(full_name, email), centers(name)').eq('is_active', true);

    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
    if (user?.role === 'center_owner' || user?.role === 'manager') {
        staffQuery = await applyRoleFilters(userId, staffQuery, 'center_id', null);
    } else if (user?.role !== 'platform_admin') {
        throw new Error('Access Denied');
    }

    const { data: staffList } = await staffQuery;
    const report = [];

    for (const s of staffList || []) {
        if (!s.users) continue;
        
        let appsQuery = supabase
            .from('applications')
            .select('status, submitted_at, completed_at, due_date')
            .eq('assigned_staff_id', s.user_id);

        if (filters.date_start) appsQuery = appsQuery.gte('submitted_at', filters.date_start);
        if (filters.date_end) appsQuery = appsQuery.lte('submitted_at', filters.date_end);

        const { data: apps } = await appsQuery;

        const totalAssigned = apps?.length || 0;
        const completedApps = apps?.filter(a => a.status === 'completed') || [];
        const completedCount = completedApps.length;

        let slaBreaches = 0;
        let totalTime = 0;

        (apps || []).forEach(a => {
            const due = new Date(a.due_date);
            const now = new Date();
            if ((!a.completed_at && due < now) || (a.completed_at && new Date(a.completed_at) > due)) {
                slaBreaches++;
            }
            if (a.completed_at && a.submitted_at) {
                totalTime += (new Date(a.completed_at) - new Date(a.submitted_at));
            }
        });

        const avgProcessingDays = completedCount > 0 
            ? Math.round(totalTime / (completedCount * 24 * 60 * 60 * 1000))
            : 0;

        // Document verifications count by this staff
        const { count: docsCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('verified_by', s.user_id);

        report.push({
            'Staff Name': s.users.full_name,
            'Email': s.users.email,
            'Center': s.centers?.name || 'N/A',
            'Role': s.role.toUpperCase(),
            'Assigned Applications': totalAssigned,
            'Completed Applications': completedCount,
            'SLA Breaches': slaBreaches,
            'Avg Turnaround (Days)': avgProcessingDays,
            'Docs Verified': docsCount || 0
        });
    }

    return report;
};

/**
 * 5. Service Catalog Usage Report
 */
const getServiceUsageReport = async (userId, filters = {}) => {
    let serviceQuery = supabase.from('services').select('id, service_code, service_name, total_fee');
    const { data: services } = await serviceQuery;
    const report = [];

    for (const s of services || []) {
        let appsQuery = supabase.from('applications').select('id, status').eq('service_id', s.id);
        let paymentsQuery = supabase.from('payments').select('total_amount, government_fee, service_charge').eq('service_id', s.id).eq('payment_status', 'paid');

        appsQuery = await applyRoleFilters(userId, appsQuery);
        paymentsQuery = await applyRoleFilters(userId, paymentsQuery);

        if (filters.date_start) {
            appsQuery = appsQuery.gte('submitted_at', filters.date_start);
            paymentsQuery = paymentsQuery.gte('paid_at', filters.date_start);
        }
        if (filters.date_end) {
            appsQuery = appsQuery.lte('submitted_at', filters.date_end);
            paymentsQuery = paymentsQuery.lte('paid_at', filters.date_end);
        }

        const { data: apps } = await appsQuery;
        const { data: payments } = await paymentsQuery;

        const totalApps = apps?.length || 0;
        const completedCount = apps?.filter(a => a.status === 'completed').length || 0;

        let totalRev = 0;
        let govRev = 0;
        let srvRev = 0;

        (payments || []).forEach(p => {
            totalRev += parseFloat(p.total_amount) || 0;
            govRev += parseFloat(p.government_fee) || 0;
            srvRev += parseFloat(p.service_charge) || 0;
        });

        report.push({
            'Service Code': s.service_code,
            'Service Name': s.service_name,
            'Total Applications': totalApps,
            'Completed Applications': completedCount,
            'Gov Revenue (Rs.)': govRev.toFixed(2),
            'Center Revenue (Rs.)': srvRev.toFixed(2),
            'Total Revenue (Rs.)': totalRev.toFixed(2)
        });
    }

    return report;
};

/**
 * 6. SLA Breach Details Report
 */
const getSlaBreachReport = async (userId, filters = {}) => {
    const nowStr = new Date().toISOString();
    let query = supabase
        .from('applications')
        .select('*, services(service_name), centers(name), users!applications_assigned_staff_id_fkey(full_name)');

    query = await applyRoleFilters(userId, query);

    query = query.not('status', 'in', '("completed","cancelled")').lt('due_date', nowStr);

    if (filters.service) query = query.eq('service_id', filters.service);
    if (filters.center) query = query.eq('center_id', filters.center);
    if (filters.staff) query = query.eq('assigned_staff_id', filters.staff);

    const { data, error } = await query.order('due_date', { ascending: true });
    if (error) throw error;

    return (data || []).map(a => {
        const due = new Date(a.due_date);
        const diffMs = Date.now() - due;
        const delayDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

        return {
            'Application Number': a.application_number,
            'Customer Name': a.customer_name,
            'Customer Phone': a.customer_phone || 'N/A',
            'Service': a.services?.service_name || 'N/A',
            'Center': a.centers?.name || 'N/A',
            'Assigned Staff': a.users?.full_name || 'UNASSIGNED',
            'Status': a.status.toUpperCase(),
            'SLA Due Date': new Date(a.due_date).toLocaleDateString(),
            'Delay (Days)': delayDays
        };
    });
};

/**
 * Converts tabular report array objects into a formatted CSV string
 */
const convertToCSV = (data) => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','), // header row
        ...data.map(row => 
            headers.map(fieldName => {
                const value = row[fieldName] !== undefined ? row[fieldName] : '';
                const stringified = typeof value === 'object' ? JSON.stringify(value) : String(value);
                // Escape quotes and wrap in quotes if contains commas/newlines
                const clean = stringified.replace(/"/g, '""');
                return clean.includes(',') || clean.includes('\n') || clean.includes('"') ? `"${clean}"` : clean;
            }).join(',')
        )
    ];
    return csvRows.join('\n');
};

/**
 * Converts data array to XML Spreadsheet 2003 schema compatible format or clean TSV compatible sheet
 */
const convertToExcel = (data) => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    
    // Tab Separated Values (TSV) is robustly opened by Excel natively, escaping cells with quotes.
    const rows = [
        headers.join('\t'),
        ...data.map(row => 
            headers.map(fieldName => {
                const value = row[fieldName] !== undefined ? row[fieldName] : '';
                const str = String(value).replace(/\t/g, ' ');
                return str.includes('\t') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
            }).join('\t')
        )
    ];
    
    // Add UTF-8 BOM prefix
    return '\uFEFF' + rows.join('\n');
};

/**
 * Generates an HTML report representation which visually mimics a styled PDF print page layout
 */
const convertToPDF = (reportType, filters, data) => {
    const printDate = new Date().toLocaleString();
    if (data.length === 0) {
        return `
        <html>
        <head><style>body { font-family: sans-serif; text-align: center; padding: 50px; }</style></head>
        <body>
            <h2>E-SEVAI SAAS SYSTEM REPORT</h2>
            <h3>${reportType.toUpperCase()}</h3>
            <p>No records found matching filters.</p>
        </body>
        </html>`;
    }

    const headers = Object.keys(data[0]);
    const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
    const rowsHtml = data.map(row => 
        `<tr>${headers.map(h => `<td>${row[h] !== undefined ? row[h] : ''}</td>`).join('')}</tr>`
    ).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${reportType} PDF Export</title>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 30px; }
            .header-container { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin: 0; }
            .meta { font-size: 12px; color: #666; margin-top: 5px; }
            .filters-box { background-color: #f3f4f6; border-radius: 6px; padding: 12px; margin-bottom: 30px; font-size: 13px; }
            .filters-box strong { color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { background-color: #3b82f6; color: white; text-align: left; padding: 10px; font-weight: 600; border: 1px solid #d1d5db; }
            td { padding: 8px 10px; border: 1px solid #d1d5db; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .summary-box { margin-top: 40px; padding: 15px; border-top: 2px solid #3b82f6; text-align: right; font-weight: bold; font-size: 14px; }
            .footer { margin-top: 60px; font-size: 10px; text-align: center; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        </style>
    </head>
    <body>
        <div class="header-container">
            <h1 class="title">E-Sevai SaaS Platform - Official Report</h1>
            <div class="meta">Generated At: ${printDate} | Scoped System Query</div>
        </div>

        <div class="filters-box">
            <strong>Report Type:</strong> ${reportType} <br/>
            <strong>Filters Active:</strong> ${JSON.stringify(filters)}
        </div>

        <table>
            <thead>
                <tr>${headerHtml}</tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        <div class="summary-box">
            Total Row Records count: ${data.length}
        </div>

        <div class="footer">
            Confidential Document - E-Sevai Management Service Admin Panel. Powered by Supabase & Express SaaS.
        </div>
    </body>
    </html>
    `;
};

module.exports = {
    logReportExport,
    scheduleReportMail,
    getApplicationsReport,
    getRevenueReport,
    getCentersPerformanceReport,
    getStaffPerformanceReport,
    getServiceUsageReport,
    getSlaBreachReport,
    convertToCSV,
    convertToExcel,
    convertToPDF
};
