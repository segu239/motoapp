# Diagramas: MotoApp venta a comprobante y propuesta descuento global separado

## Objetivo

Este documento muestra en Mermaid:

- el flujo actual real desde `carrito` hasta la generacion de comprobante
- los puntos donde intervienen Angular, PHP espejo y PostgreSQL
- la propuesta del plan `specs-motoapp-descuento-global-separado-20260420-095556`
- las diferencias operativas y de datos entre el flujo actual y el MVP propuesto

## Evidencia usada

- Frontend Angular: `src/app/components/carrito/carrito.component.ts`, `src/app/services/subirdata.service.ts`, `src/app/services/historial-pdf.service.ts`
- Backend PHP espejo: `src/Descarga.php.txt`, `src/Carga.php.txt`
- Plan objetivo: `specs-motoapp-descuento-global-separado-20260420-095556/plan-tecnico.md`, `specs-motoapp-descuento-global-separado-20260420-095556/spec-backend.md`, `specs-motoapp-descuento-global-separado-20260420-095556/spec-frontend.md`
- Base real via MCP Postgres: tablas `factcab*`, `psucursal*`, `recibos*`, `caja_movi`, `tarjcredito`, `artsucursal`, `clisuc`, `sucursales`

## Hallazgos base confirmados

- El stock hoy se descuenta antes del endpoint de venta mediante `UpdateArtsucxappManagedPHP_post()`.
- La venta principal se persiste en `PedidossucxappCompleto_post()`.
- Ese write-path inserta `factcabX`, luego `psucursalX`, luego genera `recibosX`, luego `caja_movi`.
- `generarReciboAutomatico()` hoy calcula `importe_total = basico + iva1` y copia `bonifica/interes` legacy.
- `CabeceraCompletaPDF_post()` hoy no devuelve `id_num`; expone `bonifica/interes` pero no tiene sidecar de descuento global.
- En DB real no existe hoy `public.fact_descuento_global`.
- Caso real `factcab1.id_num = 142`: total cabecera `42236.67`, detalle `42236.67`, recibo `42236.67`, caja `42236.67`.
- Existen ventas multipago reales en DB, por ejemplo `factcab1.id_num = 90`, por eso el plan restringe el MVP nuevo.

## 1. Flujo actual end-to-end de venta hasta comprobante
Explica el recorrido real actual desde la UI del carrito hasta la persistencia y la emision inmediata del comprobante.

```mermaid
sequenceDiagram
    autonumber
    actor Operador
    participant C as CarritoComponent
    participant SS as SessionStorage
    participant SP as SubirdataService
    participant PHP1 as Descarga.UpdateArtsucxappManagedPHP_post
    participant PHP2 as Descarga.PedidossucxappCompleto_post
    participant DB as PostgreSQL
    participant PDF as pdfMake inline

    Operador->>C: Finalizar venta
    C->>C: valida tipoDoc, medios de pago, pendientes
    C->>C: calcula suma total del carrito
    C->>SS: guarda carrito normalizado
    C->>PHP1: actualizar stock antes de vender
    PHP1->>DB: UPDATE artsucursal.exiN +/- cantidad
    DB-->>PHP1: stock actualizado
    PHP1-->>C: ok
    C->>C: arma cabecera, pedidos y caja_movi
    C->>SP: subirDatosPedidos(pedidos, cabecera, sucursal, caja_movi)
    SP->>PHP2: POST PedidossucxappCompleto
    PHP2->>DB: BEGIN
    PHP2->>DB: INSERT factcabX
    PHP2->>DB: INSERT psucursalX por item
    PHP2->>DB: INSERT recibosX via generarReciboAutomatico
    PHP2->>DB: INSERT caja_movi
    PHP2->>DB: COMMIT
    DB-->>PHP2: transaccion confirmada
    PHP2-->>C: venta ok
    C->>PDF: generar PDF inmediato desde datos del carrito
    PDF-->>Operador: comprobante descargado y enviado a Telegram
```

Observaciones:
El comprobante inmediato sale del frontend y no relee la venta desde backend. El stock queda adelantado respecto de la transaccion principal. La venta actual no usa una estructura separada para descuento global.

## 2. Write-path actual y orden real de persistencia
Muestra el orden exacto del flujo actual y donde queda el riesgo legacy de stock fuera de la transaccion principal.

