# Coverage Matrix

| requirement_id | requirement_text | priority | category | covered_in_plan | notes |
|---|---|---|---|---|---|
| RF-01 | Capturar descuento en carrito | must | feature | full | Cubierto en `plan-tecnico.md` secciones `Main Components`, `Delivery Phases` y `Recommended Decision` |
| RF-02 | Recalcular subtotal, neto, IVA, saldo y total | must | data | full | Cubierto en `plan-tecnico.md` secciones `Data Model Strategy`, `API and Integration Strategy` y `Technical Risks and Mitigations` |
| RF-03 | Persistir descuento en DB de forma auditable | must | data | full | Cubierto en `plan-tecnico.md` secciones `Data Model Strategy` y `Recommended Decision` |
| RF-04 | Mostrar descuento en comprobante emitido desde carrito | must | UX | full | Cubierto en `plan-tecnico.md` secciones `Delivery Phases` y `Recommended Decision` |
| RF-05 | Mostrar descuento en historial/reimpresion | must | integration | full | Cubierto en `plan-tecnico.md` secciones `Architecture Overview`, `API and Integration Strategy`, `Delivery Phases` |
| RF-06 | Mantener consistencia con caja y recibos | must | operability | full | Cubierto en `plan-tecnico.md` secciones `Formula canonica obligatoria`, `API and Integration Strategy`, `Test and Quality Strategy` |
| RF-07 | Resolver porcentaje vs importe | should | feature | full | Cubierto en `plan-tecnico.md` como decision rectificada: fase 1 con porcentaje global |
| RF-08 | Separar descuento global de descuento de articulo | should | data | full | Cubierto en `plan-tecnico.md` seccion `Data Model Strategy` |
| RNF-01 | No romper ventas actuales | must | operability | full | Cubierto en `plan-tecnico.md` secciones `API and Integration Strategy`, `Operability and Rollout Strategy` |
| RNF-02 | Precision monetaria consistente | must | performance | full | Cubierto en `plan-tecnico.md` secciones `Formula canonica obligatoria`, `Invariantes obligatorias`, `Test and Quality Strategy` |
| RNF-03 | Evitar divergencia PDF/historial/DB | must | integration | full | Cubierto en `plan-tecnico.md` secciones `System Vision`, `Invariantes obligatorias`, `Operability and Rollout Strategy` |
| RNF-04 | Mantener reglas de tipos de pago y consulta | must | security | full | Cubierto en `plan-tecnico.md` secciones `Security and Compliance Strategy` y `Recommended Decision` |
