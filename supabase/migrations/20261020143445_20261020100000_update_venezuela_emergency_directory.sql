/*
# Update Venezuela emergency and health directory

1. Purpose
- Replaces the previous placeholder emergency contacts with Venezuela emergency services and the requested health providers in Santa Bárbara, Barinas.

2. Modified data
- Policía Nacional: 911.
- Bomberos: (0273) 5460235.
- Ambulancia: 171.
- Farmacia Central: +58 424-7781001.
- Adds the six requested health providers with their addresses, schedules, and service notes.

3. Important notes
- The requested health providers did not include direct phone numbers, so their phone field is marked as `No publicado` rather than inventing a number.
- Emergency numbers remain directly callable from the interface.
- No tables, columns, policies, or user data are deleted.
*/

UPDATE public.emergency_contacts
SET name = 'Policía Nacional',
    category = 'police',
    phone = '911',
    address = 'Servicio nacional de emergencias de Venezuela',
    is_on_duty = true,
    sort_order = 1
WHERE id = 'f0e731c0-46c5-45cd-8247-17db6f849e17';

UPDATE public.emergency_contacts
SET name = 'Bomberos de Venezuela',
    category = 'fire',
    phone = '(0273) 5460235',
    address = 'Cuerpo de Bomberos',
    is_on_duty = true,
    sort_order = 2
WHERE id = '16a7a077-e727-4a02-8206-0c5bab312a03';

UPDATE public.emergency_contacts
SET name = 'Ambulancia 171',
    category = 'ambulance',
    phone = '171',
    address = 'Servicio de atención prehospitalaria de Venezuela',
    is_on_duty = true,
    sort_order = 3
WHERE id = '80f25fc3-18e5-4d3a-b287-a939272610bb';

UPDATE public.emergency_contacts
SET name = 'Farmacia Central',
    category = 'pharmacy',
    phone = '+58 424-7781001',
    address = 'Farmacia de atención local',
    is_on_duty = true,
    sort_order = 4
WHERE id = 'f4e97f6f-0b2c-427c-a865-8c3c65264380';

UPDATE public.emergency_contacts
SET name = 'Centro Médico María José (Dra. Joana Condado)',
    category = 'clinic',
    phone = 'No publicado',
    address = 'Esquina, Carrera 1, Calle 15, Santa Bárbara, Barinas. Horario: Abierto las 24 horas.',
    is_on_duty = true,
    sort_order = 5
WHERE id = 'f0f42642-d87c-4985-b5ec-49c2264a1441';

UPDATE public.emergency_contacts
SET name = 'Centro Médico Zamora C.A.',
    category = 'health_center',
    phone = 'No publicado',
    address = 'Carrera 4 entre calles 16 y 17, Santa Bárbara 5210, Barinas. Horario: Abierto las 24 horas.',
    is_on_duty = true,
    sort_order = 6
WHERE id = 'c54defea-79fe-4c69-8cc3-97389f49ce73';

UPDATE public.emergency_contacts
SET name = 'Consultorio Clínico Santísima Trinidad',
    category = 'clinic',
    phone = 'No publicado',
    address = 'Santa Bárbara 5210, Barinas. Horario: Lunes a viernes abierto 24 horas; sábados y domingos cerrado.',
    is_on_duty = false,
    sort_order = 7
WHERE id = '44c7f1be-60d3-4536-9347-c9fdce4fa9f1';

INSERT INTO public.emergency_contacts (name, category, phone, address, is_on_duty, sort_order)
SELECT 'CMPTII Corazón de Jesús', 'health_center', 'No publicado',
       'Carrera 0, Santa Bárbara 5210, Barinas. Horario: Lunes a viernes de 8:00 AM a 12:00 PM; sábados y domingos cerrado.',
       false, 8
WHERE NOT EXISTS (
  SELECT 1 FROM public.emergency_contacts WHERE name = 'CMPTII Corazón de Jesús'
);

INSERT INTO public.emergency_contacts (name, category, phone, address, is_on_duty, sort_order)
SELECT 'CDI Doña Elena María Cruces de Aular (CDI Santa Bárbara)', 'health_center', 'No publicado',
       'Parroquia Santa Bárbara, Municipio Ezequiel Zamora, Barinas. Horario: Operativo las 24 horas. Servicios: Medicina general, hospitalización, emergencia y diagnóstico asistencial a cargo de la Red de Salud Pública.',
       true, 9
WHERE NOT EXISTS (
  SELECT 1 FROM public.emergency_contacts WHERE name = 'CDI Doña Elena María Cruces de Aular (CDI Santa Bárbara)'
);

INSERT INTO public.emergency_contacts (name, category, phone, address, is_on_duty, sort_order)
SELECT 'IPASME Santa Bárbara', 'health_center', 'No publicado',
       'Carrera 7, Santa Bárbara 5210, Barinas. Horario: Lunes a viernes de 7:00 AM a 6:00 PM; sábados y domingos cerrado.',
       false, 10
WHERE NOT EXISTS (
  SELECT 1 FROM public.emergency_contacts WHERE name = 'IPASME Santa Bárbara'
);
