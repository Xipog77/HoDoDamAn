CREATE TYPE "edit_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "fund_type" AS ENUM('IN', 'OUT');--> statement-breakpoint
CREATE TYPE "gender" AS ENUM('MALE', 'FEMALE');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('GUEST', 'MEMBER', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "user_status" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "edit_requests" (
	"id" serial PRIMARY KEY,
	"person_id" integer NOT NULL,
	"requester_id" integer NOT NULL,
	"changes" jsonb NOT NULL,
	"status" "edit_request_status" DEFAULT 'PENDING'::"edit_request_status" NOT NULL,
	"reviewed_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_fund" (
	"id" serial PRIMARY KEY,
	"type" "fund_type" NOT NULL,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"date" varchar(20) NOT NULL,
	"recorded_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "galleries" (
	"id" serial PRIMARY KEY,
	"title" varchar(300) NOT NULL,
	"description" text,
	"images" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marriages" (
	"id" serial PRIMARY KEY,
	"husband_id" integer NOT NULL,
	"wife_id" integer NOT NULL,
	"wedding_year" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_wall" (
	"id" serial PRIMARY KEY,
	"person_id" integer NOT NULL,
	"author_name" varchar(200) NOT NULL,
	"author_user_id" integer,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY,
	"title" varchar(300) NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" serial PRIMARY KEY,
	"name" varchar(200) NOT NULL,
	"gender" "gender" DEFAULT 'MALE'::"gender" NOT NULL,
	"birth_year" integer,
	"death_year" integer,
	"dob" varchar(20),
	"dod" varchar(20),
	"dob_lunar" varchar(20),
	"dod_lunar" varchar(20),
	"father_id" integer,
	"mother_id" integer,
	"biography" text,
	"avatar_url" text,
	"hometown" varchar(300),
	"birthplace" varchar(300),
	"residence" varchar(300),
	"burial_place" varchar(300),
	"burial_lat" real,
	"burial_lng" real,
	"hometown_lat" real,
	"hometown_lng" real,
	"generation" integer DEFAULT 1,
	"branch" varchar(100),
	"is_deceased" boolean DEFAULT false,
	"extra" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"author_id" integer NOT NULL,
	"is_featured" boolean DEFAULT false,
	"cover_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"username" varchar(100) NOT NULL UNIQUE,
	"display_name" varchar(200) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'MEMBER'::"user_role" NOT NULL,
	"status" "user_status" DEFAULT 'PENDING'::"user_status" NOT NULL,
	"person_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