```mermaid
flowchart TD
    A[Operador confirma venta en carrito] --> B[Angular valida reglas segun tipoDoc y medios de pago]
    B --> C[Angular recalcula suma del carrito]
    C --> D[Angular llama UpdateArtsucxappManagedPHP_post]
    D --> E[PHP actualiza artsucursal.exiN]
    E --> F[Angular arma cabecera y detalle]
    F --> G[Angular crea uno o varios caja_movi]
    G --> H[POST PedidossucxappCompleto_post]
    H --> I[BEGIN transaccion]
    I --> J[INSERT factcabX]
    J --> K[INSERT psucursalX por cada item]
    K --> L[generarReciboAutomatico]
    L --> M[INSERT recibosX]
    M --> N[INSERT caja_movi]
    N --> O[COMMIT]
    O --> P[Angular imprime comprobante inline]

    D -. fuera de la transaccion principal .-> I
    L -. copia legacy .-> Q[bonifica/interes desde cabecera]

    style D fill:#ffe5e5,stroke:#b22222
    style E fill:#ffe5e5,stroke:#b22222
    style L fill:#fff3cd,stroke:#8a6d3b
    style Q fill:#fff3cd,stroke:#8a6d3b
```

Observaciones:
Si la venta falla despues del update de stock, el descuento de stock ya ocurrio. `generarReciboAutomatico()` hoy tiene manejo tolerante al error y sigue semantica legacy de `bonifica/interes`.

## 3. Flujo actual de reimpresion y PDF historico
Explica como hoy se rearma un comprobante historico y por que el backend de lectura no alcanza para un descuento global separado.

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant HV as HistorialPdfService
    participant C1 as Carga.CabeceraCompletaPDF_post
    participant C2 as Carga.ClienteCompletoPDF_post
    participant C3 as Carga.ProductosVentaPDF_post
    participant DB as PostgreSQL
    participant PDF as pdfMake historial

    Usuario->>HV: Reimprimir venta historica
    HV->>C1: obtener cabecera por sucursal + tipo + puntoventa + numero_int
    C1->>DB: SELECT factcabX(tipo, numero_int, numero_fac, bonifica, interes, ...)
    DB-->>C1: cabecera
    HV->>C2: obtener cliente
    C2->>DB: SELECT clisuc
    DB-->>C2: cliente
    HV->>C3: obtener productos
    C3->>DB: SELECT psucursalX + LEFT JOIN tarjcredito
    DB-->>C3: items y nombre_tarjeta
    HV->>HV: recalcula total desde items
    HV->>HV: muestra bonifica/interes solo en ciertos flujos
    HV->>PDF: genera PDF historico
    PDF-->>Usuario: comprobante reimpreso
```

Observaciones:
`CabeceraCompletaPDF_post()` hoy selecciona `bonifica`, `bonifica_tipo`, `interes`, `interes_tipo`, pero no `id_num`. Sin `id_num` no hay lookup natural a un sidecar por cabecera en la reimpresion MVP/Fase 2.

## 4. Modelo actual de datos involucrado en venta y comprobante
Resume las entidades actuales que participan del flujo real de venta y emision.

```mermaid
erDiagram
    FACTCABX ||--o{ PSUCURSALX : contiene
    FACTCABX ||--o{ RECIBOSX : genera_RC
    FACTCABX ||--o{ CAJA_MOVI : referencia_por_num_operacion
    PSUCURSALX }o--|| TARJCREDITO : usa_cod_tar
    FACTCABX }o--|| CLISUC : cliente
    FACTCABX }o--|| SUCURSALES : cod_sucursal
    PSUCURSALX }o--|| ARTSUCURSAL : id_articulo

    FACTCABX {
      int id_num PK
      text tipo
      numeric numero_int
      numeric numero_fac
      numeric puntoventa
      numeric cliente
      numeric cod_sucursal
      numeric basico
      numeric iva1
      numeric bonifica
      text bonifica_tipo
      numeric interes
      text interes_tipo
      numeric saldo
    }

    PSUCURSALX {
      numeric id_num FK
      numeric idart
      numeric cantidad
      numeric precio
      numeric cod_tar
      text tipodoc
      numeric puntoventa
      numeric numerocomprobante
    }

    RECIBOSX {
      numeric recibo
      text c_tipo
      numeric c_numero
      numeric recibo_asoc
      numeric importe
      numeric bonifica
      text bonifica_tipo
      numeric interes
      text interes_tipo
      numeric id_fac
    }

    CAJA_MOVI {
      int id_movimiento PK
      numeric sucursal
      numeric num_operacion
      text tipo_comprobante
      numeric numero_comprobante
      numeric importe_mov
      numeric caja
      numeric codigo_mov
      numeric cliente
    }
