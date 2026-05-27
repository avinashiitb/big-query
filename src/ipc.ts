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
        return api.messaging.invoke('plugin-backend-execute', { pluginId: 'redash', method: 'testConnection', config: payload });
      }
      if (channel === 'delete-connection' && api.deleteConnection) {
        return api.deleteConnection(payload?.id || payload);
      }
      if (channel === 'get-databases') {
        const raw = await api.messaging.invoke('plugin-backend-execute', { pluginId: 'redash', method: 'getDatabases', configId: payload?.configId || payload });
        if (Array.isArray(raw)) {
          if (raw.length === 0) return [];
          if (typeof raw[0] === 'string') return raw;
          const key = Object.keys(raw[0]).find(k => typeof raw[0][k] === 'string');
          return key ? raw.map((r: any) => r[key]).filter(Boolean) : raw;
        }
        return raw ?? [];
      }
      if (channel === 'get-database-tables') {
        return api.messaging.invoke('plugin-backend-execute', { pluginId: 'redash', method: 'getTables', configId: payload?.configId || payload, args: [payload?.database] });
      }
      if (channel === 'run-db-query' || channel === 'execute-query') {
        return api.messaging.invoke('plugin-backend-execute', { pluginId: 'redash', method: 'executeQuery', configId: payload?.configId || payload?.connectionId, args: [payload?.query, payload?.database] });
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
    
    // Mock responses based on channel
    if (channel === 'getConfiguredTools' || channel === 'get-connections') {
      return [
        { id: 1, name: 'Local PostgreSQL', type: 'postgresql', host: 'localhost', port: 5432, username: 'postgres' },
        { id: 2, name: 'Production MongoDB', type: 'mongodb', host: 'cluster.mongodb.net', port: 27017, username: 'admin' },
        { id: 3, name: 'shop_production', type: 'mysql', host: 'prod-mysql.internal', port: 3306, username: 'admin' }
      ];
    }
    if (channel === 'get-databases') {
      return ['public', 'information_schema', 'mysql', 'performance_schema'];
    }
    if (channel === 'get-database-tables') {
      return [
        { 
          name: 'customers', 
          type: 'table',
          columns: [
            { name: 'id', type: 'BIGINT', isPrimary: true },
            { name: 'email', type: 'VARCHAR(255)' },
            { name: 'first_name', type: 'VARCHAR(80)' },
            { name: 'last_name', type: 'VARCHAR(80)' },
            { name: 'created_at', type: 'DATETIME' },
            { name: 'country', type: 'CHAR(2)' }
          ]
        },
        { name: 'orders', type: 'table', columns: Array(6).fill({ name: 'col', type: 'VARCHAR' }) },
        { name: 'order_items', type: 'table', columns: Array(5).fill({ name: 'col', type: 'VARCHAR' }) },
        { name: 'products', type: 'table', columns: Array(6).fill({ name: 'col', type: 'VARCHAR' }) },
        { name: 'categories', type: 'table', columns: Array(3).fill({ name: 'col', type: 'VARCHAR' }) },
        { name: 'addresses', type: 'table', columns: Array(5).fill({ name: 'col', type: 'VARCHAR' }) },
        { name: 'payments', type: 'table', columns: Array(5).fill({ name: 'col', type: 'VARCHAR' }) },
        { 
          name: 'active_users_view', 
          type: 'view',
          columns: [
            { name: 'id', type: 'BIGINT' },
            { name: 'email', type: 'VARCHAR(255)' }
          ]
        },
        { 
          name: 'monthly_sales_view', 
          type: 'view',
          columns: [
            { name: 'month', type: 'VARCHAR(7)' },
            { name: 'total_sales', type: 'DECIMAL' }
          ]
        },
        { name: 'calculate_revenue', type: 'procedure' },
        { name: 'archive_old_orders', type: 'procedure' }
      ];
    }
    if (channel === 'run-db-query' || channel === 'execute-query') {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        executionTime: 142,
        size: '4.2 KB',
        columns: [
            { key: "id", label: "id", type: "BIGINT" },
            { key: "email", label: "email", type: "VARCHAR" },
            { key: "first_name", label: "first_name", type: "VARCHAR" },
            { key: "last_name", label: "last_name", type: "VARCHAR" },
            { key: "country", label: "country", type: "CHAR(2)" },
            { key: "orders_count", label: "orders_count", type: "BIGINT" },
            { key: "revenue_usd", label: "revenue_usd", type: "DECIMAL" },
            { key: "last_order_at", label: "last_order_at", type: "DATETIME" },
        ],
        data: [
            { id: 10472, email: "amelia.zhao@studio.io", first_name: "Amelia", last_name: "Zhao", country: "SG", orders_count: 14, revenue_usd: 4218.40, last_order_at: "2026-05-04 19:42:11" },
            { id: 10488, email: "marcus.weil@hover.dev", first_name: "Marcus", last_name: "Weil", country: "DE", orders_count: 11, revenue_usd: 3984.10, last_order_at: "2026-05-05 08:11:02" },
            { id: 10301, email: "priya.r@northcurve.com", first_name: "Priya", last_name: "Ramesh", country: "IN", orders_count: 9, revenue_usd: 3611.55, last_order_at: "2026-05-03 22:18:47" },
            { id: 10001, email: "jonas.k@aurora.io", first_name: "Jonas", last_name: "Karlsen", country: "NO", orders_count: 12, revenue_usd: 3450.00, last_order_at: "2026-05-04 11:02:33" },
            { id: 10090, email: "lin.song@nxlabs.cn", first_name: "Lin", last_name: "Song", country: "CN", orders_count: 8, revenue_usd: 3287.92, last_order_at: "2026-05-02 05:55:10" },
            { id: 10520, email: "sara.bennett@figfox.co", first_name: "Sara", last_name: "Bennett", country: "GB", orders_count: 10, revenue_usd: 3144.20, last_order_at: "2026-05-05 14:33:00" },
            { id: 10355, email: "r.alvarez@bramble.mx", first_name: "Raul", last_name: "Alvarez", country: "MX", orders_count: 7, revenue_usd: 2998.66, last_order_at: "2026-05-04 02:10:55" },
            { id: 10812, email: "h.tanaka@kiri.jp", first_name: "Haru", last_name: "Tanaka", country: "JP", orders_count: 9, revenue_usd: 2911.05, last_order_at: "2026-05-05 09:48:21" },
            { id: 10145, email: "mira.k@orbital.io", first_name: "Mira", last_name: "Khan", country: "AE", orders_count: 6, revenue_usd: 2740.38, last_order_at: "2026-05-01 17:21:09" },
            { id: 10711, email: "oliver.b@plainsail.au", first_name: "Oliver", last_name: "Brunet", country: "AU", orders_count: 8, revenue_usd: 2655.99, last_order_at: "2026-05-04 23:55:01" },
            { id: 10202, email: "noah.fischer@wisp.de", first_name: "Noah", last_name: "Fischer", country: "DE", orders_count: 7, revenue_usd: 2522.45, last_order_at: "2026-05-03 12:09:43" },
            { id: 10498, email: "eve.martin@quill.fr", first_name: "Eve", last_name: "Martin", country: "FR", orders_count: 6, revenue_usd: 2487.18, last_order_at: "2026-05-04 15:38:19" },
            { id: 10570, email: "k.silva@trail.br", first_name: "Karol", last_name: "Silva", country: "BR", orders_count: 9, revenue_usd: 2410.88, last_order_at: "2026-05-05 04:20:54" },
            { id: 10880, email: "p.dewi@bali.id", first_name: "Putri", last_name: "Dewi", country: "ID", orders_count: 5, revenue_usd: 2255.28, last_order_at: "2026-05-02 19:11:32" },
            { id: 10122, email: "omar.h@dune.eg", first_name: "Omar", last_name: "Hassan", country: "EG", orders_count: 6, revenue_usd: 2188.75, last_order_at: "2026-05-03 08:44:17" }
        ]
      };
    }
    
    return { success: true };
  }
};
