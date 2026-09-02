-- tiggl domain objects. Schema-qualified. Applied as tiggl_owner.
-- Does not grant anon/authenticated. Data API stays off.

CREATE TABLE tiggl.schema_migrations (
  version text PRIMARY KEY,
  name text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tiggl.schema_migrations IS
  'Tiggl migration ledger. Do not use supabase_migrations for app objects.';

CREATE TABLE tiggl.tiggl_high_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  score integer NOT NULL,
  level integer NOT NULL,
  elapsed_ms integer NOT NULL,
  cleared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tiggl_high_scores_player_name_len
    CHECK (char_length(player_name) >= 3 AND char_length(player_name) <= 12),
  CONSTRAINT tiggl_high_scores_player_name_charset
    CHECK (player_name ~ '^[A-Z0-9]+( [A-Z0-9]+)*$'),
  CONSTRAINT tiggl_high_scores_score_range
    CHECK (score >= 0 AND score <= 2000000),
  CONSTRAINT tiggl_high_scores_level_range
    CHECK (level >= 1 AND level <= 10),
  CONSTRAINT tiggl_high_scores_elapsed_range
    CHECK (elapsed_ms >= 0 AND elapsed_ms <= 86400000)
);

COMMENT ON TABLE tiggl.tiggl_high_scores IS 'All-time Tiggl arcade high scores';

CREATE INDEX tiggl_high_scores_rank_idx
  ON tiggl.tiggl_high_scores (score DESC, elapsed_ms, created_at);

CREATE OR REPLACE FUNCTION tiggl.tiggl_high_scores_normalize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  normalized text;
  compact text;
  blocked text[] := ARRAY[
    'ANAL', 'ANUS', 'ARSE', 'ASS', 'ASSHOLE', 'BALLS', 'BASTARD', 'BITCH',
    'BOLLOCKS', 'BONER', 'BOOB', 'BOOBS', 'COCK', 'COON', 'CUM', 'CUNT',
    'DICK', 'DYKE', 'FAG', 'FAGGOT', 'FCUK', 'FCK', 'FUK', 'FUCK', 'HITLER',
    'HOMO', 'JIZZ', 'KYS', 'MILF', 'NAZI', 'NIGGA', 'NIGGER', 'PAEDO', 'PEDO',
    'PENIS', 'PISS', 'PORN', 'PRICK', 'PUSSY', 'RAPE', 'RAPIST', 'RETARD',
    'SHIT', 'SLUT', 'SPASTIC', 'TITS', 'TWAT', 'VAGINA', 'WANK', 'WANKER',
    'WHORE'
  ];
  word text;
  blocked_word text;
BEGIN
  IF NEW.player_name IS NULL THEN
    RAISE EXCEPTION 'Enter a name';
  END IF;

  normalized := upper(trim(regexp_replace(NEW.player_name, '\s+', ' ', 'g')));
  compact := translate(
    regexp_replace(
      replace(replace(normalized, '@', 'A'), '$', 'S'),
      '[^A-Z0-9]',
      '',
      'g'
    ),
    '013457',
    'OIEAST'
  );

  IF char_length(normalized) < 3 OR char_length(normalized) > 12 THEN
    RAISE EXCEPTION 'Name must be 3 to 12 characters';
  END IF;

  IF normalized !~ '^[A-Z0-9]+( [A-Z0-9]+)*$' THEN
    RAISE EXCEPTION 'Use letters and numbers only';
  END IF;

  IF compact = ANY (blocked) THEN
    RAISE EXCEPTION 'Choose a different name';
  END IF;

  FOREACH word IN ARRAY string_to_array(normalized, ' ') LOOP
    IF translate(word, '013457', 'OIEAST') = ANY (blocked) THEN
      RAISE EXCEPTION 'Choose a different name';
    END IF;
  END LOOP;

  FOREACH blocked_word IN ARRAY blocked LOOP
    IF char_length(blocked_word) >= 4 AND strpos(compact, blocked_word) > 0 THEN
      RAISE EXCEPTION 'Choose a different name';
    END IF;
  END LOOP;

  NEW.player_name := normalized;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION tiggl.tiggl_high_scores_normalize() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION tiggl.tiggl_high_scores_normalize() TO tiggl_runtime;
GRANT EXECUTE ON FUNCTION tiggl.tiggl_high_scores_normalize() TO tiggl_migrator;

CREATE TRIGGER tiggl_high_scores_normalize
  BEFORE INSERT ON tiggl.tiggl_high_scores
  FOR EACH ROW
  EXECUTE FUNCTION tiggl.tiggl_high_scores_normalize();

ALTER TABLE tiggl.tiggl_high_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY tiggl_high_scores_runtime_all
  ON tiggl.tiggl_high_scores
  FOR ALL
  TO tiggl_runtime
  USING (true)
  WITH CHECK (true);

CREATE POLICY tiggl_high_scores_migrator_all
  ON tiggl.tiggl_high_scores
  FOR ALL
  TO tiggl_migrator
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE tiggl.tiggl_high_scores FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tiggl.tiggl_high_scores TO tiggl_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tiggl.tiggl_high_scores TO tiggl_migrator;

REVOKE ALL ON TABLE tiggl.schema_migrations FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE tiggl.schema_migrations TO tiggl_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tiggl.schema_migrations TO tiggl_migrator;

INSERT INTO tiggl.schema_migrations (version, name)
VALUES ('20260901120000', 'tiggl_high_scores');
