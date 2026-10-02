CREATE TABLE "club_external_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"nickname" text NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"external_login_id" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_members" (
	"club_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "club_members_club_id_user_id_pk" PRIMARY KEY("club_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"province_code" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"invite_code_hash" text NOT NULL,
	"external_source" text,
	"external_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_slug_unique" UNIQUE("slug"),
	CONSTRAINT "clubs_inviteCodeHash_unique" UNIQUE("invite_code_hash")
);
--> statement-breakpoint
ALTER TABLE "meetups" ADD COLUMN "club_id" uuid;--> statement-breakpoint
ALTER TABLE "club_external_members" ADD CONSTRAINT "club_external_members_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_external_members" ADD CONSTRAINT "club_external_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_province_code_provinces_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "club_external_members_club_external_uidx" ON "club_external_members" USING btree ("club_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "club_external_members_club_user_uidx" ON "club_external_members" USING btree ("club_id","user_id") WHERE "club_external_members"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "club_external_members_user_id_idx" ON "club_external_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "club_members_user_id_idx" ON "club_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clubs_external_uidx" ON "clubs" USING btree ("external_source","external_id");--> statement-breakpoint
ALTER TABLE "meetups" ADD CONSTRAINT "meetups_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meetups_club_id_starts_at_idx" ON "meetups" USING btree ("club_id","starts_at");--> statement-breakpoint
ALTER TABLE "meetups" ADD CONSTRAINT "meetups_club_visibility_chk" CHECK ("meetups"."visibility" <> 'club' or "meetups"."club_id" is not null);