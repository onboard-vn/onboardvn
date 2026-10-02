CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"user_id" text,
	"club_id" uuid,
	"display_name" text NOT NULL,
	"birth_year" smallint,
	"invited_by_identity_id" uuid,
	"external_source" text,
	"external_id" text,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identities_birth_year_chk" CHECK ("identities"."birth_year" is null or "identities"."kind" = 'guest'),
	CONSTRAINT "identities_external_chk" CHECK ("identities"."kind" <> 'external' or ("identities"."external_id" is not null and "identities"."club_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "identity_claim_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"requester_user_id" text NOT NULL,
	"table_id" uuid,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity_claim_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_claim_tokens_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "meetup_table_identities" (
	"table_id" uuid NOT NULL,
	"identity_id" uuid NOT NULL,
	CONSTRAINT "meetup_table_identities_table_id_identity_id_pk" PRIMARY KEY("table_id","identity_id")
);
--> statement-breakpoint
CREATE TABLE "play_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"play_id" uuid NOT NULL,
	"rev" integer NOT NULL,
	"actor_user_id" text,
	"identity_id" uuid,
	"action" text NOT NULL,
	"category_key" text,
	"round_index" smallint,
	"old_value" jsonb,
	"new_value" jsonb,
	"client_op_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play_players" (
	"play_id" uuid NOT NULL,
	"identity_id" uuid NOT NULL,
	"seat" smallint NOT NULL,
	"team" text,
	"role" text,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rounds" jsonb,
	"computed" jsonb,
	"is_winner_override" boolean,
	CONSTRAINT "play_players_play_id_identity_id_pk" PRIMARY KEY("play_id","identity_id")
);
--> statement-breakpoint
CREATE TABLE "plays" (
	"id" uuid PRIMARY KEY NOT NULL,
	"club_id" uuid,
	"meetup_table_id" uuid,
	"game_id" uuid NOT NULL,
	"score_template_id" uuid,
	"template_version" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"outcome" text,
	"rev" integer DEFAULT 0 NOT NULL,
	"edited_after_final" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plays_template_pin_chk" CHECK (("plays"."score_template_id" is null) = ("plays"."template_version" is null))
);
--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_invited_by_identity_id_identities_id_fk" FOREIGN KEY ("invited_by_identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_claim_requests" ADD CONSTRAINT "identity_claim_requests_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_claim_requests" ADD CONSTRAINT "identity_claim_requests_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_claim_requests" ADD CONSTRAINT "identity_claim_requests_table_id_meetup_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."meetup_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_claim_requests" ADD CONSTRAINT "identity_claim_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_claim_tokens" ADD CONSTRAINT "identity_claim_tokens_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_claim_tokens" ADD CONSTRAINT "identity_claim_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetup_table_identities" ADD CONSTRAINT "meetup_table_identities_table_id_meetup_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."meetup_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetup_table_identities" ADD CONSTRAINT "meetup_table_identities_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_events" ADD CONSTRAINT "play_events_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_events" ADD CONSTRAINT "play_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_events" ADD CONSTRAINT "play_events_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_players" ADD CONSTRAINT "play_players_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_players" ADD CONSTRAINT "play_players_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_meetup_table_id_meetup_tables_id_fk" FOREIGN KEY ("meetup_table_id") REFERENCES "public"."meetup_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_score_template_id_score_templates_id_fk" FOREIGN KEY ("score_template_id") REFERENCES "public"."score_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identities_member_user_uidx" ON "identities" USING btree ("user_id") WHERE "identities"."kind" = 'member';--> statement-breakpoint
CREATE UNIQUE INDEX "identities_external_uidx" ON "identities" USING btree ("club_id","external_id") WHERE "identities"."kind" = 'external';--> statement-breakpoint
CREATE INDEX "identities_user_id_idx" ON "identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "identities_club_id_idx" ON "identities" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "identities_invited_by_idx" ON "identities" USING btree ("invited_by_identity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_claim_requests_pending_uidx" ON "identity_claim_requests" USING btree ("identity_id","requester_user_id") WHERE "identity_claim_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "identity_claim_requests_identity_idx" ON "identity_claim_requests" USING btree ("identity_id","status");--> statement-breakpoint
CREATE INDEX "identity_claim_tokens_identity_idx" ON "identity_claim_tokens" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "meetup_table_identities_identity_idx" ON "meetup_table_identities" USING btree ("identity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "play_events_play_op_uidx" ON "play_events" USING btree ("play_id","client_op_id") WHERE "play_events"."client_op_id" is not null;--> statement-breakpoint
CREATE INDEX "play_events_play_rev_idx" ON "play_events" USING btree ("play_id","rev");--> statement-breakpoint
CREATE INDEX "play_players_identity_idx" ON "play_players" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "plays_created_by_idx" ON "plays" USING btree ("created_by","started_at");--> statement-breakpoint
CREATE INDEX "plays_club_started_idx" ON "plays" USING btree ("club_id","started_at");--> statement-breakpoint
CREATE INDEX "plays_meetup_table_idx" ON "plays" USING btree ("meetup_table_id");--> statement-breakpoint
CREATE INDEX "plays_game_idx" ON "plays" USING btree ("game_id");--> statement-breakpoint
INSERT INTO "identities" ("kind", "user_id", "display_name")
SELECT 'member', u."id", u."name"
FROM "users" u
WHERE u."id" IN (SELECT "user_id" FROM "club_members");
--> statement-breakpoint
INSERT INTO "identities" ("kind", "user_id", "club_id", "display_name", "external_source", "external_id")
SELECT 'external', m."user_id", m."club_id", m."nickname", COALESCE(c."external_source", 'external'), m."external_id"
FROM "club_external_members" m
JOIN "clubs" c ON c."id" = m."club_id";
--> statement-breakpoint
INSERT INTO "meetup_table_identities" ("table_id", "identity_id")
SELECT p."table_id", i."id"
FROM "meetup_table_external_players" p
JOIN "club_external_members" m ON m."id" = p."external_member_id"
JOIN "identities" i ON i."kind" = 'external' AND i."club_id" = m."club_id" AND i."external_id" = m."external_id";
