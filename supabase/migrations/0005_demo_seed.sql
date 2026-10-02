-- Fictional examples, fixed IDs make this seed safe to replay.
insert into public.prospects(id,name,contact_info,source,cultural_background,budget_range,status) values
('a1000000-0000-4000-8000-000000000001','Alex Lim · Demo','alex@example.com','referral','Malay-Chinese','2.5M MYR','engaged'),
('a1000000-0000-4000-8000-000000000002','Nur Amina · Demo','amina@example.com','walk-in','Malay','3M–5M MYR','negotiating'),
('a1000000-0000-4000-8000-000000000003','Priya Anand · Demo','priya@example.com','social','Malay-Indian','2M MYR','new'),
('a1000000-0000-4000-8000-000000000004','Zhang Wei · Demo','zhang@example.com','press','Mainland Chinese','3M–6M MYR','engaged')
on conflict (id) do nothing;
insert into public.interactions(id,prospect_id,consultant_name,interaction_type,personality_observations,intentions,objections,lifestyle_notes,mood_after) values
('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Daniel','meeting','Analytical, detail-oriented and risk-averse','Investment for children and family legacy','Comparing total costs with other properties','Values long-term security and location','neutral'),
('b1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','Sara','site-visit','Thoughtful; wants family involved in decisions','Primary residence for family','Needs clarity on recurring maintenance fees','Privacy and proximity to schools','positive')
on conflict (id) do nothing;
