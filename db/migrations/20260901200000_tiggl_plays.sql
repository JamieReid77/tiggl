-- Play log. One row per finished round. Schema-qualified. Applied as tiggl_owner.

CREATE TABLE tiggl.tiggl_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tiggl.tiggl_plays IS 'One row per finished Tiggl round.';

CREATE INDEX tiggl_plays_created_at_idx ON tiggl.tiggl_plays (created_at);

ALTER TABLE tiggl.tiggl_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY tiggl_plays_runtime_all
  ON tiggl.tiggl_plays
  FOR ALL
  TO tiggl_runtime
  USING (true)
  WITH CHECK (true);

CREATE POLICY tiggl_plays_migrator_all
  ON tiggl.tiggl_plays
  FOR ALL
  TO tiggl_migrator
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE tiggl.tiggl_plays FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE tiggl.tiggl_plays TO tiggl_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tiggl.tiggl_plays TO tiggl_migrator;

INSERT INTO tiggl.schema_migrations (version, name)
VALUES ('20260901200000', 'tiggl_plays');
