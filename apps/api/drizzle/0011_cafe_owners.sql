CREATE TABLE "cafe_members" (
	"cafe_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cafe_members_cafe_id_user_id_pk" PRIMARY KEY("cafe_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "cafe_owner_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"cafe_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"used_by" text,
	"revoked_at" timestamp,
	CONSTRAINT "cafe_owner_invites_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "cafe_members" ADD CONSTRAINT "cafe_members_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_members" ADD CONSTRAINT "cafe_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_owner_invites" ADD CONSTRAINT "cafe_owner_invites_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_owner_invites" ADD CONSTRAINT "cafe_owner_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cafe_owner_invites" ADD CONSTRAINT "cafe_owner_invites_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cafe_members_user_id_idx" ON "cafe_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cafe_owner_invites_active_cafe_idx" ON "cafe_owner_invites" USING btree ("cafe_id") WHERE "cafe_owner_invites"."used_at" is null and "cafe_owner_invites"."revoked_at" is null;