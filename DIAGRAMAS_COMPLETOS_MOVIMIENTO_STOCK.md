# Diagramas Completos: Flujos de Movimiento de Stock - MotoApp

**Fecha**: 16 de Noviembre de 2025
**Sistema**: MotoApp v2.2 + Legacy
**Analista**: Claude Code

---

## 📊 Índice de Diagramas

1. [Diagrama General de Flujos](#1-diagrama-general-de-flujos)
2. [Flujo PULL v2.2 (Solicitud de Stock)](#2-flujo-pull-v22-solicitud-de-stock)
3. [Flujo PUSH v2.2 (Oferta de Stock)](#3-flujo-push-v22-oferta-de-stock)
4. [Flujo Legacy: Pedido de Stock](#4-flujo-legacy-pedido-de-stock)
5. [Flujo Legacy: Envío Directo](#5-flujo-legacy-envío-directo)
6. [Diagrama de Estados Completo](#6-diagrama-de-estados-completo)
7. [Mapeo de Sucursales y Stock](#7-mapeo-de-sucursales-y-stock)

---

## 1. Diagrama General de Flujos

```mermaid
graph TB
    Start([Usuario necesita mover stock])

    subgraph "SISTEMA v2.2 - BIDIRECCIONAL"
        Pull[PULL: Solicitar Stock]
        Push[PUSH: Ofrecer Stock]
    end

    subgraph "SISTEMA LEGACY"
        LegacyPedido[Legacy: Pedido con Solicitud]
        LegacyDirecto[Legacy: Envío Directo]
    end

    Start -->|¿Qué flujo usar?| Decision{Tipo de Operación}

    Decision -->|Necesito stock de otra sucursal| Pull
    Decision -->|Tengo stock para otra sucursal| Push
    Decision -->|Flujo antiguo: solicitud| LegacyPedido
    Decision -->|Flujo antiguo: envío directo| LegacyDirecto

    Pull --> PullEnd([Stock movido al aceptar])
    Push --> PushEnd([Stock movido al aceptar])
    LegacyPedido --> LegacyPedidoEnd([Stock movido 2 veces ⚠️])
    LegacyDirecto --> LegacyDirectoEnd([Stock movido 1 vez])

    style Pull fill:#4CAF50
    style Push fill:#2196F3
    style LegacyPedido fill:#FF9800
    style LegacyDirecto fill:#9C27B0
```

---

## 2. Flujo PULL v2.2 (Solicitud de Stock)

**Descripción**: Sucursal A solicita stock a Sucursal B. Solo se mueve stock cuando B acepta.

```mermaid
stateDiagram-v2
    [*] --> Solicitado: CREAR SOLICITUD<br/>Componente: pedir-stock<br/>Endpoint: PedidoItemyCab_post<br/>🔹 Stock NO se mueve

    state "Estado: Solicitado" as Solicitado {
        state "Vista Sucursal A (Origen)" as SolA1
        state "Vista Sucursal B (Destino)" as SolB1

        SolA1: Componente: mis-transferencias<br/>Puede: Ver, Cancelar
        SolB1: Componente: transferencias-pendientes<br/>Puede: Ver, Aceptar, Rechazar
    }

    Solicitado --> Aceptado: ACEPTAR<br/>Sucursal B acepta<br/>Endpoint: AceptarTransferencia_post<br/>✅ MUEVE STOCK<br/>(B -cantidad, A +cantidad)
    Solicitado --> Rechazado: RECHAZAR<br/>Sucursal B rechaza<br/>Endpoint: RechazarTransferencia_post<br/>🔹 Stock NO se mueve
    Solicitado --> Cancelado: CANCELAR<br/>Sucursal A cancela<br/>Endpoint: CancelarPedidoStock_post<br/>🔹 Stock NO se mueve

    state "Estado: Aceptado" as Aceptado {
        state "Vista Sucursal A" as AcepA
        state "Vista Sucursal B" as AcepB

        AcepA: Componente: mis-transferencias<br/>Puede: Confirmar Recepción
        AcepB: Componente: No aplica<br/>Espera confirmación de A
    }

    Aceptado --> Recibido: CONFIRMAR RECEPCIÓN<br/>Sucursal A confirma<br/>Endpoint: ConfirmarRecepcion_post<br/>🔹 Stock NO se mueve

    Rechazado --> [*]: FIN
    Cancelado --> [*]: FIN
    Recibido --> [*]: FIN (Transferencia Completa)

    note right of Solicitado
        sucursald = A (quien solicita)
        sucursalh = B (quien debe proveer)
        tipo_transferencia = 'PULL'
    end note

    note right of Aceptado
        ⚠️ MOMENTO CRÍTICO
        Stock ya movido:
        - B perdió cantidad
        - A ganó cantidad
    end note
```

---

## 3. Flujo PUSH v2.2 (Oferta de Stock)

**Descripción**: Sucursal A ofrece stock a Sucursal B. Solo se mueve stock cuando B acepta.

```mermaid
stateDiagram-v2
    [*] --> Ofrecido: CREAR OFERTA<br/>Componente: ofrecer-stock<br/>Modal: stockproductooferta<br/>Endpoint: PedidoItemyCab_post<br/>🔹 Stock NO se mueve

    state "Estado: Ofrecido" as Ofrecido {
        state "Vista Sucursal A (Origen)" as OfreA1
        state "Vista Sucursal B (Destino)" as OfreB1

        OfreA1: Componente: mis-transferencias<br/>Puede: Ver, Cancelar
        OfreB1: Componente: transferencias-pendientes<br/>Puede: Ver, Aceptar, Rechazar
    }

    Ofrecido --> Aceptado: ACEPTAR<br/>Sucursal B acepta<br/>Endpoint: AceptarTransferencia_post<br/>✅ MUEVE STOCK<br/>(A -cantidad, B +cantidad)
    Ofrecido --> Rechazado: RECHAZAR<br/>Sucursal B rechaza<br/>Endpoint: RechazarTransferencia_post<br/>🔹 Stock NO se mueve
    Ofrecido --> Cancelado: CANCELAR<br/>Sucursal A cancela<br/>Endpoint: CancelarPedidoStock_post<br/>🔹 Stock NO se mueve

    state "Estado: Aceptado" as Aceptado {
        state "Vista Sucursal A" as AcepA
        state "Vista Sucursal B" as AcepB

        AcepA: Componente: mis-transferencias<br/>Puede: Confirmar Envío
        AcepB: Componente: No aplica<br/>Espera confirmación de A
    }

    Aceptado --> Recibido: CONFIRMAR ENVÍO<br/>Sucursal A confirma<br/>Endpoint: ConfirmarEnvio_post<br/>🔹 Stock NO se mueve

    Rechazado --> [*]: FIN
    Cancelado --> [*]: FIN
    Recibido --> [*]: FIN (Transferencia Completa)

    note right of Ofrecido
        sucursald = A (quien ofrece)
        sucursalh = B (quien debe aceptar)
        tipo_transferencia = 'PUSH'
    end note

    note right of Aceptado
        ⚠️ MOMENTO CRÍTICO
        Stock ya movido:
        - A perdió cantidad
        - B ganó cantidad
    end note
```

---

## 4. Flujo Legacy: Pedido de Stock

**Descripción**: Flujo antiguo donde se solicita, se envía y se recibe. ⚠️ Stock se mueve DOS VECES (bug).

```mermaid
stateDiagram-v2
    [*] --> Solicitado: SOLICITAR<br/>Sucursal A solicita a B<br/>Componente: pedir-stock<br/>Modal: stockproductopedido<br/>Endpoint: PedidoItemyCab_post<br/>🔹 Stock NO se mueve

    state "Estado: Solicitado" as Solicitado {
        state "Vista Suc. A" as SolA
        state "Vista Suc. B" as SolB

        SolA: Componente: stockpedido<br/>Puede: Ver, Cancelar<br/>NO puede Recibir aún
        SolB: Componente: enviostockpendientes<br/>Puede: Ver, Enviar, Cancelar
    }

    Solicitado --> SolicitadoE: ENVIAR<br/>Sucursal B envía<br/>Endpoint: PedidoItemyCabIdEnvio_post<br/>✅ MUEVE STOCK (1ra vez)<br/>(B -cantidad, A +cantidad)
    Solicitado --> Cancelado: CANCELAR<br/>A o B cancela<br/>Endpoint: CancelarPedidoStock_post<br/>🔹 Stock NO se mueve

    state "Estado: Solicitado-E" as SolicitadoE {
        state "Vista Suc. A" as SolEA
        state "Vista Suc. B" as SolEB

        SolEA: Componente: stockpedido<br/>Puede: Ver, Recibir, Cancelar
        SolEB: Componente: enviodestockrealizados<br/>Solo visualización
    }

    SolicitadoE --> Recibido: RECIBIR<br/>Sucursal A recibe<br/>Endpoint: PedidoItemyCabId_post<br/>⚠️ MUEVE STOCK (2da vez - BUG)<br/>(B -cantidad, A +cantidad)
    SolicitadoE --> Cancelado: CANCELAR<br/>Endpoint: CancelarPedidoStock_post<br/>⚠️ Stock ya movido, NO revierte

    Cancelado --> [*]: FIN
    Recibido --> [*]: FIN

    note right of Solicitado
        sucursald = A (quien solicita / DESTINO)
        sucursalh = B (quien envía / ORIGEN)
        tipo_transferencia = 'LEGACY' o NULL
    end note

    note right of SolicitadoE
        ⚠️ STOCK YA MOVIDO
        Si se cancela aquí,
        stock NO se revierte
    end note

    note right of Recibido
        🚨 BUG CRÍTICO
        Stock movido 2 veces:
        1. Al enviar (B→A)
        2. Al recibir (B→A)
        Resultado: B pierde 2x, A gana 2x
    end note
```

---

## 5. Flujo Legacy: Envío Directo

**Descripción**: Flujo antiguo de envío directo sin solicitud previa. Stock se mueve 1 vez (correcto).

```mermaid
stateDiagram-v2
    [*] --> Enviado: ENVIAR DIRECTO<br/>Sucursal A envía a B<br/>Componente: stockenvio<br/>Modal: stockproductoenvio<br/>Endpoint: PedidoItemyCabIdEnvio_post<br/>✅ MUEVE STOCK<br/>(A -cantidad, B +cantidad)

    state "Estado: Enviado" as Enviado {
        state "Vista Suc. A (Origen)" as EnvA
        state "Vista Suc. B (Destino)" as EnvB

        EnvA: Componente: enviodestockrealizados<br/>Solo visualización
        EnvB: Componente: stockrecibo<br/>Solo visualización<br/>NO tiene botón "Recibir"
    }

    Enviado --> [*]: FIN (No hay recepción)

    note right of Enviado
        sucursald = A (quien envía / ORIGEN)
        sucursalh = B (quien recibe / DESTINO)
        tipo_transferencia = NULL

        ✅ Flujo correcto:
        Stock se mueve 1 sola vez
        No hay duplicación
    end note
```

---

## 6. Diagrama de Estados Completo

**Todos los estados posibles en el sistema**:

```mermaid
stateDiagram-v2
    [*] --> Inicial: Sistema inicia

    state "Estados Creación" as Creacion {
        Solicitado: Sistema v2.2 PULL<br/>Sistema Legacy Pedido
        Ofrecido: Sistema v2.2 PUSH
        Enviado: Sistema Legacy Envío Directo
    }

    state "Estados Intermedios" as Intermedios {
        SolicitadoE: Sistema Legacy Pedido<br/>(Solicitado-Enviado)
        Aceptado: Sistema v2.2 PULL/PUSH<br/>(Stock ya movido)
    }

    state "Estados Finales" as Finales {
        Recibido: Transferencia completa
        Rechazado: Transferencia rechazada
        Cancelado: Transferencia cancelada
    }

    state "Estados Legacy ALTA" as Alta {
        ALTA: Pedidos del sistema ALTA<br/>(97% de registros)
        CancelAlta: Cancelaciones ALTA
    }

    Inicial --> Creacion

    Creacion --> Solicitado
    Creacion --> Ofrecido
    Creacion --> Enviado

    Solicitado --> Intermedios: Legacy: Enviar
    Solicitado --> Aceptado: v2.2: Aceptar
    Solicitado --> Rechazado: Rechazar
    Solicitado --> Cancelado: Cancelar

    Ofrecido --> Aceptado: v2.2: Aceptar
    Ofrecido --> Rechazado: Rechazar
    Ofrecido --> Cancelado: Cancelar

    Enviado --> Recibido: Legacy: Solo visualización

    SolicitadoE --> Recibido: Legacy: Recibir
    SolicitadoE --> Cancelado: Legacy: Cancelar

    Aceptado --> Recibido: v2.2: Confirmar

    Intermedios --> Finales

    Finales --> [*]
    Alta --> [*]

    note right of Solicitado
        🔹 Stock NO movido
    end note

    note right of Ofrecido
        🔹 Stock NO movido
    end note

    note right of Enviado
        ✅ Stock movido 1 vez
    end note

    note right of SolicitadoE
        ✅ Stock movido 1 vez
        ⚠️ Al recibir se duplica
    end note

    note right of Aceptado
        ✅ Stock movido 1 vez
        🔹 Confirmación NO mueve
    end note
```

---

## 7. Mapeo de Sucursales y Stock

**Relación entre IDs de sucursales y campos de stock en la tabla `artsucursal`**:

```mermaid
graph LR
    subgraph "Sucursales (Firebase/Sistema)"
        S1[ID: 1<br/>Casa Central]
        S2[ID: 2<br/>Valle Viejo]
        S3[ID: 3<br/>Guemes]
        S4[ID: 4<br/>Deposito]
        S5[ID: 5<br/>Mayorista]
    end

    subgraph "Campos Stock (PostgreSQL artsucursal)"
        E1[exi1]
        E2[exi2]
        E3[exi3]
        E4[exi4]
        E5[exi5]
    end

    S1 -->|Mapeo| E2
    S2 -->|Mapeo| E3
    S3 -->|Mapeo| E4
    S4 -->|Mapeo| E1
    S5 -->|Mapeo| E5

    style S1 fill:#4CAF50
    style S2 fill:#2196F3
    style S3 fill:#FF9800
    style S4 fill:#9C27B0
    style S5 fill:#F44336

    style E1 fill:#9C27B0
    style E2 fill:#4CAF50
    style E3 fill:#2196F3
    style E4 fill:#FF9800
    style E5 fill:#F44336
```

**Tabla de Mapeo**:

| ID Sucursal | Nombre Sucursal | Campo Stock en BD | Nota |
|-------------|-----------------|-------------------|------|
| 1 | Casa Central | exi2 | ⚠️ No es exi1 |
| 2 | Valle Viejo | exi3 | ⚠️ No es exi2 |
| 3 | Guemes | exi4 | ⚠️ No es exi3 |
| 4 | Deposito | exi1 | ⚠️ No es exi4 |
| 5 | Mayorista | exi5 | ✅ Coincide |

---

## 8. Diagrama de Componentes y Endpoints

**Relación entre componentes Angular y endpoints PHP**:

```mermaid
graph TB
    subgraph "FRONTEND - Componentes Angular"
        direction TB

        subgraph "Sistema v2.2"
            PC1[pedir-stock<br/>stockproductopedido]
            PC2[ofrecer-stock<br/>stockproductooferta]
            PC3[transferencias-pendientes]
            PC4[mis-transferencias]
        end

        subgraph "Sistema Legacy"
            PL1[pedir-stock<br/>stockproductopedido]
            PL2[stockpedido]
            PL3[enviostockpendientes]
            PL4[enviodestockrealizados]
            PL5[stockenvio<br/>stockproductoenvio]
            PL6[stockrecibo]
        end
    end

    subgraph "BACKEND - Endpoints PHP (Descarga.php)"
        direction TB

        subgraph "Endpoints v2.2"
            E1[AceptarTransferencia_post<br/>Líneas 6966-7185]
            E2[RechazarTransferencia_post<br/>Líneas 7199-7325]
            E3[ConfirmarRecepcion_post<br/>Líneas 7338-7457]
            E4[ConfirmarEnvio_post<br/>Líneas 7470-7589]
        end

        subgraph "Endpoints Compartidos"
            ES1[PedidoItemyCab_post<br/>Líneas 1568-1712<br/>Crear solicitud/oferta]
            ES2[CancelarPedidoStock_post<br/>Líneas 2252-2273<br/>Cancelar]
        end

        subgraph "Endpoints Legacy"
            EL1[PedidoItemyCabIdEnvio_post<br/>Líneas 1928-2206<br/>Enviar]
            EL2[PedidoItemyCabId_post<br/>Líneas 1709-1927<br/>Recibir]
        end
    end

    subgraph "BACKEND - Endpoints PHP (Carga.php)"
        direction TB

        CG1[PedidoItemsPorSucursal_post<br/>Líneas 920-1054<br/>Obtener por sucursald]
        CG2[PedidoItemsPorSucursalh_post<br/>Líneas 1058-1207<br/>Obtener por sucursalh]
    end

    PC1 -->|POST crear PULL| ES1
    PC2 -->|POST crear PUSH| ES1
    PC3 -->|POST aceptar| E1
    PC3 -->|POST rechazar| E2
    PC4 -->|POST cancelar| ES2
    PC4 -->|POST confirmar recepción| E3
    PC4 -->|POST confirmar envío| E4
    PC4 -->|GET mis transferencias| CG1
    PC3 -->|GET transferencias pendientes| CG2

    PL1 -->|POST crear solicitud| ES1
    PL2 -->|GET solicitudes| CG1
    PL2 -->|POST recibir| EL2
    PL2 -->|POST cancelar| ES2
    PL3 -->|GET pendientes| CG2
    PL3 -->|POST enviar| EL1
    PL3 -->|POST cancelar| ES2
    PL4 -->|GET enviados| CG1
    PL5 -->|POST enviar directo| EL1
    PL6 -->|GET recibidos| CG2

    style PC1 fill:#4CAF50
    style PC2 fill:#2196F3
    style PC3 fill:#4CAF50
    style PC4 fill:#2196F3

    style E1 fill:#4CAF50
    style E2 fill:#F44336
    style E3 fill:#4CAF50
    style E4 fill:#2196F3

    style EL1 fill:#FF9800
    style EL2 fill:#9C27B0
```

---

## 9. Diagrama de Decisión: ¿Qué Flujo Usar?

```mermaid
graph TD
    Start([Necesito mover stock])

    Q1{¿Qué versión<br/>del sistema?}
    Q2{¿Quién inicia<br/>la transferencia?}
    Q3{¿Hay solicitud<br/>previa?}

    Start --> Q1

    Q1 -->|v2.2 Nuevo| Q2
    Q1 -->|Legacy Antiguo| Q3

    Q2 -->|Quien NECESITA<br/>el stock| UsePULL[✅ Usar PULL<br/>Componente: pedir-stock<br/>Modal: stockproductopedido<br/>tipo_transferencia: 'PULL']
    Q2 -->|Quien TIENE<br/>el stock| UsePUSH[✅ Usar PUSH<br/>Componente: ofrecer-stock<br/>Modal: stockproductooferta<br/>tipo_transferencia: 'PUSH']

    Q3 -->|SÍ, hay solicitud| UseLegacyPedido[✅ Usar Legacy Pedido<br/>1. pedir-stock<br/>2. enviostockpendientes<br/>3. stockpedido<br/>⚠️ Bug: stock 2x]
    Q3 -->|NO, envío directo| UseLegacyDirecto[✅ Usar Legacy Directo<br/>Componente: stockenvio<br/>Modal: stockproductoenvio<br/>✅ Correcto: stock 1x]

    UsePULL --> EndPULL([Stock se mueve<br/>al ACEPTAR])
    UsePUSH --> EndPUSH([Stock se mueve<br/>al ACEPTAR])
    UseLegacyPedido --> EndLegacyPedido([Stock se mueve<br/>al ENVIAR + RECIBIR])
    UseLegacyDirecto --> EndLegacyDirecto([Stock se mueve<br/>al ENVIAR])

    style UsePULL fill:#4CAF50
    style UsePUSH fill:#2196F3
    style UseLegacyPedido fill:#FF9800
    style UseLegacyDirecto fill:#9C27B0
```

---

## 10. Resumen de Momentos de Modificación de Stock

```mermaid
graph TB
    subgraph "Sistema v2.2 - CORRECTO"
        P1[PULL: Solicitado]
        P2[PULL: Aceptado]
        P3[PULL: Recibido]

        P1 -->|🔹 NO mueve stock| P2
        P2 -->|✅ MUEVE STOCK| P3
        P3 -->|🔹 NO mueve stock| P3End([FIN])

        U1[PUSH: Ofrecido]
        U2[PUSH: Aceptado]
        U3[PUSH: Recibido]

        U1 -->|🔹 NO mueve stock| U2
        U2 -->|✅ MUEVE STOCK| U3
        U3 -->|🔹 NO mueve stock| U3End([FIN])
    end

    subgraph "Sistema Legacy"
        L1[Pedido: Solicitado]
        L2[Pedido: Solicitado-E]
        L3[Pedido: Recibido]

        L1 -->|🔹 NO mueve stock| L2
        L2 -->|✅ MUEVE STOCK 1ra vez| L3
        L3 -->|⚠️ MUEVE STOCK 2da vez BUG| L3End([FIN])

        D1[Directo: Enviado]

        D1 -->|✅ MUEVE STOCK 1 vez| D1End([FIN])
    end

    style P2 fill:#4CAF50
    style U2 fill:#2196F3
    style L2 fill:#FF9800
    style L3 fill:#F44336
    style D1 fill:#9C27B0
```

---

## 📝 Notas Importantes

### Diferencias Clave entre Sistemas

| Aspecto | Sistema v2.2 | Sistema Legacy |
|---------|-------------|----------------|
| **Momento de stock** | Al ACEPTAR (1 vez) ✅ | Al ENVIAR y RECIBIR (2 veces) ❌ |
| **Estados** | Solicitado/Ofrecido → Aceptado → Recibido | Solicitado → Solicitado-E → Recibido |
| **Cancelación** | Antes de aceptar ✅ | Antes de enviar, o después (sin revertir stock) ⚠️ |
| **Rechazo** | Con motivo obligatorio ✅ | No existe |
| **Confirmación** | Opcional (solo cambia estado) | Duplica stock ❌ |
| **Tipo transferencia** | 'PULL' o 'PUSH' | 'LEGACY' o NULL |

### Problemas Identificados

1. **🚨 CRÍTICO - Legacy Pedido**: Stock se duplica (envío + recepción)
2. **⚠️ MEDIO - Legacy Cancelación**: No revierte stock si ya fue enviado
3. **⚠️ BAJO - Semántica Invertida**: `sucursald`/`sucursalh` significan cosas opuestas entre flujos

### Recomendaciones

1. **Migrar a v2.2**: Usar sistema PULL/PUSH para nuevas transferencias
2. **Mantener Legacy**: Solo para compatibilidad con transferencias antiguas
3. **NO usar Legacy Pedido**: Tiene bug de duplicación de stock
4. **Documentar**: Indicar claramente cuándo usar cada flujo

---

**Fecha de Creación**: 16 de Noviembre de 2025
**Sistema**: MotoApp v2.2 + Legacy
**Estado**: ✅ Diagramas Completos
**Analista**: Claude Code
