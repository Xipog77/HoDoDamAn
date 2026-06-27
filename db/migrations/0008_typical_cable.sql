CREATE TABLE IF NOT EXISTS "system_feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"author_name" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
