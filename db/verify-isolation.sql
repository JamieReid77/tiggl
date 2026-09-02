-- Prove Tiggl runtime isolation on the shared host.

SELECT
  has_schema_privilege('tiggl_runtime', 'tiggl', 'USAGE') AS runtime_usage_domain,
  has_schema_privilege('tiggl_runtime', 'tiggl_auth', 'USAGE') AS runtime_usage_auth,
  NOT has_schema_privilege('tiggl_runtime', 'tiggl', 'CREATE') AS runtime_cannot_create,
  NOT has_schema_privilege('tiggl_runtime', 'watchlist', 'USAGE') AS no_watchlist,
  NOT has_schema_privilege('tiggl_runtime', 'watchlist_auth', 'USAGE') AS no_watchlist_auth,
  NOT has_schema_privilege('tiggl_runtime', 'buddywp', 'USAGE') AS no_buddywp,
  NOT has_schema_privilege('tiggl_runtime', 'buddywp_auth', 'USAGE') AS no_buddywp_auth,
  NOT has_schema_privilege('anon', 'tiggl', 'USAGE') AS anon_denied,
  NOT has_schema_privilege('authenticated', 'tiggl', 'USAGE') AS authenticated_denied,
  NOT has_schema_privilege('service_role', 'tiggl', 'USAGE') AS service_role_denied,
  has_table_privilege('tiggl_runtime', 'tiggl.tiggl_high_scores', 'SELECT') AS runtime_select,
  has_table_privilege('tiggl_runtime', 'tiggl.tiggl_high_scores', 'INSERT') AS runtime_insert,
  NOT has_table_privilege('anon', 'tiggl.tiggl_high_scores', 'SELECT') AS anon_no_select,
  NOT has_table_privilege('anon', 'tiggl.tiggl_high_scores', 'INSERT') AS anon_no_insert;
