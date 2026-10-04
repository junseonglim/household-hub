CREATE TABLE "household" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text DEFAULT '우리집' NOT NULL,
	"timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
