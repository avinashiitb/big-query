export const ipc = {
  invoke: async (channel: string, payload?: any) => {
    const api = (window as any).pluginAPI;
    
    // Route to actual DevScribe APIs if available
    if (api) {
      if ((channel === 'getConfiguredTools' || channel === 'get-connections') && api.getConnections) {
        return api.getConnections();
      }
      if (channel === 'save-connection' && api.saveConnection) {
        return api.saveConnection(payload);
      }
      if (channel === 'test-connection') {
        return api.messaging.invoke('plugin-backend-execute', { pluginId: 'bigquery', method: 'testConnection', config: payload });
      }
      if (channel === 'delete-connection' && api.deleteConnection) {
        return api.deleteConnection(payload?.id || payload);
      }
      if (channel === 'get-databases') {
        const raw = await api.messaging.invoke('plugin-backend-execute', { pluginId: 'bigquery', method: 'getDatabases', configId: payload?.configId || payload });
        if (Array.isArray(raw)) {
          if (raw.length === 0) return [];
          if (typeof raw[0] === 'string') return raw;
          const key = Object.keys(raw[0]).find(k => typeof raw[0][k] === 'string');
          return key ? raw.map((r: any) => r[key]).filter(Boolean) : raw;
        }
        return raw ?? [];
      }
      if (channel === 'get-database-tables') {
        return api.messaging.invoke('plugin-backend-execute', { pluginId: 'bigquery', method: 'getTables', configId: payload?.configId || payload, args: [payload?.database] });
      }
      if (channel === 'run-db-query' || channel === 'execute-query') {
        return api.messaging.invoke('plugin-backend-execute', { pluginId: 'bigquery', method: 'executeQuery', configId: payload?.configId || payload?.connectionId, args: [payload?.query, payload?.database] });
      }
      if (channel === 'save-data' && api.saveData) {
        return api.saveData(payload);
      }
      if (channel === 'load-data' && api.loadData) {
        return api.loadData();
      }
      
      // Generic messaging fallback
      if (api.messaging) {
        return api.messaging.invoke(channel, payload);
      }
    }

    console.log(`[Mock IPC] invoked ${channel} with`, payload);
    
    // Mock responses based on channel for local testing
    if (channel === 'getConfiguredTools' || channel === 'get-connections') {
      return [
        { id: 1, name: 'GCP BigQuery Sandbox', type: 'bigquery', host: 'my-gcp-sandbox-project', database: 'ecommerce_dataset' },
        { id: 2, name: 'Production BigQuery', type: 'bigquery', host: 'company-prod-analytics', database: 'marketing_events' }
      ];
    }
    if (channel === 'get-databases') {
      return ['ecommerce_dataset', 'analytics_prod', 'bigquery-public-data.austin_bikeshare'];
    }
    if (channel === 'get-database-tables') {
      return [
        { 
          name: 'customers', 
          type: 'table',
          columns: [
            { name: 'customer_id', type: 'STRING', isPrimary: true },
            { name: 'email', type: 'STRING' },
            { name: 'first_name', type: 'STRING' },
            { name: 'last_name', type: 'STRING' },
            { name: 'created_at', type: 'TIMESTAMP' },
            { name: 'country_code', type: 'STRING' }
          ]
        },
        { 
          name: 'orders', 
          type: 'table', 
          columns: [
            { name: 'order_id', type: 'STRING', isPrimary: true },
            { name: 'customer_id', type: 'STRING' },
            { name: 'order_status', type: 'STRING' },
            { name: 'total_amount', type: 'NUMERIC' },
            { name: 'placed_at', type: 'TIMESTAMP' }
          ] 
        },
        { 
          name: 'active_customers_v', 
          type: 'view',
          columns: [
            { name: 'customer_id', type: 'STRING' },
            { name: 'email', type: 'STRING' },
            { name: 'orders_count', type: 'INT64' }
          ]
        }
      ];
    }
    if (channel === 'run-db-query' || channel === 'execute-query') {
      await new Promise(resolve => setTimeout(resolve, 400));
      return {
        success: true,
        executionTime: 185,
        size: '12.4 MB',
        bytesProcessed: 13002342,
        columns: [
            { key: "customer_id", label: "customer_id", type: "STRING" },
            { key: "email", label: "email", type: "STRING" },
            { key: "first_name", label: "first_name", type: "STRING" },
            { key: "last_name", label: "last_name", type: "STRING" },
            { key: "country_code", label: "country_code", type: "STRING" },
            { key: "orders_count", label: "orders_count", type: "INT64" },
            { key: "total_spent", label: "total_spent", type: "NUMERIC" },
            { key: "last_order_timestamp", label: "last_order_timestamp", type: "TIMESTAMP" },
        ],
        data: [
            { customer_id: "CUST-9012", email: "amelia.zhao@studio.io", first_name: "Amelia", last_name: "Zhao", country_code: "SG", orders_count: 14, total_spent: 4218.40, last_order_timestamp: "2026-05-04 19:42:11 UTC" },
            { customer_id: "CUST-4102", email: "marcus.weil@hover.dev", first_name: "Marcus", last_name: "Weil", country_code: "DE", orders_count: 11, total_spent: 3984.10, last_order_timestamp: "2026-05-05 08:11:02 UTC" },
            { customer_id: "CUST-1088", email: "priya.r@northcurve.com", first_name: "Priya", last_name: "Ramesh", country_code: "IN", orders_count: 9, total_spent: 3611.55, last_order_timestamp: "2026-05-03 22:18:47 UTC" }
        ]
      };
    }
    
    return { success: true };
  }
};
