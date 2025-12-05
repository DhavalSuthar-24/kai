-- Create the table implicitly handled by Prisma, but we need to convert it to hypertable
-- This SQL is intended to be run after the table creation

SELECT create_hypertable('ScreenTimeEvent', 'timestamp', migrate_data => true);

-- Create Materialized View for Hourly Patterns
CREATE MATERIALIZED VIEW hourly_usage_patterns
WITH (timescaledb.continuous) AS
SELECT 
    "userId",
    time_bucket('1 hour', timestamp) AS hour,
    "appPackageName",
    SUM("sessionDuration") as total_duration,
    AVG("interactionCount") as avg_interactions,
    COUNT(*) as session_count,
    MAX("scrollDistance") as max_scroll_distance
FROM "ScreenTimeEvent"
GROUP BY "userId", hour, "appPackageName"
WITH NO DATA;

-- Policy to refresh the view (optional/manual execution)
-- SELECT add_continuous_aggregate_policy('hourly_usage_patterns',
--   start_offset => INTERVAL '1 month',
--   end_offset => INTERVAL '1 hour',
--   schedule_interval => INTERVAL '1 hour');
