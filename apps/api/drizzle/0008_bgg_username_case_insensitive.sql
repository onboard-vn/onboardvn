ALTER TABLE "users" DROP CONSTRAINT "users_bgg_username_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_bgg_username_lower_idx" ON "users" USING btree (lower("bgg_username"));