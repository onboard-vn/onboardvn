CREATE TABLE "cafe_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cafe_id" uuid NOT NULL,
	"path" text NOT NULL,
	"caption" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "logo_path" text;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "cover_path" text;--> statement-breakpoint
ALTER TABLE "cafe_photos" ADD CONSTRAINT "cafe_photos_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_photos" ADD CONSTRAINT "cafe_photos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cafe_photos_cafe_id_idx" ON "cafe_photos" USING btree ("cafe_id","sort_order");