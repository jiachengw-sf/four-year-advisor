-- Paste into Supabase SQL editor and run.
-- Hackathon mode: RLS off. Do not put real student data in this project.

create table students (
  id uuid primary key default gen_random_uuid(),
  name text,
  year int,
  major text,
  career_goals text[] default '{}',
  interests text[] default '{}',
  weekly_hours int default 10,
  created_at timestamptz default now()
);

create table skill_nodes (
  node_id text primary key,
  name text not null,
  category text not null,
  base_hours numeric default 5
);

create table skill_edges (
  from_node text references skill_nodes(node_id),
  to_node text references skill_nodes(node_id),
  primary key (from_node, to_node)
);

create table student_skills (
  student_id uuid references students(id) on delete cascade,
  node_id text references skill_nodes(node_id),
  mastery numeric default 0 check (mastery between 0 and 1),
  confidence numeric default 0 check (confidence between 0 and 1),
  evidence text[] default '{}',
  last_practiced timestamptz default now(),
  primary key (student_id, node_id)
);

create table learning_profile (
  student_id uuid primary key references students(id) on delete cascade,
  pace_by_category jsonb default '{}',
  method_scores jsonb default '{}',
  tips text[] default '{}',
  updated_at timestamptz default now()
);

create table opportunities (
  opportunity_id text primary key,
  type text check (type in ('club','research','internship')),
  title text not null,
  required_nodes text[] default '{}',
  deadline date,
  link text,
  tags text[] default '{}'
);

create table events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  type text not null,            -- checkin | quiz | resource_feedback | goal_change
  node_id text,
  payload jsonb default '{}',    -- {minutes, confidence, score, helped, ...}
  created_at timestamptz default now()
);

-- The blackboard: every agent output and every handoff lands here.
create table agent_outputs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  agent text not null check (agent in ('input','knowledge','opportunity','patterns','advisor')),
  kind text not null default 'result' check (kind in ('result','handoff')),
  to_agent text,
  payload jsonb not null,
  consumed boolean default false,
  is_golden boolean default false,  -- saved good output for demo fallback
  created_at timestamptz default now()
);

create index on agent_outputs (student_id, agent, created_at desc);
create index on agent_outputs (student_id, to_agent) where kind = 'handoff' and consumed = false;

-- Realtime: lets the dashboard update when a teammate saves from another laptop.
alter publication supabase_realtime add table agent_outputs, student_skills;