```

Observaciones:
La cabecera actual concentra total fiscal y campos legacy. No existe hoy una entidad propia para descuento global de venta. El vinculo mas estable para una estructura auxiliar nueva es `cod_sucursal + id_num`.

## 5. Caso real actual confirmado en base
Ejemplifica el flujo actual con una venta real y consistente de la sucursal 1.

```mermaid
flowchart LR
    A[factcab1 id_num 142<br/>FC 984<br/>total 42236.67] --> B[psucursal1<br/>2 items<br/>subtotal 42236.67<br/>cod_tar 39]
    A --> C[recibos1<br/>RC 223<br/>importe 42236.67]
    A --> D[caja_movi<br/>1 movimiento<br/>importe 42236.67]
    B --> E[tarjcredito 39<br/>CENTROCARD OXIGENO PROMO]

    style A fill:#d9edf7,stroke:#31708f
    style C fill:#dff0d8,stroke:#3c763d
    style D fill:#dff0d8,stroke:#3c763d
```

Observaciones:
En este caso, cabecera, detalle, recibo y caja cierran exactamente. Es el patron que el plan busca conservar, pero agregando un descuento separado y auditable.

## 6. Propuesta del plan: venta con descuento global separado
Muestra el flujo target del plan para el MVP estrecho: `FC`, contado simple, un medio de pago, sin `cod_tar = 111`.

```mermaid
sequenceDiagram
    autonumber
    actor Operador
    participant C as CarritoComponent
    participant U as descuento-global-venta.ts
    participant SP as SubirdataService
    participant PHP as Descarga.PedidossucxappCompleto_post
    participant DB as PostgreSQL
    participant PDF as Comprobante inline nuevo

    Operador->>C: ingresa descuento global monto
    C->>U: calcular subtotal_bruto, descuento_aplicado, total_neto
    U-->>C: resumen canonico
    C->>C: valida alcance MVP<br/>FC, un pago, sin CC
    C->>SP: envia pedidos + cabecera + caja_movi neto + descuento_global
    SP->>PHP: POST venta con nodo descuento_global
    PHP->>DB: BEGIN
    PHP->>PHP: recomputa subtotal_bruto desde pedidos
    PHP->>PHP: valida descuento y total_neto
    PHP->>PHP: recalcula basico/iva1 sobre neto
    PHP->>PHP: fuerza saldo = 0
    PHP->>DB: INSERT factcabX
    PHP->>DB: INSERT psucursalX
    PHP->>DB: INSERT fact_descuento_global
    PHP->>DB: INSERT caja_movi por total_neto
    PHP->>DB: INSERT recibosX con importe_total neto
    PHP->>DB: COMMIT
    DB-->>PHP: venta confirmada
    PHP-->>C: ok
    C->>PDF: imprime subtotal bruto + descuento global + total neto
    PDF-->>Operador: comprobante nuevo
```

Observaciones:
La propuesta no reutiliza `bonifica/interes`. La insercion del sidecar participa en la misma transaccion y si falla debe abortar la venta completa.

## 7. Guardrails del MVP propuesto
Resume las validaciones positivas y los rechazos explicitos definidos por el plan para reducir riesgo fiscal y contable.

```mermaid
flowchart TD
    A[Venta con descuento_global] --> B{tipoDoc = FC?}
    B -- No --> X[Rechazar fuera de alcance MVP]
    B -- Si --> C{un solo cod_tar?}
    C -- No --> Y[Rechazar multipago]
    C -- Si --> D{cod_tar = 111?}
    D -- Si --> Z[Rechazar cuenta corriente]
    D -- No --> E[Recomponer subtotal_bruto desde pedidos]
    E --> F{0 <= descuento <= subtotal?}
    F -- No --> W[Rechazar monto invalido]
    F -- Si --> G[Derivar total_neto]
    G --> H[Recalcular basico e iva1 sobre neto]
    H --> I[Forzar saldo = 0]
    I --> J{sum caja_movi = total_neto?}
    J -- No --> V[Rechazar descalce monetario]
    J -- Si --> K[Persistir factcab + detalle + sidecar + caja + recibo]
    K --> L[Emitir comprobante nuevo]

    style X fill:#f2dede,stroke:#a94442
    style Y fill:#f2dede,stroke:#a94442
    style Z fill:#f2dede,stroke:#a94442
    style W fill:#f2dede,stroke:#a94442
    style V fill:#f2dede,stroke:#a94442
    style K fill:#dff0d8,stroke:#3c763d
