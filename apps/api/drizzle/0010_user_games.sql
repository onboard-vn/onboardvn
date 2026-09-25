CREATE TABLE "user_games" (
	"user_id" text NOT NULL,
	"game_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_games_user_id_game_id_pk" PRIMARY KEY("user_id","game_id")
);
--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_games_game_id_idx" ON "user_games" USING btree ("game_id");