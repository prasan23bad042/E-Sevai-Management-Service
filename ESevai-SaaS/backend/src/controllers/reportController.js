const {
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
} = require('../services/reportService');

/**
 * Utility to process report data output matching the format query
 */
const exportOutput = async (req, res, reportName, data) => {
    const format = req.query.export || 'json';

    // Log the report export request in auditing
    await logReportExport(req.user.id, reportName, req.query, format);

    if (format === 'csv') {
        const csvString = convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${reportName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv"`);
        return res.send(csvString);
    } 
    
    if (format === 'excel') {
        const excelString = convertToExcel(data);
        res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${reportName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.xls"`);
        return res.send(excelString);
    } 
    
    if (format === 'pdf') {
        const htmlLayout = convertToPDF(reportName, req.query, data);
        res.setHeader('Content-Type', 'text/html'); // Pipe formatted print-layout document
        res.setHeader('Content-Disposition', `attachment; filename="${reportName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.html"`);
        return res.send(htmlLayout);
    }

    // Default JSON
    res.json({
        success: true,
        report: reportName,
        total: data.length,
        data
    });
};

const applicationsReport = async (req, res) => {
    try {
        const data = await getApplicationsReport(req.user.id, req.query);
        await exportOutput(req, res, 'Applications Report', data);
    } catch (error) {
        console.error('Error generating applications report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const revenueReport = async (req, res) => {
    try {
        const data = await getRevenueReport(req.user.id, req.query);
        await exportOutput(req, res, 'Revenue Report', data);
    } catch (error) {
        console.error('Error generating revenue report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const centersPerformanceReport = async (req, res) => {
    try {
        const data = await getCentersPerformanceReport(req.user.id, req.query);
        await exportOutput(req, res, 'Center Performance Report', data);
    } catch (error) {
        console.error('Error generating centers report:', error);
        const code = error.message.includes('Access Denied') ? 403 : 500;
        res.status(code).json({ success: false, message: error.message });
    }
};

const staffPerformanceReport = async (req, res) => {
    try {
        const data = await getStaffPerformanceReport(req.user.id, req.query);
        await exportOutput(req, res, 'Staff Performance Report', data);
    } catch (error) {
        console.error('Error generating staff scorecard report:', error);
        const code = error.message.includes('Access Denied') ? 403 : 500;
        res.status(code).json({ success: false, message: error.message });
    }
};

const serviceUsageReport = async (req, res) => {
    try {
        const data = await getServiceUsageReport(req.user.id, req.query);
        await exportOutput(req, res, 'Service Usage Report', data);
    } catch (error) {
        console.error('Error generating service usage report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const slaBreachReport = async (req, res) => {
    try {
        const data = await getSlaBreachReport(req.user.id, req.query);
        await exportOutput(req, res, 'SLA Breach Report', data);
    } catch (error) {
        console.error('Error generating SLA breach report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const scheduleReport = async (req, res) => {
    try {
        const { report_type, cron_expression } = req.body;
        if (!report_type || !cron_expression) {
            return res.status(400).json({ success: false, message: 'report_type and cron_expression are required' });
        }
        const result = await scheduleReportMail(req.user.id, report_type, cron_expression);
        res.json(result);
    } catch (error) {
        console.error('Error scheduling report:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    applicationsReport,
    revenueReport,
    centersPerformanceReport,
    staffPerformanceReport,
    serviceUsageReport,
    slaBreachReport,
    scheduleReport
};
