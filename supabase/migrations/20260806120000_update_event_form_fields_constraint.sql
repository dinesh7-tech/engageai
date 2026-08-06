-- Update event_form_fields_field_type_check constraint to include all supported form field types
ALTER TABLE public.event_form_fields DROP CONSTRAINT IF EXISTS event_form_fields_field_type_check;

ALTER TABLE public.event_form_fields ADD CONSTRAINT event_form_fields_field_type_check CHECK (
  field_type IN (
    'text',
    'textarea',
    'email',
    'phone',
    'tel',
    'number',
    'date',
    'time',
    'url',
    'select',
    'radio',
    'checkbox',
    'multiselect',
    'file',
    'rating',
    'stars',
    'emoji',
    'yes_no'
  )
);
