CREATE TABLE "club_external_ownerships" (
	"club_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"external_member_id" uuid NOT NULL,
	CONSTRAINT "club_external_ownerships_club_id_game_id_external_member_id_pk" PRIMARY KEY("club_id","game_id","external_member_id")
);
--> statement-breakpoint
CREATE TABLE "external_refs" (
	"source" text NOT NULL,
	"kind" text NOT NULL,
	"external_id" text NOT NULL,
	"internal_id" uuid NOT NULL,
	CONSTRAINT "external_refs_source_kind_external_id_pk" PRIMARY KEY("source","kind","external_id")
);
--> statement-breakpoint
CREATE TABLE "meetup_table_external_players" (
	"table_id" uuid NOT NULL,
	"external_member_id" uuid NOT NULL,
	CONSTRAINT "meetup_table_external_players_table_id_external_member_id_pk" PRIMARY KEY("table_id","external_member_id")
);
--> statement-breakpoint
ALTER TABLE "club_external_ownerships" ADD CONSTRAINT "club_external_ownerships_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_external_ownerships" ADD CONSTRAINT "club_external_ownerships_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_external_ownerships" ADD CONSTRAINT "club_external_ownerships_external_member_id_club_external_members_id_fk" FOREIGN KEY ("external_member_id") REFERENCES "public"."club_external_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetup_table_external_players" ADD CONSTRAINT "meetup_table_external_players_table_id_meetup_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."meetup_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetup_table_external_players" ADD CONSTRAINT "meetup_table_external_players_external_member_id_club_external_members_id_fk" FOREIGN KEY ("external_member_id") REFERENCES "public"."club_external_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_external_ownerships_member_idx" ON "club_external_ownerships" USING btree ("external_member_id");--> statement-breakpoint
CREATE INDEX "external_refs_kind_internal_id_idx" ON "external_refs" USING btree ("kind","internal_id");--> statement-breakpoint
CREATE INDEX "meetup_table_external_players_member_idx" ON "meetup_table_external_players" USING btree ("external_member_id");