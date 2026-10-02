ALTER TABLE "users" ADD COLUMN "province_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "club_shelf_suggest" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_province_code_provinces_code_fk" FOREIGN KEY ("province_code") REFERENCES "public"."provinces"("code") ON DELETE no action ON UPDATE no action;