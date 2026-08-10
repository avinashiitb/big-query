// Google BigQuery Backend Module for DevScribe Dynamic Execution
const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');

function getBigQueryClient(config) {
    const options = {};

    // GCP Project ID
    if (config.host || config.projectId) {
        const pId = (config.host || config.projectId || '').trim();
        if (pId && !pId.startsWith('{') && !pId.startsWith('http')) {
            options.projectId = pId;
        }
    }

    // Dataset Location (e.g. US, EU, asia-east1)
    if (config.location) {
        options.location = config.location.trim();
    }

    // Credentials / Service Account Key JSON or File Path
    const credInput = config.password || config.credentials || config.keyFilename;

    if (credInput) {
        const trimmed = typeof credInput === 'string' ? credInput.trim() : credInput;
        if (typeof trimmed === 'object') {
            options.credentials = trimmed;
            if (!options.projectId && trimmed.project_id) {
                options.projectId = trimmed.project_id;
            }
        } else if (typeof trimmed === 'string') {
            if (trimmed.startsWith('{')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    options.credentials = parsed;
                    if (!options.projectId && parsed.project_id) {
                        options.projectId = parsed.project_id;
                    }
                } catch (e) {
                    throw new Error("Invalid Service Account JSON key: " + e.message);
                }
            } else if (trimmed.endsWith('.json') || trimmed.includes('/') || trimmed.includes('\\')) {
                if (fs.existsSync(trimmed)) {
                    options.keyFilename = trimmed;
                } else {
                    try {
                        const parsed = JSON.parse(trimmed);
                        options.credentials = parsed;
                        if (!options.projectId && parsed.project_id) {
                            options.projectId = parsed.project_id;
                        }
                    } catch (e) {
                        throw new Error(`Service account file not found at path: ${trimmed}`);
                    }
                }
            }
        }
    }

    return new BigQuery(options);
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function testConnection(config) {
    try {
        const bigquery = getBigQueryClient(config);
        const [datasets] = await bigquery.getDatasets({ maxResults: 1 });
        const projectId = bigquery.projectId || config.projectId || config.host || 'BigQuery Project';
        return {
            success: true,
            message: `Successfully connected to BigQuery project "${projectId}" (${datasets.length} dataset(s) found)`
        };
    } catch (e) {
        return { success: false, message: e.message };
    }
}

async function getDatabases(config) {
    try {
        const bigquery = getBigQueryClient(config);
        const [datasets] = await bigquery.getDatasets();
        const dsList = datasets.map(d => d.id);
        if (config.database && !dsList.includes(config.database)) {
            dsList.unshift(config.database);
        }
        return dsList;
    } catch (e) {
        console.error("Failed to list BigQuery datasets:", e.message);
        return config.database ? [config.database] : [];
    }
}

async function getTables(config, database) {
    const datasetId = database || config.database;
    if (!datasetId) return [];

    try {
        const bigquery = getBigQueryClient(config);
        
        let bqDataset;
        if (datasetId.includes('.')) {
            const parts = datasetId.split('.');
            bqDataset = bigquery.dataset(parts[1], { projectId: parts[0] });
        } else {
            bqDataset = bigquery.dataset(datasetId);
        }

        const [tables] = await bqDataset.getTables();

        const tableSchemas = await Promise.all(tables.map(async (table) => {
            try {
                const [metadata] = await table.getMetadata();
                const rawType = (metadata.type || '').toUpperCase();
                const type = rawType === 'VIEW' || rawType === 'MATERIALIZED_VIEW' ? 'view' : 'table';
                const fields = metadata.schema?.fields || [];

                const columns = fields.map(f => ({
                    name: f.name,
                    type: f.type + (f.mode === 'REPEATED' ? '[]' : ''),
                    mode: f.mode || 'NULLABLE',
                    description: f.description || '',
                    isPrimary: false
                }));

                return {
                    name: table.id,
                    type: type,
                    columns: columns,
                    numRows: metadata.numRows ? Number(metadata.numRows) : 0,
                    numBytes: metadata.numBytes ? Number(metadata.numBytes) : 0,
                    creationTime: metadata.creationTime ? new Date(Number(metadata.creationTime)).toISOString() : null,
                    lastModifiedTime: metadata.lastModifiedTime ? new Date(Number(metadata.lastModifiedTime)).toISOString() : null
                };
            } catch (err) {
                return {
                    name: table.id,
                    type: 'table',
                    columns: []
                };
            }
        }));

        return tableSchemas;
    } catch (e) {
        console.error("Failed to get BigQuery tables:", e.message);
        throw new Error(`Failed to list tables for dataset '${datasetId}': ${e.message}`);
    }
}

async function executeQuery(config, query, database) {
    const startTime = performance.now();
    const datasetId = database || config.database;
    const bigquery = getBigQueryClient(config);

    try {
        const queryOptions = {
            query: query,
            useLegacySql: false,
            ...(datasetId ? { defaultDataset: { datasetId } } : {}),
            ...(config.location ? { location: config.location } : {})
        };

        const [job] = await bigquery.createQueryJob(queryOptions);
        const [rows] = await job.getQueryResults();
        const [metadata] = await job.getMetadata();

        const stats = metadata.statistics?.query || {};
        const bytesProcessed = stats.totalBytesProcessed ? Number(stats.totalBytesProcessed) : 0;
        const formattedBytes = formatBytes(bytesProcessed);

        let columns = [];
        const schemaFields = metadata.schema?.fields || (rows.length > 0 ? Object.keys(rows[0]).map(k => ({ name: k, type: typeof rows[0][k] })) : []);
        
        columns = schemaFields.map(f => ({
            key: f.name,
            label: f.name,
            type: f.type || 'STRING'
        }));

        const cleanRows = rows.map(row => {
            const item = {};
            for (const key of Object.keys(row)) {
                let val = row[key];
                if (val !== null && typeof val === 'object') {
                    if (val.value !== undefined) {
                        val = val.value;
                    } else if (Array.isArray(val)) {
                        val = val.map(v => (v && typeof v === 'object' && v.value !== undefined) ? v.value : v);
                    }
                }
                item[key] = val;
            }
            return item;
        });

        const executionTime = Math.round(performance.now() - startTime);

        return {
            success: true,
            executionTime,
            size: formattedBytes,
            bytesProcessed: bytesProcessed,
            columns,
            data: cleanRows,
            jobId: job.id,
            totalRows: stats.totalRows ? Number(stats.totalRows) : cleanRows.length,
            statementType: stats.statementType || 'SELECT'
        };
    } catch (e) {
        console.error("BigQuery query execution error:", e);
        throw new Error(e.message || "BigQuery query execution failed");
    }
}

module.exports = {
    testConnection,
    getDatabases,
    getTables,
    executeQuery
};
