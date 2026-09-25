ALTER TABLE "users" ADD COLUMN "bgg_username" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_bgg_username_unique" UNIQUE("bgg_username");