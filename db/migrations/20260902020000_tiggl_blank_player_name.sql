-- Skipped name entry stores a blank player name, not ANON.

ALTER TABLE tiggl.tiggl_high_scores
  DROP CONSTRAINT tiggl_high_scores_player_name_len;

ALTER TABLE tiggl.tiggl_high_scores
  ADD CONSTRAINT tiggl_high_scores_player_name_len
    CHECK (
      char_length(player_name) = 0
      OR (
        char_length(player_name) >= 3
        AND char_length(player_name) <= 15
      )
    );

ALTER TABLE tiggl.tiggl_high_scores
  DROP CONSTRAINT tiggl_high_scores_player_name_charset;

ALTER TABLE tiggl.tiggl_high_scores
  ADD CONSTRAINT tiggl_high_scores_player_name_charset
    CHECK (
      player_name = ''
      OR player_name ~ '^[A-Z0-9]+( [A-Z0-9]+)*$'
    );

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
    NEW.player_name := '';
    RETURN NEW;
  END IF;

  normalized := upper(trim(regexp_replace(NEW.player_name, '\s+', ' ', 'g')));

  IF normalized = '' OR normalized = 'ANON' THEN
    NEW.player_name := '';
    RETURN NEW;
  END IF;

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

  IF char_length(normalized) < 3 OR char_length(normalized) > 15 THEN
    RAISE EXCEPTION 'Name must be 3 to 15 characters';
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

UPDATE tiggl.tiggl_high_scores
SET player_name = ''
WHERE player_name = 'ANON';

INSERT INTO tiggl.schema_migrations (version, name)
VALUES ('20260902020000', 'tiggl_blank_player_name');
