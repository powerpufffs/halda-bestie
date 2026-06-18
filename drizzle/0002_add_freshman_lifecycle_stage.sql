alter table halda.user_profiles
  drop constraint if exists user_profiles_lifecycle_stage_check,
  add constraint user_profiles_lifecycle_stage_check
    check (lifecycle_stage in (
      'unknown',
      'freshman',
      'sophomore',
      'junior',
      'senior',
      'transfer',
      'current_college',
      'gap_year'
    ));
