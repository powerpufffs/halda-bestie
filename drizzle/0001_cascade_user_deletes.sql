alter table halda.user_profiles
  drop constraint if exists user_profiles_user_id_fkey,
  add constraint user_profiles_user_id_fkey
    foreign key (user_id) references halda.users(id) on delete cascade;

alter table halda.user_messaging_identities
  drop constraint if exists user_messaging_identities_user_id_fkey,
  add constraint user_messaging_identities_user_id_fkey
    foreign key (user_id) references halda.users(id) on delete cascade;

alter table halda.user_institution_enrollments
  drop constraint if exists user_institution_enrollments_user_id_fkey,
  add constraint user_institution_enrollments_user_id_fkey
    foreign key (user_id) references halda.users(id) on delete cascade;

alter table halda.conversations
  drop constraint if exists conversations_user_id_fkey,
  add constraint conversations_user_id_fkey
    foreign key (user_id) references halda.users(id) on delete cascade;

alter table halda.conversation_states
  drop constraint if exists conversation_states_user_id_fkey,
  drop constraint if exists conversation_states_conversation_id_fkey,
  add constraint conversation_states_user_id_fkey
    foreign key (user_id) references halda.users(id) on delete cascade,
  add constraint conversation_states_conversation_id_fkey
    foreign key (conversation_id) references halda.conversations(id) on delete cascade;

alter table halda.messages
  drop constraint if exists messages_conversation_id_fkey,
  drop constraint if exists messages_from_identity_id_fkey,
  drop constraint if exists messages_to_identity_id_fkey,
  add constraint messages_conversation_id_fkey
    foreign key (conversation_id) references halda.conversations(id) on delete cascade,
  add constraint messages_from_identity_id_fkey
    foreign key (from_identity_id) references halda.user_messaging_identities(id) on delete cascade,
  add constraint messages_to_identity_id_fkey
    foreign key (to_identity_id) references halda.user_messaging_identities(id) on delete cascade;

alter table halda.user_events
  drop constraint if exists user_events_user_id_fkey,
  drop constraint if exists user_events_conversation_id_fkey,
  drop constraint if exists user_events_message_id_fkey,
  add constraint user_events_user_id_fkey
    foreign key (user_id) references halda.users(id) on delete cascade,
  add constraint user_events_conversation_id_fkey
    foreign key (conversation_id) references halda.conversations(id) on delete cascade,
  add constraint user_events_message_id_fkey
    foreign key (message_id) references halda.messages(id) on delete set null;

alter table halda.user_profile_snapshots
  drop constraint if exists user_profile_snapshots_user_id_fkey,
  drop constraint if exists user_profile_snapshots_user_profile_id_fkey,
  drop constraint if exists user_profile_snapshots_created_from_message_id_fkey,
  drop constraint if exists user_profile_snapshots_created_from_event_id_fkey,
  add constraint user_profile_snapshots_user_id_fkey
    foreign key (user_id) references halda.users(id) on delete cascade,
  add constraint user_profile_snapshots_user_profile_id_fkey
    foreign key (user_profile_id) references halda.user_profiles(id) on delete cascade,
  add constraint user_profile_snapshots_created_from_message_id_fkey
    foreign key (created_from_message_id) references halda.messages(id) on delete set null,
  add constraint user_profile_snapshots_created_from_event_id_fkey
    foreign key (created_from_event_id) references halda.user_events(id) on delete set null;

alter table halda.agent_open_loops
  drop constraint if exists agent_open_loops_user_id_fkey,
  drop constraint if exists agent_open_loops_conversation_id_fkey,
  drop constraint if exists agent_open_loops_source_message_id_fkey,
  add constraint agent_open_loops_user_id_fkey
    foreign key (user_id) references halda.users(id) on delete cascade,
  add constraint agent_open_loops_conversation_id_fkey
    foreign key (conversation_id) references halda.conversations(id) on delete cascade,
  add constraint agent_open_loops_source_message_id_fkey
    foreign key (source_message_id) references halda.messages(id) on delete set null;

alter table halda.agent_events
  drop constraint if exists agent_events_user_id_fkey,
  drop constraint if exists agent_events_conversation_id_fkey,
  drop constraint if exists agent_events_message_id_fkey,
  drop constraint if exists agent_events_agent_open_loop_id_fkey,
  add constraint agent_events_user_id_fkey
    foreign key (user_id) references halda.users(id) on delete cascade,
  add constraint agent_events_conversation_id_fkey
    foreign key (conversation_id) references halda.conversations(id) on delete cascade,
  add constraint agent_events_message_id_fkey
    foreign key (message_id) references halda.messages(id) on delete set null,
  add constraint agent_events_agent_open_loop_id_fkey
    foreign key (agent_open_loop_id) references halda.agent_open_loops(id) on delete set null;

alter table halda.agent_runs
  drop constraint if exists agent_runs_user_id_fkey,
  drop constraint if exists agent_runs_conversation_id_fkey,
  drop constraint if exists agent_runs_trigger_message_id_fkey,
  add constraint agent_runs_user_id_fkey
    foreign key (user_id) references halda.users(id) on delete cascade,
  add constraint agent_runs_conversation_id_fkey
    foreign key (conversation_id) references halda.conversations(id) on delete cascade,
  add constraint agent_runs_trigger_message_id_fkey
    foreign key (trigger_message_id) references halda.messages(id) on delete set null;
