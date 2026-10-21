CREATE TABLE "club_link_attempts" (
	"scope_key" text PRIMARY KEY NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "club_external_members" ADD COLUMN "external_login_digest" text;--> statement-breakpoint
CREATE INDEX "club_external_members_club_login_digest_idx" ON "club_external_members" USING btree ("club_id","external_login_digest");