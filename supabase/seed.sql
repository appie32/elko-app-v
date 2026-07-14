insert into price_rules 
(product_type, color_category, mesh_type, suggested_price, note)
values
('Raamhor op maat', 'Standaardkleur', 'Standaard horgaas', 150, 'Raamhor standaard'),
('Raamhor op maat', 'RAL-kleur op maat', 'Standaard horgaas', 175, 'Raamhor speciale kleur'),
('Raamhor op maat', 'Standaardkleur', 'Premium horgaas / anti-pollen gaas', 175, 'Raamhor premium gaas'),
('Raamhor op maat', 'RAL-kleur op maat', 'Premium horgaas / anti-pollen gaas', 175, 'Raamhor speciale kleur en premium gaas'),

('Enkele plissé hordeur', 'Standaardkleur', 'Standaard horgaas', 300, 'Enkele hordeur standaard'),
('Enkele plissé hordeur', 'RAL-kleur op maat', 'Standaard horgaas', 350, 'Enkele hordeur speciale kleur'),
('Enkele plissé hordeur', 'Standaardkleur', 'Premium horgaas / anti-pollen gaas', 350, 'Enkele hordeur premium gaas'),

('Dubbele plissé hordeur', 'Standaardkleur', 'Standaard horgaas', 595, 'Dubbele hordeur standaard'),
('Dubbele plissé hordeur', 'RAL-kleur op maat', 'Standaard horgaas', 645, 'Dubbele hordeur speciale kleur'),
('Dubbele plissé hordeur', 'Standaardkleur', 'Premium horgaas / anti-pollen gaas', 645, 'Dubbele hordeur premium gaas'),
('Dubbele plissé hordeur', 'RAL-kleur op maat', 'Premium horgaas / anti-pollen gaas', 695, 'Dubbele hordeur speciale kleur en premium gaas'),

('Schuifpui plissé hordeur', 'Standaardkleur', 'Standaard horgaas', 345, 'Schuifpui voorlopig standaard'),
('Schuifpui plissé hordeur', 'RAL-kleur op maat', 'Standaard horgaas', 395, 'Schuifpui voorlopig speciale kleur'),
('Schuifpui plissé hordeur', 'Standaardkleur', 'Premium horgaas / anti-pollen gaas', 395, 'Schuifpui voorlopig premium gaas'),
('Schuifpui plissé hordeur', 'RAL-kleur op maat', 'Premium horgaas / anti-pollen gaas', 445, 'Schuifpui voorlopig speciaal en premium')
on conflict do nothing;


insert into business_settings
(company_name, trade_name, contact_name, website, quote_prefix)
values
('ELKO Solutions', 'Fly Horren / ELKO Solutions', 'Alexa', 'elkosolutions.nl', 'ELKO')
on conflict do nothing;
