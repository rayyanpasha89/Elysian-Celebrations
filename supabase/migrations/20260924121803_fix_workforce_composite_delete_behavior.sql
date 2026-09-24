-- Composite event-scoped foreign keys include the required wedding_id column.
-- Restrict SET NULL to the optional reference so deleting a zone, department,
-- or supervisor never attempts to erase the shift's event ownership.

alter table public.event_operations_departments
  drop constraint event_operations_department_lead_fk,
  add constraint event_operations_department_lead_fk
    foreign key (lead_assignment_id, wedding_id)
    references public.event_staff_assignments(id, wedding_id)
    on delete set null (lead_assignment_id);

alter table public.event_crew_shifts
  drop constraint event_crew_shift_department_fk,
  drop constraint event_crew_shift_zone_fk,
  drop constraint event_crew_shift_supervisor_fk,
  add constraint event_crew_shift_department_fk
    foreign key (department_id, wedding_id)
    references public.event_operations_departments(id, wedding_id)
    on delete set null (department_id),
  add constraint event_crew_shift_zone_fk
    foreign key (zone_id, wedding_id)
    references public.event_operations_zones(id, wedding_id)
    on delete set null (zone_id),
  add constraint event_crew_shift_supervisor_fk
    foreign key (supervisor_assignment_id, wedding_id)
    references public.event_staff_assignments(id, wedding_id)
    on delete set null (supervisor_assignment_id);

alter table public.event_operations_briefings
  drop constraint event_operations_briefing_department_fk,
  drop constraint event_operations_briefing_zone_fk,
  add constraint event_operations_briefing_department_fk
    foreign key (department_id, wedding_id)
    references public.event_operations_departments(id, wedding_id)
    on delete set null (department_id),
  add constraint event_operations_briefing_zone_fk
    foreign key (zone_id, wedding_id)
    references public.event_operations_zones(id, wedding_id)
    on delete set null (zone_id);

alter table public.event_operations_items
  drop constraint event_operations_item_department_fk,
  drop constraint event_operations_item_zone_fk,
  add constraint event_operations_item_department_fk
    foreign key (department_id, wedding_id)
    references public.event_operations_departments(id, wedding_id)
    on delete set null (department_id),
  add constraint event_operations_item_zone_fk
    foreign key (zone_id, wedding_id)
    references public.event_operations_zones(id, wedding_id)
    on delete set null (zone_id);
