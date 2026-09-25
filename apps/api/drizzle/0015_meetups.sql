CREATE TABLE "meetup_participants" (
	"meetup_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"table_id" uuid,
	"waitlisted_at" timestamp,
	"responded_at" timestamp,
	CONSTRAINT "meetup_participants_meetup_id_user_id_pk" PRIMARY KEY("meetup_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "meetup_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meetup_id" uuid NOT NULL,
	"host_user_id" text NOT NULL,
	"game_id" uuid,
	"seats" smallint,
	"brought_by_user_id" text,
	"note" text,
	"position" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meetup_tables_seats_chk" CHECK ("meetup_tables"."seats" is null or ("meetup_tables"."seats" between 2 and 20))
);
--> statement-breakpoint
CREATE TABLE "meetups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"cafe_id" uuid,
	"address_line" text,
	"province_code" text NOT NULL,
	"ward_code" text,
	"capacity" smallint,
	"visibility" text DEFAULT 'public' NOT NULL,
	"invite_code_hash" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meetups_slug_unique" UNIQUE("slug"),
	CONSTRAINT "meetups_inviteCodeHash_unique" UNIQUE("invite_code_hash"),
	CONSTRAINT "meetups_location_chk" CHECK ("meetups"."cafe_id" is not null or "meetups"."address_line" is not null)
);
--> statement-breakpoint
ALTER TABLE "meetup_participants" ADD CONSTRAINT "meetup_participants_meetup_id_meetups_id_fk" FOREIGN KEY ("meetup_id") REFERENCES "public"."meetups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetup_participants" ADD CONSTRAINT "meetup_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetup_participants" ADD CONSTRAINT "meetup_participants_table_id_meetup_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."meetup_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetup_tables" ADD CONSTRAINT "meetup_tables_meetup_id_meetups_id_fk" FOREIGN KEY ("meetup_id") REFERENCES "public"."meetups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetup_tables" ADD CONSTRAINT "meetup_tables_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetup_tables" ADD CONSTRAINT "meetup_tables_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetup_tables" ADD CONSTRAINT "meetup_tables_brought_by_user_id_users_id_fk" FOREIGN KEY ("brought_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetups" ADD CONSTRAINT "meetups_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetups" ADD CONSTRAINT "meetups_province_code_provinces_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetups" ADD CONSTRAINT "meetups_ward_code_wards_code_fk" FOREIGN KEY ("ward_code") REFERENCES "public"."wards"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetups" ADD CONSTRAINT "meetups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meetup_participants_user_id_idx" ON "meetup_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meetup_participants_table_id_idx" ON "meetup_participants" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "meetup_tables_meetup_id_idx" ON "meetup_tables" USING btree ("meetup_id");--> statement-breakpoint
CREATE INDEX "meetup_tables_host_user_id_idx" ON "meetup_tables" USING btree ("host_user_id");--> statement-breakpoint
CREATE INDEX "meetup_tables_brought_by_user_id_idx" ON "meetup_tables" USING btree ("brought_by_user_id");--> statement-breakpoint
CREATE INDEX "meetups_province_starts_at_idx" ON "meetups" USING btree ("province_code","starts_at");--> statement-breakpoint
CREATE INDEX "meetups_starts_at_idx" ON "meetups" USING btree ("starts_at");