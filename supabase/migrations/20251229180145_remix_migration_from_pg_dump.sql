CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    engagement integer NOT NULL,
    energy integer NOT NULL,
    notes text,
    activities text[],
    environments text[],
    interactions text[],
    objects text[],
    users text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    in_flow boolean DEFAULT false NOT NULL,
    topics text[],
    feelings text[],
    CONSTRAINT activities_energy_check CHECK (((energy >= 1) AND (energy <= 5))),
    CONSTRAINT activities_engagement_check CHECK (((engagement >= 1) AND (engagement <= 5)))
);


--
-- Name: notification_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "time" time without time zone NOT NULL,
    days_of_week integer[] DEFAULT ARRAY[1, 2, 3, 4, 5] NOT NULL,
    title text DEFAULT 'Time to log your activity!'::text NOT NULL,
    body text DEFAULT 'How are you feeling? Track your energy levels now.'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    schedule_type text DEFAULT 'daily'::text NOT NULL,
    interval_minutes integer,
    from_time time without time zone DEFAULT '08:00:00'::time without time zone,
    until_time time without time zone DEFAULT '20:00:00'::time without time zone,
    CONSTRAINT valid_interval_config CHECK (((schedule_type = 'daily'::text) OR ((schedule_type = 'interval'::text) AND (interval_minutes IS NOT NULL) AND (interval_minutes > 0)))),
    CONSTRAINT valid_schedule_type CHECK ((schedule_type = ANY (ARRAY['daily'::text, 'interval'::text])))
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    hide_topics boolean DEFAULT false NOT NULL,
    hide_flow_toggle boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    tag text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: notification_schedules notification_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_schedules
    ADD CONSTRAINT notification_schedules_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_tags user_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tags
    ADD CONSTRAINT user_tags_pkey PRIMARY KEY (id);


--
-- Name: user_tags user_tags_user_id_category_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tags
    ADD CONSTRAINT user_tags_user_id_category_tag_key UNIQUE (user_id, category, tag);


--
-- Name: notification_schedules update_notification_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_schedules_updated_at BEFORE UPDATE ON public.notification_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_preferences update_user_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activities Users can create their own activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own activities" ON public.activities FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notification_schedules Users can create their own schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own schedules" ON public.notification_schedules FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can create their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_tags Users can create their own tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own tags" ON public.user_tags FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: activities Users can delete their own activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own activities" ON public.activities FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notification_schedules Users can delete their own schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own schedules" ON public.notification_schedules FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can delete their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_tags Users can delete their own tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own tags" ON public.user_tags FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_preferences Users can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: activities Users can update their own activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own activities" ON public.activities FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notification_schedules Users can update their own schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own schedules" ON public.notification_schedules FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can update their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own subscriptions" ON public.push_subscriptions FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_tags Users can update their own tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own tags" ON public.user_tags FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: activities Users can view their own activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own activities" ON public.activities FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notification_schedules Users can view their own schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own schedules" ON public.notification_schedules FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions Users can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_tags Users can view their own tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tags" ON public.user_tags FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;