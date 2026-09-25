CREATE TABLE "friend_requests" (
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	CONSTRAINT "friend_requests_from_user_id_to_user_id_pk" PRIMARY KEY("from_user_id","to_user_id")
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"user_a" text NOT NULL,
	"user_b" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_user_a_user_b_pk" PRIMARY KEY("user_a","user_b"),
	CONSTRAINT "friendships_order_chk" CHECK ("friendships"."user_a" < "friendships"."user_b")
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "friend_code" text DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 16) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plays_visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "friends_visibility" text DEFAULT 'friends' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_on_friend_request" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_a_users_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_b_users_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friend_requests_to_user_status_idx" ON "friend_requests" USING btree ("to_user_id","status");--> statement-breakpoint
CREATE INDEX "friendships_user_b_idx" ON "friendships" USING btree ("user_b");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_friend_code_unique" UNIQUE("friend_code");