```

Observaciones:
El plan no habilita el descuento en `NC`, `ND`, `NV`, `PR`, `CS`, cuenta corriente ni multipago. Eso esta alineado con los riesgos abiertos de `basico/iva1`, `saldo` y `recibo automatico`.

## 8. Modelo target con sidecar de descuento global
Explica la estructura separada propuesta para no contaminar `factcab*` ni `recibos*` legacy.

```mermaid
erDiagram
    FACTCABX ||--o| FACT_DESCUENTO_GLOBAL : complementa
    FACTCABX ||--o{ PSUCURSALX : contiene
    FACTCABX ||--o{ RECIBOSX : genera_RC
    FACTCABX ||--o{ CAJA_MOVI : impacta

    FACTCABX {
      int id_num PK
      numeric cod_sucursal
      text tipo
      numeric basico
      numeric iva1
      numeric saldo
      numeric bonifica
      numeric interes
    }

    FACT_DESCUENTO_GLOBAL {
      int id PK
      numeric cod_sucursal
      int cabecera_id_num
      text origen
      numeric subtotal_bruto
      numeric descuento_monto
      numeric total_neto
      text usuario
      timestamp created_at
    }

    PSUCURSALX {
      numeric id_num FK
      numeric idart
      numeric cantidad
      numeric precio
      numeric cod_tar
    }

    RECIBOSX {
      numeric recibo_asoc
      numeric importe
      numeric bonifica
      numeric interes
    }

    CAJA_MOVI {
      numeric num_operacion
      numeric importe_mov
      text tipo_comprobante
      numeric numero_comprobante
    }
```

Observaciones:
La relacion propuesta es 1:1 por venta. `fact_descuento_global` guarda la verdad canonica del bruto, descuento y neto, mientras `bonifica/interes` quedan reservados para su uso historico actual.

## 9. Comparacion visual: actual vs propuesta
Contrasta rapidamente los cambios funcionales mas importantes entre ambos recorridos.

```mermaid
flowchart LR
    subgraph ACTUAL[Actual]
        A1[Carrito calcula suma]
        A2[Stock se actualiza antes]
        A3[PedidossucxappCompleto inserta factcab y psucursal]
        A4[Recibo automatico usa basico + iva1]
        A5[PDF inline muestra total]
        A6[Reimpresion lee factcab + psucursal + bonifica/interes]
        A1 --> A2 --> A3 --> A4 --> A5 --> A6
    end

    subgraph PROPUESTA[Propuesta MVP]
        B1[Carrito calcula bruto, descuento y neto]
        B2[Valida FC contado simple]
        B3[Backend recompone importes]
        B4[Inserta sidecar fact_descuento_global]
        B5[Recibo automatico alinea importe neto]
        B6[Comprobante nuevo muestra bruto, descuento y neto]
        B1 --> B2 --> B3 --> B4 --> B5 --> B6
    end

    A2 -. riesgo legacy .- B3
    A6 -. Fase 2 .- B6
```

Observaciones:
La propuesta agrega una segunda verdad auditable para el descuento, pero evita reescribir la semantica de los campos legacy. La principal deuda que permanece en el MVP es el stock descontado antes del endpoint principal.

## Resumen de cobertura

| # | Diagrama | Dominio | Tipo Mermaid |
|---|----------|---------|-------------|
| 1 | Flujo actual end-to-end de venta hasta comprobante | Comportamiento | Sequence |
| 2 | Write-path actual y orden real de persistencia | Comportamiento | Flowchart |
| 3 | Flujo actual de reimpresion y PDF historico | Comportamiento | Sequence |
| 4 | Modelo actual de datos involucrado en venta y comprobante | Datos | ER |
| 5 | Caso real actual confirmado en base | Datos / comportamiento | Flowchart |
| 6 | Propuesta del plan: venta con descuento global separado | Comportamiento | Sequence |
| 7 | Guardrails del MVP propuesto | Reglas / seguridad funcional | Flowchart |
| 8 | Modelo target con sidecar de descuento global | Datos | ER |
| 9 | Comparacion visual: actual vs propuesta | Arquitectura de flujo | Flowchart |
